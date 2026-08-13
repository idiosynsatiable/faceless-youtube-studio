// Redis-backed queue producer bootstrap for both render and publish jobs.

import { setQueueProducer, type PipelineJobRequest, type QueueProducer } from '@/lib/queue-producer';

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
const STATUS_KEY = 'faceless:jobs:status';

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
  } catch {
    return {
      ok: false,
      reason: 'redis_package_missing',
      message: '`redis` npm package is not installed. Install redis@4.7.0 to enable rendering.'
    };
  }

  const client = redisModule.createClient({ url: redisUrl });
  client.on('error', (err: Error) => {
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
    async enqueue(request: PipelineJobRequest) {
      await client.hSet(
        STATUS_KEY,
        request.id,
        JSON.stringify({ status: 'queued', jobId: request.id, kind: request.kind ?? 'upload', updatedAt: new Date().toISOString() })
      );
      await client.rPush(queueKey, JSON.stringify(request));
      return { enqueued: true, queueKey };
    },
    async close() {
      try {
        if (client.isOpen) await client.quit();
      } catch {
        // process is shutting down
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
