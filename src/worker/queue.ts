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
const INFLIGHT_KEY = 'faceless:jobs:inflight';
const CLAIM_KEY = 'faceless:jobs:claims';
const HEARTBEAT_MS = 30_000;
const LEASE_MS = 90_000;
const REAP_INTERVAL_MS = 30_000;
const MAX_RETRIES = 3;

const CLAIM_SCRIPT = `
local raw = redis.call('LPOP', KEYS[1])
if not raw then return nil end
local ok, job = pcall(cjson.decode, raw)
if not ok or type(job) ~= 'table' or not job.id then
  redis.call('LPUSH', KEYS[4], cjson.encode({raw=raw,error='invalid_job_json',failedAt=ARGV[1]}))
  return '__INVALID__'
end
local attempt = tonumber(job.queueAttempt or 0)
redis.call('RPUSH', KEYS[2], raw)
redis.call('HSET', KEYS[3], job.id, cjson.encode({raw=raw,claimedAt=ARGV[1],attempt=attempt}))
return raw
`;

const HEARTBEAT_SCRIPT = `
local claim = redis.call('HGET', KEYS[1], ARGV[1])
if not claim then return 0 end
local parsed = cjson.decode(claim)
parsed.claimedAt = ARGV[2]
redis.call('HSET', KEYS[1], ARGV[1], cjson.encode(parsed))
return 1
`;

const ACK_SCRIPT = `
local claim = redis.call('HGET', KEYS[1], ARGV[1])
if claim then
  local parsed = cjson.decode(claim)
  redis.call('LREM', KEYS[2], 1, parsed.raw)
end
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[3], ARGV[1], ARGV[2])
redis.call('HSET', KEYS[4], ARGV[1], ARGV[3])
return 1
`;

const RETRY_SCRIPT = `
local claim = redis.call('HGET', KEYS[1], ARGV[1])
if not claim then return 0 end
local parsed = cjson.decode(claim)
local ok, job = pcall(cjson.decode, parsed.raw)
if not ok or type(job) ~= 'table' then return 0 end
job.queueAttempt = tonumber(ARGV[2])
local nextRaw = cjson.encode(job)
redis.call('LREM', KEYS[2], 1, parsed.raw)
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('RPUSH', KEYS[3], nextRaw)
redis.call('HSET', KEYS[4], ARGV[1], ARGV[3])
return 1
`;

const FAIL_SCRIPT = `
local claim = redis.call('HGET', KEYS[1], ARGV[1])
if claim then
  local parsed = cjson.decode(claim)
  redis.call('LREM', KEYS[2], 1, parsed.raw)
end
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('HSET', KEYS[3], ARGV[1], ARGV[2])
redis.call('HSET', KEYS[4], ARGV[1], ARGV[3])
redis.call('LPUSH', KEYS[5], ARGV[4])
return 1
`;

const RECOVER_SCRIPT = `
local current = redis.call('HGET', KEYS[1], ARGV[1])
if not current or current ~= ARGV[2] then return 0 end
local parsed = cjson.decode(current)
redis.call('LREM', KEYS[2], 1, parsed.raw)
redis.call('HDEL', KEYS[1], ARGV[1])
redis.call('RPUSH', KEYS[3], parsed.raw)
redis.call('HSET', KEYS[4], ARGV[1], ARGV[3])
return 1
`;

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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

type ClaimRecord = { raw: string; claimedAt: string; attempt: number };

