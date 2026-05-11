// Redis-backed QueueProducer bootstrap.
//
// When `REDIS_URL` is set in the environment, this module wires
// setQueueProducer() to a real Redis client. The `/api/uploads/publish`
// route then enqueues UploadJobRequest payloads onto the
// `faceless:jobs:upload` list, where the FFmpeg worker consumes them.
//
// When `REDIS_URL` is not set, this module is a no-op and the default
// disabled-safe producer stays in place. The publish route returns
// `503 queue_disabled` until a producer is wired, which is the intended
// fail-loud behavior.
//
// Wiring: instrumentation.ts at the repo root imports this module from
// inside Next.js's `register()` hook. The Next.js worker process invokes
// initializeRedisQueueProducer() once at startup.

import { setQueueProducer, type QueueProducer, type UploadJobRequest } from '@/lib/queue-producer';

export interface RedisBootstrapResult {
  ok: boolean;
  reason?:
    | 'no_redis_url'
    | 'already_initialized'
    | 'redis_package_missing'
    | 'connect_failed'
    | 'initialized';
  message?: string;
}

let initialized = false;
let activeProducer: QueueProducer | null = null;

const DEFAULT_QUEUE_KEY = 'faceless:jobs:upload';

export async function initializeRedisQueueProducer(
  redisUrl: string | undefined = process.env.REDIS_URL,
  queueKey: string = DEFAULT_QUEUE_KEY
): Promise<RedisBootstrapResult> {
  if (!redisUrl) {
    return { ok: false, reason: 'no_redis_url', message: 'REDIS_URL is not set; queue stays disabled.' };
  }
  if (initialized) {
    return { ok: true, reason: 'already_initialized' };
  }

  let redisModule: typeof import('redis');
  try {
    redisModule = await import('redis');
  } catch (err) {
    return {
      ok: false,
      reason: 'redis_package_missing',
      message:
        '`redis` npm package is not installed. Run `npm install redis@4.7.0` to enable the queue producer.'
    };
  }

  const client = redisModule.createClient({ url: redisUrl });
  client.on('error', (err: Error) => {
    // Avoid throwing inside the listener; log and let the next enqueue retry.
    console.error('[redis-bootstrap] client error:', err.message);
  });

  try {
    await client.connect();
  } catch (err) {
    return {
      ok: false,
      reason: 'connect_failed',
      message: err instanceof Error ? err.message : 'unknown connection error'
    };
  }

  const producer: QueueProducer = {
    async enqueue(request: UploadJobRequest) {
      await client.rPush(queueKey, JSON.stringify(request));
      return { enqueued: true, queueKey };
    },
    async close() {
      try {
        await client.quit();
      } catch {
        // ignore — the process is shutting down anyway
      }
    }
  };

  setQueueProducer(producer);
  activeProducer = producer;
  initialized = true;
  return { ok: true, reason: 'initialized', message: `connected to Redis, queueKey=${queueKey}` };
}

export async function shutdownRedisQueueProducer(): Promise<void> {
  if (activeProducer) {
    await activeProducer.close();
    activeProducer = null;
  }
  setQueueProducer(null);
  initialized = false;
}
