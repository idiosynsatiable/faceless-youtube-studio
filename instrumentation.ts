// Next.js instrumentation hook. Runs once at server startup.
// Production infrastructure and owner-channel prerequisites fail closed.

import { assertProductionConfig } from '@/lib/config';

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  if (process.env.NODE_ENV === 'production') {
    assertProductionConfig();
  }

  if (!process.env.REDIS_URL) return;
  try {
    const { initializeRedisQueueProducer } = await import('@/queue/redis-bootstrap');
    const result = await initializeRedisQueueProducer();
    if (result.ok) {
      console.log(`[instrumentation] redis queue producer ${result.reason}: ${result.message ?? ''}`);
    } else {
      throw new Error(`Redis queue producer was not wired: ${result.reason} ${result.message ?? ''}`);
    }
  } catch (err) {
    console.error('[instrumentation] redis bootstrap failed:', err);
    throw err;
  }
}
