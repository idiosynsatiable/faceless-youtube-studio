import { describe, expect, it, beforeAll } from 'vitest';

describe('upload publish requires explicit user authorization', () => {
  beforeAll(() => {
    process.env.YOUTUBE_CLIENT_ID = 'youtube-test-client';
    process.env.YOUTUBE_CLIENT_SECRET = 'youtube-test-secret';
  });

  it('returns needs_review with authorization_required when authorization is missing', async () => {
    const mod = await import('@/lib/youtube-upload?auth-test=1');
    const draft = mod.preparePackage({
      title: 'demo',
      description: '',
      tags: [],
      category: '27',
      privacyStatus: 'private'
    });
    // Cast because TypeScript would otherwise prevent constructing this invalid input.
    const invalid = { videoProjectId: 'abc', authorization: 'no', privacyStatus: 'private' } as unknown as Parameters<typeof mod.publishOutcome>[0];
    const result = mod.publishOutcome(invalid, draft);
    expect(result.status).toBe('needs_review');
    expect(result.reason).toBe('authorization_required');
  });

  it('enqueues when user_confirmed is provided', async () => {
    const mod = await import('@/lib/youtube-upload?auth-test=2');
    const draft = mod.preparePackage({
      title: 'demo',
      description: '',
      tags: [],
      category: '27',
      privacyStatus: 'private'
    });
    const r = mod.publishOutcome({ videoProjectId: 'abc', authorization: 'user_confirmed', privacyStatus: 'private' }, draft);
    expect(r.reason).toBe('enqueued');
    expect(r.status === 'private_uploaded' || r.status === 'scheduled').toBe(true);
  });
});
