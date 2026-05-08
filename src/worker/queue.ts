// Queue adapter interface. The worker is queue-agnostic. Two adapters ship:
//
// 1. InMemoryQueueAdapter — used in tests; deterministic, no I/O.
// 2. unsupportedRedisAdapter — placeholder that throws a clear error pointing
//    at docs/FFMPEG_WORKER.md. Operators wire up a real Redis adapter using
//    the documented contract; we don't bundle the `redis` npm package because
//    the worker is run as a separate process by the operator.

import type { AssemblyJob, JobOutcome } from './types';

export interface QueueAdapter {
  /** Block for up to timeoutMs and return the next job, or null if none. */
  pop(timeoutMs?: number): Promise<AssemblyJob | null>;
  /** Mark a job complete and persist its outcome. */
  ack(outcome: JobOutcome): Promise<void>;
  /** Mark a job failed; dead-letter handling is the adapter's choice. */
  nack(jobId: string, errorMessage: string, retryable: boolean): Promise<void>;
  /** Idempotent close; the worker calls this on SIGTERM. */
  close(): Promise<void>;
}

export class InMemoryQueueAdapter implements QueueAdapter {
  private readonly pending: AssemblyJob[] = [];
  readonly outcomes: JobOutcome[] = [];
  readonly failures: { jobId: string; errorMessage: string; retryable: boolean }[] = [];
  private closed = false;

  enqueue(job: AssemblyJob): void {
    if (this.closed) throw new Error('queue closed');
    this.pending.push(job);
  }

  async pop(): Promise<AssemblyJob | null> {
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
 * Documented contract for a Redis adapter:
 *
 * - On pop(), call BLPOP on a list key like `faceless:jobs:upload` with
 *   timeoutMs / 1000. Parse the JSON value into AssemblyJob. Validate against
 *   the schema before returning.
 * - On ack(), HSET the result into a hash like `faceless:jobs:result` and
 *   publish a notification on a pub/sub channel.
 * - On nack(retryable=true), re-enqueue with backoff (e.g. ZADD with score =
 *   now + delayMs). Use a separate scheduler loop to move ready items back to
 *   the main list.
 * - On nack(retryable=false), push to a dead-letter list and publish a
 *   notification.
 * - On close(), quit the redis client. The worker calls close() once per
 *   SIGTERM.
 *
 * We do not bundle a redis client to keep the build dependency-free. Wire up
 * your own client (`redis`, `ioredis`, or the upstash REST client) and
 * implement the QueueAdapter interface.
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
