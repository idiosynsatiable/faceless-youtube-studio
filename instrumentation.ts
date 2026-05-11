// Next.js instrumentation hook. Runs once at server startup.
//
// We use it to wire the Redis-backed QueueProducer when REDIS_URL is set.
// If REDIS_URL is not set, the default disabled-safe producer stays in
// place and /api/uploads/publish returns 503 queue_disabled — intended
// failure mode.

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  if (!process.env.REDIS_URL) return;
  try {
    const { initializeRedisQueueProducer } = await import('@/queue/redis-bootstrap');
    const result = await initializeRedisQueueProducer();
    if (result.ok) {
      console.log(`[instrumentation] redis queue producer ${result.reason}: ${result.message ?? ''}`);
    } else {
      console.warn(`[instrumentation] redis queue producer NOT wired (${result.reason}): ${result.message ?? ''}`);
    }
  } catch (err) {
    console.error('[instrumentation] redis bootstrap failed:', err);
  }
}
