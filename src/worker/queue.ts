// Queue adapter interface. The worker is queue-agnostic.
//
// The publish route enqueues UploadJobRequest payloads (see
// src/lib/queue-producer.ts). The worker pops them through this adapter,
// hydrates them into AssemblyJob records via job-hydrator.ts, runs the
// FFmpeg pipeline, then uploads to YouTube.
//
// Two adapters ship:
//
// 1. InMemoryQueueAdapter — used in tests; deterministic, no I/O.
// 2. unsupportedRedisAdapter — placeholder that throws a clear error
//    pointing at docs/FFMPEG_WORKER.md. Operators wire a real Redis
//    adapter using the documented contract.

import type { UploadJobRequest } from '@/lib/queue-producer';
import type { JobOutcome } from './types';

export interface QueueAdapter {
  /** Block for up to timeoutMs and return the next request, or null if none. */
  pop(timeoutMs?: number): Promise<UploadJobRequest | null>;
  /** Mark a job complete and persist its outcome. */
  ack(outcome: JobOutcome): Promise<void>;
  /** Mark a job failed; dead-letter handling is the adapter's choice. */
  nack(jobId: string, errorMessage: string, retryable: boolean): Promise<void>;
  /** Idempotent close; the worker calls this on SIGTERM. */
  close(): Promise<void>;
}

export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly pending: UploadJobRequest[] = [];
  readonly outcomes: JobOutcome[] = [];
  readonly failures: { jobId: string; errorMessage: string; retryable: boolean }[] = [];
  private closed = false;

  enqueue(request: UploadJobRequest): void {
    if (this.closed) throw new Error('queue closed');
    this.pending.push(request);
  }

  async pop(): Promise<UploadJobRequest | null> {
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

/**
 * Documented contract for a Redis-backed QueueAdapter:
 *
 * - pop(timeoutMs): BLPOP `faceless:jobs:upload` with timeoutMs/1000. Parse
 *   the JSON value into UploadJobRequest. Validate fields before returning.
 * - ack(outcome): HSET into `faceless:jobs:result` keyed by outcome.jobId
 *   and publish on a pub/sub channel.
 * - nack(retryable=true): ZADD `faceless:jobs:retry` with score = now + delay.
 *   A separate scheduler loop moves ready items back to the main list.
 * - nack(retryable=false): LPUSH to `faceless:jobs:dead`.
 * - close(): quit the redis client.
 *
 * Operators wire the real adapter; the redis npm package ships in
 * dependencies (since v1.1.x) but we leave construction to the operator
 * to keep the worker loop pluggable for non-Redis backends.
 */
export function unsupportedRedisAdapter(): QueueAdapter {
  const error = new Error(
    'Redis queue adapter is not bundled. See docs/FFMPEG_WORKER.md for the QueueAdapter contract and wire up a real Redis client.'
  );
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
