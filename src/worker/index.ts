// Worker entry point. Run via `npm run worker`. Reads config from env, opens
// the queue adapter, processes jobs sequentially up to `concurrency`, and
// shuts down gracefully on SIGTERM / SIGINT.
//
// The queue adapter is wired in by the operator. By default we throw a clear
// error pointing at docs/FFMPEG_WORKER.md so the failure mode is loud.

import path from 'node:path';
import { runAssemblyJob } from './job-runner';
import { unsupportedRedisAdapter, type QueueAdapter } from './queue';
import type { WorkerConfig } from './types';

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

export async function runWorkerLoop(options: WorkerLoopOptions = {}): Promise<void> {
  const config = options.config ?? loadWorkerConfig();
  const adapter = options.adapter ?? unsupportedRedisAdapter();
  const log = options.log ?? ((m: string) => process.stdout.write(`${new Date().toISOString()} ${m}\n`));
  const signal = options.shutdownSignal ?? { aborted: false };
  log(`worker starting concurrency=${config.concurrency} outputs=${config.outputsRoot}`);
  while (!signal.aborted) {
    const job = await adapter.pop(5000);
    if (!job) continue;
    log(`picked job ${job.id} (project ${job.scope.projectId})`);
    try {
      const outcome = await runAssemblyJob(job, { config });
      if (outcome.status === 'completed') {
        await adapter.ack(outcome);
        log(`job ${job.id} completed with ${outcome.outputs.length} output(s)`);
      } else if (outcome.status === 'rejected') {
        await adapter.nack(job.id, outcome.errorMessage ?? 'rejected', false);
        log(`job ${job.id} rejected: ${outcome.errorMessage}`);
      } else {
        await adapter.nack(job.id, outcome.errorMessage ?? 'failed', true);
        log(`job ${job.id} failed: ${outcome.errorMessage}`);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await adapter.nack(job.id, message, true);
      log(`job ${job.id} threw: ${message}`);
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
