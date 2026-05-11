// Worker entry point. Run via `npm run worker`. Reads config from env, opens
// the queue adapter, processes UploadJobRequest records sequentially:
//
//   pop request → hydrate → run FFmpeg assembly → upload to YouTube → ack
//
// Shuts down gracefully on SIGTERM / SIGINT. The queue adapter is wired in
// by the operator (Redis is the recommended backend; see docs/FFMPEG_WORKER.md).

import path from 'node:path';
import { getPrisma } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto-vault';
import type { UploadJobRequest } from '@/lib/queue-producer';
import { runAssemblyJob } from './job-runner';
import { hydrateUploadRequest } from './job-hydrator';
import { uploadVideoToYouTube } from './youtube-uploader';
import { unsupportedRedisAdapter, type QueueAdapter } from './queue';
import type { JobOutcome, WorkerConfig } from './types';

function readEnv(name: string, fallback?: string): string {
  const v = process.env[name];
  if (typeof v === 'string' && v.length > 0) return v;
  if (fallback !== undefined) return fallback;
  throw new Error(`missing required env var: ${name}`);
}

export function loadWorkerConfig(): WorkerConfig {
  const outputsRoot = path.resolve(readEnv('WORKER_OUTPUT_ROOT', '/var/lib/faceless-studio/exports'));
  const inputsAllowlistRaw = readEnv('WORKER_INPUT_ALLOWLIST', '/var/lib/faceless-studio/inputs');
  const inputsAllowlist = inputsAllowlistRaw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((p) => path.resolve(p));
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

async function processOne(
  request: UploadJobRequest,
  config: WorkerConfig,
  log: (m: string) => void
): Promise<JobOutcome> {
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

  // Step 1: hydrate the request into a full AssemblyJob.
  const hydration = await hydrateUploadRequest(request, { prisma, config });
  if (!hydration.ok) {
    log(`hydration failed: ${hydration.reason}`);
    return {
      jobId: request.id,
      status: 'rejected',
      outputs: [],
      log: [`hydration failed: ${hydration.reason}`],
      errorMessage: `hydration failed: ${hydration.reason}`,
      errorCategory: 'invalid_input_path'
    };
  }

  // Step 2: run FFmpeg assembly.
  const assemblyOutcome = await runAssemblyJob(hydration.job, { config });
  if (assemblyOutcome.status !== 'completed') {
    return assemblyOutcome;
  }

  // Step 3: pick the master export and upload it to YouTube.
  const master = assemblyOutcome.outputs.find((o) => o.profile === 'YouTube long-form 16:9');
  if (!master) {
    log(`no master export produced; outputs=${assemblyOutcome.outputs.map((o) => o.profile).join(',')}`);
    return assemblyOutcome;
  }

  const project = await prisma.videoProject.findUnique({ where: { id: request.videoProjectId } });
  const channel = project?.channelId
    ? await prisma.channel.findUnique({ where: { id: project.channelId } })
    : null;
  if (!channel || !channel.oauthConnected || !channel.oauthRefreshTokenCipher) {
    log('channel missing or not OAuth-connected; skipping YouTube upload');
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
    privacyStatus: request.privacyStatus,
    scheduledAt: request.scheduledAt
  });

  if (!upload.ok) {
    log(`youtube upload failed: ${upload.reason} ${upload.detail}`);
    return {
      ...assemblyOutcome,
      status: 'failed',
      errorMessage: `youtube upload failed: ${upload.reason}`,
      errorCategory: 'unknown',
      log: [...assemblyOutcome.log, `youtube upload: ${upload.reason} ${upload.detail}`]
    };
  }

  // Step 4: persist the YouTube video ID and the new upload status.
  try {
    await prisma.uploadJob.upsert({
      where: { id: request.id },
      update: {
        youtubeVideoId: upload.videoId,
        privacyStatus: request.privacyStatus,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
        status: upload.status === 'scheduled' ? 'scheduled' : 'private_uploaded',
        errorMessage: null
      },
      create: {
        id: request.id,
        userId: project?.userId ?? '',
        videoProjectId: request.videoProjectId,
        youtubeVideoId: upload.videoId,
        privacyStatus: request.privacyStatus,
        scheduledAt: request.scheduledAt ? new Date(request.scheduledAt) : null,
        status: upload.status === 'scheduled' ? 'scheduled' : 'private_uploaded'
      }
    });
  } catch (err) {
    log(`uploadJob persist failed: ${err instanceof Error ? err.message : 'unknown'}`);
  }

  log(`youtube upload ok: ${upload.videoId} (${upload.status})`);
  return {
    ...assemblyOutcome,
    log: [...assemblyOutcome.log, `youtube ${upload.status}: ${upload.videoId}`]
  };
}

export async function runWorkerLoop(options: WorkerLoopOptions = {}): Promise<void> {
  const config = options.config ?? loadWorkerConfig();
  const adapter = options.adapter ?? unsupportedRedisAdapter();
  const log = options.log ?? ((m: string) => process.stdout.write(`${new Date().toISOString()} ${m}\n`));
  const signal = options.shutdownSignal ?? { aborted: false };
  log(`worker starting concurrency=${config.concurrency} outputs=${config.outputsRoot}`);
  while (!signal.aborted) {
    const request = await adapter.pop(5000);
    if (!request) continue;
    log(`picked request ${request.id} (project ${request.videoProjectId})`);
    try {
      const outcome = await processOne(request, config, log);
      if (outcome.status === 'completed') {
        await adapter.ack(outcome);
        log(`request ${request.id} completed with ${outcome.outputs.length} output(s)`);
      } else if (outcome.status === 'rejected') {
        await adapter.nack(request.id, outcome.errorMessage ?? 'rejected', false);
        log(`request ${request.id} rejected: ${outcome.errorMessage}`);
      } else {
        await adapter.nack(request.id, outcome.errorMessage ?? 'failed', true);
        log(`request ${request.id} failed: ${outcome.errorMessage}`);
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

function installShutdownHandlers(signal: { aborted: boolean }, log: (m: string) => void): void {
  for (const sig of ['SIGTERM', 'SIGINT']) {
    process.on(sig, () => {
      log(`received ${sig}, draining`);
      signal.aborted = true;
    });
  }
}

if (require.main === module) {
  const signal = { aborted: false };
  const log = (m: string) => process.stdout.write(`${new Date().toISOString()} ${m}\n`);
  installShutdownHandlers(signal, log);
  runWorkerLoop({ shutdownSignal: signal, log }).catch((err) => {
    process.stderr.write(`worker crashed: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
}
