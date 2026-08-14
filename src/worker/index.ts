// Worker entry point: Redis job -> hydrate -> FFmpeg render -> optional YouTube upload.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config as runtimeConfig } from '@/lib/config';
import { getPrisma } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto-vault';
import {
  isRenderJobRequest,
  type PipelineJobRequest,
  type UploadJobRequest
} from '@/lib/queue-producer';
import { runAssemblyJob } from './job-runner';
import { hydrateUploadRequest } from './job-hydrator';
import { hydrateRenderRequest } from './render-hydrator';
import { planAutonomousShortUploads } from './shorts-publisher';
import { uploadVideoToYouTube } from './youtube-uploader';
import { createRedisQueueAdapter, unsupportedRedisAdapter, type QueueAdapter } from './queue';
import type { JobOutcome, WorkerConfig } from './types';

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`missing required env var: ${name}`);
}

function jsonValue(value: unknown): any {
  return JSON.parse(JSON.stringify(value));
}

function uploadedStatus(privacyStatus: string): string {
  return `${privacyStatus}_uploaded`;
}

export function loadWorkerConfig(): WorkerConfig {
  const outputsRoot = path.resolve(readEnv('WORKER_OUTPUT_ROOT', '/var/lib/faceless-studio/exports'));
  const inputsAllowlist = readEnv('WORKER_INPUT_ALLOWLIST', '/var/lib/faceless-studio/inputs')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
    .map((value) => path.resolve(value));
  return {
    inputsAllowlist,
    outputsRoot,
    ffmpegBinary: readEnv('FFMPEG_BINARY', '/usr/bin/ffmpeg'),
    ffprobeBinary: process.env.FFPROBE_BINARY,
    jobTimeoutMs: Number.parseInt(readEnv('WORKER_JOB_TIMEOUT_MS', '900000'), 10),
    concurrency: Number.parseInt(readEnv('WORKER_CONCURRENCY', '1'), 10)
  };
}

export interface WorkerLoopOptions {
  config?: WorkerConfig;
  adapter?: QueueAdapter;
  shutdownSignal?: { aborted: boolean };
  log?: (message: string) => void;
}

