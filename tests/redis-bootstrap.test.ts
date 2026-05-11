import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

describe('redis bootstrap', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.REDIS_URL;
  });

  it('returns no_redis_url when REDIS_URL is not set', async () => {
    delete process.env.REDIS_URL;
    const mod = await import('@/queue/redis-bootstrap');
    const r = await mod.initializeRedisQueueProducer();
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_redis_url');
  });

  it('returns no_redis_url when an empty string is passed', async () => {
    const mod = await import('@/queue/redis-bootstrap');
    const r = await mod.initializeRedisQueueProducer('');
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('no_redis_url');
  });
});
