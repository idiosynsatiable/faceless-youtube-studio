// Queue adapters used by the FFmpeg worker.

import { createClient } from 'redis';
import type { PipelineJobRequest } from '@/lib/queue-producer';
import type { JobOutcome } from './types';

export interface QueueAdapter {
  pop(timeoutMs?: number): Promise<PipelineJobRequest | null>;
  ack(outcome: JobOutcome): Promise<void>;
  nack(jobId: string, errorMessage: string, retryable: boolean): Promise<void>;
  close(): Promise<void>;
}

export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly pending: PipelineJobRequest[] = [];
  readonly outcomes: JobOutcome[] = [];
  readonly failures: { jobId: string; errorMessage: string; retryable: boolean }[] = [];
  private closed = false;

  enqueue(request: PipelineJobRequest): void {
    if (this.closed) throw new Error('queue closed');
    this.pending.push(request);
  }

  async pop(): Promise<PipelineJobRequest | null> {
    if (this.closed) return null;
    return this.pending.shift() ?? null;
  }

  async ack(outcome: JobOutcome): Promise<void> {
    this.outcomes.push(outcome);
  }

  async nack(jobId: string, errorMessage: string, retryable: boolean): Promise<void> {
    this.failures.push({ jobId, errorMessage, retryable });
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

const DEFAULT_QUEUE_KEY = 'faceless:jobs:upload';
const STATUS_KEY = 'faceless:jobs:status';
const RESULT_KEY = 'faceless:jobs:result';
const DEAD_KEY = 'faceless:jobs:dead';

function isPipelineJobRequest(value: unknown): value is PipelineJobRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string' || typeof v.enqueuedAt !== 'string') return false;
  if (v.kind === 'render') {
    return (
      typeof v.userId === 'string' &&
      typeof v.projectId === 'string' &&
      typeof v.title === 'string' &&
      typeof v.durationMinutes === 'number' &&
      typeof v.shortsCount === 'number' &&
      typeof v.storyboardScenes === 'number' &&
      typeof v.style === 'string'
    );
  }
  return (
    typeof v.videoProjectId === 'string' &&
    v.authorization === 'user_confirmed' &&
    (v.privacyStatus === 'private' || v.privacyStatus === 'unlisted' || v.privacyStatus === 'public')
  );
}

export function createRedisQueueAdapter(
  redisUrl: string,
  queueKey: string = DEFAULT_QUEUE_KEY
): QueueAdapter {
  const client = createClient({ url: redisUrl });
  let connected = false;

  client.on('error', (err: Error) => {
    console.error('[worker-redis] client error:', err.message);
  });

  async function ensureConnected() {
    if (connected && client.isOpen) return;
    if (!client.isOpen) await client.connect();
    connected = true;
  }

  return {
    async pop(timeoutMs = 5000) {
      await ensureConnected();
      const timeoutSeconds = Math.max(1, Math.ceil(timeoutMs / 1000));
      const popped = await client.blPop(queueKey, timeoutSeconds);
      if (!popped) return null;

      let parsed: unknown;
      try {
        parsed = JSON.parse(popped.element);
      } catch {
        await client.lPush(DEAD_KEY, JSON.stringify({ raw: popped.element, error: 'invalid_json', failedAt: new Date().toISOString() }));
        return null;
      }
      if (!isPipelineJobRequest(parsed)) {
        await client.lPush(DEAD_KEY, JSON.stringify({ raw: parsed, error: 'invalid_job_shape', failedAt: new Date().toISOString() }));
        return null;
      }
      await client.hSet(
        STATUS_KEY,
        parsed.id,
        JSON.stringify({ status: 'running', jobId: parsed.id, kind: parsed.kind ?? 'upload', updatedAt: new Date().toISOString() })
      );
      return parsed;
    },

    async ack(outcome: JobOutcome) {
      await ensureConnected();
      await client.hSet(RESULT_KEY, outcome.jobId, JSON.stringify(outcome));
      await client.hSet(
        STATUS_KEY,
        outcome.jobId,
        JSON.stringify({ status: outcome.status, jobId: outcome.jobId, updatedAt: new Date().toISOString() })
      );
    },

    async nack(jobId: string, errorMessage: string, retryable: boolean) {
      await ensureConnected();
      const outcome: JobOutcome = {
        jobId,
        status: 'failed',
        outputs: [],
        log: [],
        errorMessage,
        errorCategory: 'unknown'
      };
      await client.hSet(RESULT_KEY, jobId, JSON.stringify(outcome));
      await client.hSet(
        STATUS_KEY,
        jobId,
        JSON.stringify({ status: 'failed', jobId, retryable, errorMessage, updatedAt: new Date().toISOString() })
      );
      await client.lPush(DEAD_KEY, JSON.stringify({ jobId, errorMessage, retryable, failedAt: new Date().toISOString() }));
    },

    async close() {
      if (client.isOpen) await client.quit();
      connected = false;
    }
  };
}

export function unsupportedRedisAdapter(): QueueAdapter {
  const error = new Error('REDIS_URL is required for the FFmpeg worker queue adapter.');
  return {
    async pop() {
      throw error;
    },
    async ack() {
      throw error;
    },
    async nack() {
      throw error;
    },
    async close() {
      // no-op
    }
  };
}
