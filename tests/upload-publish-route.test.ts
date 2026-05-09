import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';

function makeRequest(body: unknown): Request {
  return new Request('https://example.com/api/uploads/publish', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

describe('POST /api/uploads/publish (route handler)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    delete process.env.YOUTUBE_REDIRECT_URI;
  });

  it('rejects with 401 when authorization is missing, even before checking integration', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost/api/youtube/callback';
    const route = await import('@/app/api/uploads/publish/route');
    const res = await route.POST(makeRequest({ videoProjectId: 'abc', privacyStatus: 'private' }));
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('authorization_required');
  });

  it('rejects with 401 when authorization value is anything other than user_confirmed', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost/api/youtube/callback';
    const route = await import('@/app/api/uploads/publish/route');
    const res = await route.POST(
      makeRequest({ videoProjectId: 'abc', privacyStatus: 'private', authorization: 'no' })
    );
    expect(res.status).toBe(401);
  });

  it('returns 503 integration_disabled when YouTube OAuth is not configured', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    const route = await import('@/app/api/uploads/publish/route');
    const res = await route.POST(
      makeRequest({
        videoProjectId: 'abc',
        privacyStatus: 'private',
        authorization: 'user_confirmed'
      })
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe('integration_disabled');
  });

  it('returns 503 queue_disabled when authorization is confirmed but no producer is wired up', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost/api/youtube/callback';
    const route = await import('@/app/api/uploads/publish/route');
    const queue = await import('@/lib/queue-producer');
    queue.setQueueProducer(null);
    const res = await route.POST(
      makeRequest({
        videoProjectId: 'abc',
        privacyStatus: 'private',
        authorization: 'user_confirmed'
      })
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.reason).toBe('queue_disabled');
    expect(body.detail).toMatch(/REDIS_URL/);
  });

  it('enqueues the job and returns 202 when authorization is confirmed and the queue is wired up', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost/api/youtube/callback';
    const queue = await import('@/lib/queue-producer');
    const producer = new queue.InMemoryQueueProducer();
    queue.setQueueProducer(producer);

    const route = await import('@/app/api/uploads/publish/route');
    const res = await route.POST(
      makeRequest({
        videoProjectId: 'project-123',
        privacyStatus: 'private',
        authorization: 'user_confirmed'
      })
    );
    expect(res.status).toBe(202);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.job).toBeDefined();
    expect(body.job.id).toMatch(/[0-9a-fA-F-]{36}/);
    expect(body.job.queueKey).toBe('memory:faceless:jobs:upload');

    expect(producer.enqueued).toHaveLength(1);
    const enqueued = producer.enqueued[0];
    expect(enqueued.videoProjectId).toBe('project-123');
    expect(enqueued.authorization).toBe('user_confirmed');
    expect(enqueued.privacyStatus).toBe('private');
    expect(typeof enqueued.enqueuedAt).toBe('string');
    expect(new Date(enqueued.enqueuedAt).toString()).not.toBe('Invalid Date');

    queue.setQueueProducer(null);
  });

  it('propagates an enqueue exception as 502 enqueue_failed', async () => {
    process.env.YOUTUBE_CLIENT_ID = 'test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'test-secret';
    process.env.YOUTUBE_REDIRECT_URI = 'http://localhost/api/youtube/callback';
    const queue = await import('@/lib/queue-producer');
    queue.setQueueProducer({
      async enqueue() {
        throw new Error('redis connection refused');
      },
      async close() {}
    });

    const route = await import('@/app/api/uploads/publish/route');
    const res = await route.POST(
      makeRequest({
        videoProjectId: 'project-123',
        privacyStatus: 'private',
        authorization: 'user_confirmed'
      })
    );
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.reason).toBe('enqueue_failed');
    expect(body.detail).toContain('redis connection refused');

    queue.setQueueProducer(null);
  });
});