async function renderRequest(
  request: PipelineJobRequest,
  config: WorkerConfig,
  log: (message: string) => void
): Promise<JobOutcome> {
  if (isRenderJobRequest(request)) {
    const hydration = await hydrateRenderRequest(request, { config });
    if (!hydration.ok) {
      return {
        jobId: request.id,
        status: 'rejected',
        outputs: [],
        log: [`render hydration failed: ${hydration.reason}`, hydration.detail],
        errorMessage: hydration.detail,
        errorCategory: 'invalid_input_path'
      };
    }
    log(`render-only job hydrated with ${hydration.job.inputs.length} asset(s)`);
    return runAssemblyJob(hydration.job, { config });
  }

  const prisma = getPrisma();
  if (!prisma) {
    return {
      jobId: request.id,
      status: 'failed',
      outputs: [],
      log: ['prisma client unavailable'],
      errorMessage: 'database unavailable in worker',
      errorCategory: 'unknown'
    };
  }

  const uploadRequest = request as UploadJobRequest;
  const hydration = await hydrateUploadRequest(uploadRequest, { prisma, config });
  if (!hydration.ok) {
    return {
      jobId: uploadRequest.id,
      status: 'rejected',
      outputs: [],
      log: [`hydration failed: ${hydration.reason}`],
      errorMessage: `hydration failed: ${hydration.reason}`,
      errorCategory: 'invalid_input_path'
    };
  }

  const assemblyOutcome = await runAssemblyJob(hydration.job, { config });
  if (assemblyOutcome.status !== 'completed') return assemblyOutcome;

  const master = assemblyOutcome.outputs.find((output) => output.profile === 'YouTube long-form 16:9');
  if (!master) return assemblyOutcome;

  const project = await prisma.videoProject.findUnique({ where: { id: uploadRequest.videoProjectId } });
  const channel = project?.channelId
    ? await prisma.channel.findUnique({ where: { id: project.channelId } })
    : null;
  if (!channel || !channel.oauthConnected || !channel.oauthRefreshTokenCipher) {
    return {
      ...assemblyOutcome,
      log: [...assemblyOutcome.log, 'youtube upload skipped: channel not connected']
    };
  }

  let refreshToken: string;
  try {
    refreshToken = decryptSecret({
      cipher: channel.oauthRefreshTokenCipher,
      iv: channel.oauthRefreshTokenIv ?? '',
      authTag: channel.oauthRefreshTokenAuthTag ?? ''
    });
  } catch (err) {
    return {
      ...assemblyOutcome,
      status: 'failed',
      errorMessage: 'refresh token decryption failed; re-OAuth the channel',
      errorCategory: 'unknown',
      log: [...assemblyOutcome.log, err instanceof Error ? err.message : 'decrypt error']
    };
  }

  const metadataJson = project?.metadataJson as
    | { title?: string; description?: string; tags?: string[]; categoryRecommendation?: string }
    | null;
  const title = metadataJson?.title ?? project?.title ?? 'untitled';
  const description = metadataJson?.description ?? '';
  const tags = metadataJson?.tags ?? [];
  const categoryId = (metadataJson?.categoryRecommendation ?? '27').split(' ')[0];

  const existingUpload = await prisma.uploadJob.findUnique({ where: { id: uploadRequest.id } });
  let mainVideoId = existingUpload?.youtubeVideoId ?? null;
  const uploadLog: string[] = [];

  if (!mainVideoId) {
    const upload = await uploadVideoToYouTube({
      filePath: master.absolutePath,
      refreshToken,
      title,
      description,
      tags,
      categoryId,
      privacyStatus: uploadRequest.privacyStatus,
      scheduledAt: uploadRequest.scheduledAt
    });

    if (!upload.ok) {
      return {
        ...assemblyOutcome,
        status: 'failed',
        errorMessage: `youtube upload failed: ${upload.reason}`,
        errorCategory: 'unknown',
        log: [...assemblyOutcome.log, `youtube upload: ${upload.reason} ${upload.detail}`]
      };
    }
    mainVideoId = upload.videoId;
    uploadLog.push(`youtube ${upload.status}: ${upload.videoId}`);

    try {
      await prisma.uploadJob.upsert({
        where: { id: uploadRequest.id },
        update: {
          youtubeVideoId: upload.videoId,
          privacyStatus: uploadRequest.privacyStatus,
          scheduledAt: uploadRequest.scheduledAt ? new Date(uploadRequest.scheduledAt) : null,
          status: upload.status === 'scheduled' ? 'scheduled' : uploadedStatus(uploadRequest.privacyStatus),
          errorMessage: null
        },
        create: {
          id: uploadRequest.id,
          userId: project?.userId ?? '',
          videoProjectId: uploadRequest.videoProjectId,
          youtubeVideoId: upload.videoId,
          privacyStatus: uploadRequest.privacyStatus,
          scheduledAt: uploadRequest.scheduledAt ? new Date(uploadRequest.scheduledAt) : null,
          status: upload.status === 'scheduled' ? 'scheduled' : uploadedStatus(uploadRequest.privacyStatus)
        }
      });
    } catch (err) {
      log(`uploadJob persist failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  } else {
    uploadLog.push(`youtube upload already persisted: ${mainVideoId}; skipping duplicate master upload`);
  }

  if (
    uploadRequest.authorization === 'owner_autopilot' &&
    runtimeConfig.autonomy.uploadShorts &&
    project?.userId &&
    project.channelId
  ) {
    const shortPlans = planAutonomousShortUploads({
      outputs: assemblyOutcome.outputs,
      baseTitle: title,
      baseDescription: description,
      tags,
      parentPrivacyStatus: uploadRequest.privacyStatus,
      parentScheduledAt: uploadRequest.scheduledAt,
      maxShorts: runtimeConfig.autonomy.shortsPerVideo,
      spacingHours: runtimeConfig.autonomy.shortsSpacingHours
    });

    const existingShorts = await prisma.shortsProject.findMany({
      where: { videoProjectId: project.id },
      select: { metadataJson: true }
    });
    const persistedIndexes = new Set(
      existingShorts.flatMap((row) => {
        const metadata = row.metadataJson as { shortIndex?: unknown } | null;
        return typeof metadata?.shortIndex === 'number' ? [metadata.shortIndex] : [];
      })
    );

    for (const short of shortPlans) {
      if (persistedIndexes.has(short.index)) {
        uploadLog.push(`short ${short.index + 1} already persisted; skipping duplicate upload`);
        continue;
      }
      const shortUpload = await uploadVideoToYouTube({
        filePath: short.filePath,
        refreshToken,
        title: short.title,
        description: short.description,
        tags: short.tags,
        categoryId,
        privacyStatus: short.privacyStatus,
        scheduledAt: short.scheduledAt
      });

      if (!shortUpload.ok) {
        uploadLog.push(`short ${short.index + 1} upload failed without retrying master: ${shortUpload.reason} ${shortUpload.detail}`);
        try {
          await prisma.shortsProject.create({
            data: {
              userId: project.userId,
              channelId: project.channelId,
              videoProjectId: project.id,
              title: short.title,
              hook: 'Autonomous short-form derivative of verified long-form package',
              scriptJson: jsonValue({ parentVideoProjectId: project.id }),
              visualPlanJson: jsonValue({ outputPath: short.filePath, profile: 'YouTube Shorts 9:16', shortIndex: short.index }),
              metadataJson: jsonValue({ shortIndex: short.index, uploadError: shortUpload.reason, detail: shortUpload.detail }),
              retentionScore: 0,
              uploadPriorityScore: 0,
              status: 'upload_failed'
            }
          });
        } catch (err) {
          log(`failed Short persistence also failed: ${err instanceof Error ? err.message : String(err)}`);
        }
        continue;
      }

      const shortStatus = shortUpload.status === 'scheduled' ? 'scheduled' : uploadedStatus(short.privacyStatus);
      try {
        const shortsProject = await prisma.shortsProject.create({
          data: {
            userId: project.userId,
            channelId: project.channelId,
            videoProjectId: project.id,
            title: short.title,
            hook: 'Autonomous short-form derivative of verified long-form package',
            scriptJson: jsonValue({ parentVideoProjectId: project.id }),
            visualPlanJson: jsonValue({ outputPath: short.filePath, profile: 'YouTube Shorts 9:16', shortIndex: short.index }),
            metadataJson: jsonValue({
              shortIndex: short.index,
              youtubeVideoId: shortUpload.videoId,
              watchUrl: `https://www.youtube.com/watch?v=${shortUpload.videoId}`,
              parentYouTubeVideoId: mainVideoId,
              privacyStatus: short.privacyStatus,
              scheduledAt: short.scheduledAt ?? null
            }),
            retentionScore: 0,
            uploadPriorityScore: 0,
            status: shortStatus
          }
        });
        if (short.scheduledAt) {
          await prisma.shortsCalendarItem.create({
            data: {
              userId: project.userId,
              channelId: project.channelId,
              shortsProjectId: shortsProject.id,
              scheduledFor: new Date(short.scheduledAt),
              status: 'scheduled',
              topicCluster: project.title
            }
          });
        }
        uploadLog.push(`short ${short.index + 1} ${shortUpload.status}: ${shortUpload.videoId}`);
      } catch (err) {
        uploadLog.push(`short ${short.index + 1} uploaded but persistence failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return {
    ...assemblyOutcome,
    log: [...assemblyOutcome.log, ...uploadLog]
  };
}

export async function runWorkerLoop(options: WorkerLoopOptions = {}): Promise<void> {
  const config = options.config ?? loadWorkerConfig();
  const adapter = options.adapter ?? (
    process.env.REDIS_URL ? createRedisQueueAdapter(process.env.REDIS_URL) : unsupportedRedisAdapter()
  );
  const log = options.log ?? ((message: string) => process.stdout.write(`${new Date().toISOString()} ${message}\n`));
  const signal = options.shutdownSignal ?? { aborted: false };

  log(`worker starting concurrency=${config.concurrency} outputs=${config.outputsRoot}`);
  while (!signal.aborted) {
    const request = await adapter.pop(5000);
    if (!request) continue;
    log(`picked ${request.kind ?? 'upload'} request ${request.id}`);
    try {
      const outcome = await renderRequest(request, config, log);
      if (outcome.status === 'completed') {
        await adapter.ack(outcome);
        log(`request ${request.id} completed with ${outcome.outputs.length} output(s)`);
      } else if (outcome.status === 'rejected') {
        await adapter.nack(request.id, outcome.errorMessage ?? 'rejected', false);
      } else {
        await adapter.nack(request.id, outcome.errorMessage ?? 'failed', true);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await adapter.nack(request.id, message, true);
      log(`request ${request.id} threw: ${message}`);
    }
  }
  await adapter.close();
  log('worker stopped');
}

function installShutdownHandlers(signal: { aborted: boolean }, log: (message: string) => void): void {
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      log(`received ${sig}, draining`);
      signal.aborted = true;
    });
  }
}

const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : '';
const thisModule = path.resolve(fileURLToPath(import.meta.url));
if (invokedAs && invokedAs === thisModule) {
  const signal = { aborted: false };
  const log = (message: string) => process.stdout.write(`${new Date().toISOString()} ${message}\n`);
  installShutdownHandlers(signal, log);
  runWorkerLoop({ shutdownSignal: signal, log }).catch((err) => {
    process.stderr.write(`worker crashed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
}
