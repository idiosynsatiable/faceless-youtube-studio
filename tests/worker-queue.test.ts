import { describe, expect, it } from 'vitest';
import { InMemoryQueueAdapter, unsupportedRedisAdapter } from '@/worker/queue';
import type { AssemblyJob } from '@/worker/types';
import { planVideoAssembly } from '@/lib/video-assembler';

const job: AssemblyJob = {
  id: 'job-1',
  scope: { userId: 'user1', projectId: 'proj1', baseFilename: 'demo' },
  plan: planVideoAssembly({
    title: 'demo',
    durationMinutes: 6,
    shortsCount: 1,
    storyboardScenes: 4,
    style: 'cinematic-clean'
  }),
  inputs: [{ path: '/srv/inputs/u1/p1/scene1.mp4', role: 'broll', license: 'creator-owned' }],
  enqueuedAt: new Date().toISOString()
};

describe('worker queue adapter', () => {
  it('in-memory adapter returns null when empty', async () => {
    const q = new InMemoryQueueAdapter();
    expect(await q.pop()).toBeNull();
  });

  it('in-memory adapter returns enqueued jobs in order, then null', async () => {
    const q = new InMemoryQueueAdapter();
    q.enqueue({ ...job, id: 'a' });
    q.enqueue({ ...job, id: 'b' });
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
