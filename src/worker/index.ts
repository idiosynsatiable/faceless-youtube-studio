// Worker entry point: Redis job -> hydrate -> FFmpeg render -> optional YouTube upload.

import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
import { uploadVideoToYouTube } from './youtube-uploader';
import { createRedisQueueAdapter, unsupportedRedisAdapter, type QueueAdapter } from './queue';
import type { JobOutcome, WorkerConfig } from './types';

function readEnv(name: string, fallback?: string): string {
  const value = process.env[name];
  if (typeof value === 'string' && value.length > 0) return value;
  if (fallback !== undefined) return fallback;
  throw new Error(`missing required env var: ${name}`);
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
  const upload = await uploadVideoToYouTube({
    filePath: master.absolutePath,
    refreshToken,
    title: metadataJson?.title ?? project?.title ?? 'untitled',
    description: metadataJson?.description ?? '',
    tags: metadataJson?.tags ?? [],
    categoryId: (metadataJson?.categoryRecommendation ?? '27').split(' ')[0],
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

  try {
    await prisma.uploadJob.upsert({
      where: { id: uploadRequest.id },
      update: {
        youtubeVideoId: upload.videoId,
        privacyStatus: uploadRequest.privacyStatus,
        scheduledAt: uploadRequest.scheduledAt ? new Date(uploadRequest.scheduledAt) : null,
        status: upload.status === 'scheduled' ? 'scheduled' : 'private_uploaded',
        errorMessage: null
      },
      create: {
        id: uploadRequest.id,
        userId: project?.userId ?? '',
        videoProjectId: uploadRequest.videoProjectId,
        youtubeVideoId: upload.videoId,
        privacyStatus: uploadRequest.privacyStatus,
        scheduledAt: uploadRequest.scheduledAt ? new Date(uploadRequest.scheduledAt) : null,
        status: upload.status === 'scheduled' ? 'scheduled' : 'private_uploaded'
      }
    });
  } catch (err) {
    log(`uploadJob persist failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  return {
    ...assemblyOutcome,
    log: [...assemblyOutcome.log, `youtube ${upload.status}: ${upload.videoId}`]
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
        await adapter.nack(outcome, false);
        log(`request ${request.id} rejected: ${outcome.errorMessage ?? 'invalid render request'}`);
      } else {
        await adapter.nack(outcome, true);
        log(`request ${request.id} failed: ${outcome.errorMessage ?? 'render failed'}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await adapter.nack({
        jobId: request.id,
        status: 'failed',
        outputs: [],
        log: [`worker exception: ${message}`],
        errorMessage: message,
        errorCategory: 'unknown'
      }, true);
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