export function createRedisQueueAdapter(
  redisUrl: string,
  queueKey: string = DEFAULT_QUEUE_KEY
): QueueAdapter {
  const client = createClient({ url: redisUrl });
  let connected = false;
  let closed = false;
  let lastReapAt = 0;
  const heartbeatTimers = new Map<string, ReturnType<typeof setInterval>>();

  client.on('error', (err: Error) => {
    console.error('[worker-redis] client error:', err.message);
  });

  async function ensureConnected() {
    if (connected && client.isOpen) return;
    if (!client.isOpen) await client.connect();
    connected = true;
  }

  async function evalScript(script: string, keys: string[], args: string[]): Promise<unknown> {
    return client.sendCommand(['EVAL', script, String(keys.length), ...keys, ...args]);
  }

  function stopHeartbeat(jobId: string): void {
    const timer = heartbeatTimers.get(jobId);
    if (timer) clearInterval(timer);
    heartbeatTimers.delete(jobId);
  }

  function startHeartbeat(jobId: string): void {
    stopHeartbeat(jobId);
    const timer = setInterval(() => {
      if (closed || !client.isOpen) return;
      void evalScript(HEARTBEAT_SCRIPT, [CLAIM_KEY], [jobId, new Date().toISOString()]).catch((err) => {
        console.error('[worker-redis] heartbeat failed:', err instanceof Error ? err.message : String(err));
      });
    }, HEARTBEAT_MS);
    timer.unref?.();
    heartbeatTimers.set(jobId, timer);
  }

  async function reapStaleClaims(): Promise<void> {
    const now = Date.now();
    if (now - lastReapAt < REAP_INTERVAL_MS) return;
    lastReapAt = now;
    const claims = await client.hGetAll(CLAIM_KEY);
    for (const [jobId, encoded] of Object.entries(claims)) {
      let claim: ClaimRecord;
      try {
        claim = JSON.parse(encoded) as ClaimRecord;
      } catch {
        continue;
      }
      const claimedAt = Date.parse(claim.claimedAt);
      if (!Number.isFinite(claimedAt) || now - claimedAt <= LEASE_MS) continue;
      const status = JSON.stringify({
        status: 'queued',
        jobId,
        recovered: true,
        updatedAt: new Date().toISOString()
      });
      await evalScript(RECOVER_SCRIPT, [CLAIM_KEY, INFLIGHT_KEY, queueKey, STATUS_KEY], [jobId, encoded, status]);
    }
  }

  async function readClaim(jobId: string): Promise<ClaimRecord | null> {
    const encoded = await client.hGet(CLAIM_KEY, jobId);
    if (!encoded) return null;
    try {
      return JSON.parse(encoded) as ClaimRecord;
    } catch {
      return null;
    }
  }

  return {
    async pop(timeoutMs = 5000) {
      await ensureConnected();
      await reapStaleClaims();
      const deadline = Date.now() + Math.max(0, timeoutMs);
      do {
        const reply = await evalScript(
          CLAIM_SCRIPT,
          [queueKey, INFLIGHT_KEY, CLAIM_KEY, DEAD_KEY],
          [new Date().toISOString()]
        );
        if (reply === '__INVALID__') continue;
        if (typeof reply === 'string' && reply.length > 0) {
          let parsed: unknown;
          try {
            parsed = JSON.parse(reply);
          } catch {
            await sleep(50);
            continue;
          }
          if (!isPipelineJobRequest(parsed)) {
            await this.nack((parsed as { id?: string })?.id ?? 'invalid-job', 'invalid_job_shape', false);
            continue;
          }
          await client.hSet(
            STATUS_KEY,
            parsed.id,
            JSON.stringify({
              status: 'running',
              jobId: parsed.id,
              kind: parsed.kind ?? 'upload',
              updatedAt: new Date().toISOString()
            })
          );
          startHeartbeat(parsed.id);
          return parsed;
        }
        if (Date.now() >= deadline) return null;
        await sleep(Math.min(250, Math.max(1, deadline - Date.now())));
      } while (!closed);
      return null;
    },

    async ack(outcome: JobOutcome) {
      await ensureConnected();
      stopHeartbeat(outcome.jobId);
      const status = JSON.stringify({
        status: outcome.status,
        jobId: outcome.jobId,
        updatedAt: new Date().toISOString()
      });
      await evalScript(
        ACK_SCRIPT,
        [CLAIM_KEY, INFLIGHT_KEY, RESULT_KEY, STATUS_KEY],
        [outcome.jobId, JSON.stringify(outcome), status]
      );
    },

    async nack(jobId: string, errorMessage: string, retryable: boolean) {
      await ensureConnected();
      stopHeartbeat(jobId);
      const claim = await readClaim(jobId);
      const currentAttempt = claim?.attempt ?? 0;

      if (retryable && claim && currentAttempt < MAX_RETRIES) {
        const nextAttempt = currentAttempt + 1;
        const backoffMs = Math.min(8_000, 1_000 * 2 ** currentAttempt);
        await sleep(backoffMs);
        const retryStatus = JSON.stringify({
          status: 'queued',
          jobId,
          retrying: true,
          attempt: nextAttempt,
          errorMessage,
          updatedAt: new Date().toISOString()
        });
        await evalScript(
          RETRY_SCRIPT,
          [CLAIM_KEY, INFLIGHT_KEY, queueKey, STATUS_KEY],
          [jobId, String(nextAttempt), retryStatus]
        );
        return;
      }

      const outcome: JobOutcome = {
        jobId,
        status: 'failed',
        outputs: [],
        log: [],
        errorMessage,
        errorCategory: 'unknown'
      };
      const status = JSON.stringify({
        status: 'failed',
        jobId,
        retryable: false,
        attempts: currentAttempt + 1,
        errorMessage,
        updatedAt: new Date().toISOString()
      });
      const dead = JSON.stringify({
        jobId,
        errorMessage,
        retryable,
        attempts: currentAttempt + 1,
        failedAt: new Date().toISOString()
      });
      await evalScript(
        FAIL_SCRIPT,
        [CLAIM_KEY, INFLIGHT_KEY, RESULT_KEY, STATUS_KEY, DEAD_KEY],
        [jobId, JSON.stringify(outcome), status, dead]
      );
    },

    async close() {
      closed = true;
      for (const jobId of heartbeatTimers.keys()) stopHeartbeat(jobId);
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
