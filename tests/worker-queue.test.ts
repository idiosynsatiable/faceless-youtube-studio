import { describe, expect, it } from 'vitest';
import { InMemoryQueueAdapter, unsupportedRedisAdapter } from '@/worker/queue';
import type { RenderJobRequest, UploadJobRequest } from '@/lib/queue-producer';

const uploadRequest: UploadJobRequest = {
  id: 'req-1',
  videoProjectId: 'proj-1',
  privacyStatus: 'private',
  enqueuedAt: new Date().toISOString(),
  authorization: 'user_confirmed'
};

const renderRequest: RenderJobRequest = {
  kind: 'render',
  id: 'render-1',
  userId: 'workspace1',
  projectId: 'project1',
  title: 'Render me',
  durationMinutes: 8,
  shortsCount: 1,
  storyboardScenes: 8,
  style: 'cinematic-clean',
  enqueuedAt: new Date().toISOString()
};

describe('worker queue adapter', () => {
  it('in-memory adapter returns null when empty', async () => {
    const q = new InMemoryQueueAdapter();
    expect(await q.pop()).toBeNull();
  });

  it('in-memory adapter returns render and upload requests in order', async () => {
    const q = new InMemoryQueueAdapter();
    q.enqueue(renderRequest);
    q.enqueue({ ...uploadRequest, id: 'upload-2' });
    expect((await q.pop())?.id).toBe('render-1');
    expect((await q.pop())?.id).toBe('upload-2');
    expect(await q.pop()).toBeNull();
  });

  it('in-memory adapter records terminal outcomes without losing rejected status', async () => {
    const q = new InMemoryQueueAdapter();
    await q.ack({ jobId: 'a', status: 'completed', outputs: [], log: [] });
    await q.nack({
      jobId: 'b',
      status: 'rejected',
      outputs: [],
      log: ['render requires a visual asset'],
      errorMessage: 'render requires a visual asset',
      errorCategory: 'invalid_input_path'
    }, false);
    expect(q.outcomes).toHaveLength(1);
    expect(q.failures).toHaveLength(1);
    expect(q.failures[0].retryable).toBe(false);
    expect(q.failures[0].outcome.status).toBe('rejected');
    expect(q.failures[0].outcome.errorMessage).toContain('visual asset');
  });

  it('unsupported adapter fails loudly when REDIS_URL is missing', async () => {
    const q = unsupportedRedisAdapter();
    await expect(q.pop()).rejects.toThrowError(/REDIS_URL/);
    await expect(q.ack({ jobId: 'a', status: 'completed', outputs: [], log: [] })).rejects.toThrowError(/REDIS_URL/);
  });
});
