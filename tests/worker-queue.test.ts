import { describe, expect, it } from 'vitest';
import { InMemoryQueueAdapter, unsupportedRedisAdapter } from '@/worker/queue';
import type { UploadJobRequest } from '@/lib/queue-producer';

const request: UploadJobRequest = {
  id: 'req-1',
  videoProjectId: 'proj-1',
  privacyStatus: 'private',
  enqueuedAt: new Date().toISOString(),
  authorization: 'user_confirmed'
};

describe('worker queue adapter', () => {
  it('in-memory adapter returns null when empty', async () => {
    const q = new InMemoryQueueAdapter();
    expect(await q.pop()).toBeNull();
  });

  it('in-memory adapter returns enqueued requests in order, then null', async () => {
    const q = new InMemoryQueueAdapter();
    q.enqueue({ ...request, id: 'a' });
    q.enqueue({ ...request, id: 'b' });
    expect((await q.pop())?.id).toBe('a');
    expect((await q.pop())?.id).toBe('b');
    expect(await q.pop()).toBeNull();
  });

  it('in-memory adapter records ack and nack outcomes', async () => {
    const q = new InMemoryQueueAdapter();
    await q.ack({ jobId: 'a', status: 'completed', outputs: [], log: [] });
    await q.nack('b', 'oops', true);
    expect(q.outcomes).toHaveLength(1);
    expect(q.failures).toHaveLength(1);
    expect(q.failures[0].retryable).toBe(true);
  });

  it('unsupported redis adapter throws a clear error pointing at docs', async () => {
    const q = unsupportedRedisAdapter();
    await expect(q.pop()).rejects.toThrowError(/FFMPEG_WORKER\.md/);
    await expect(q.ack({ jobId: 'a', status: 'completed', outputs: [], log: [] })).rejects.toThrowError(/FFMPEG_WORKER\.md/);
  });
});
