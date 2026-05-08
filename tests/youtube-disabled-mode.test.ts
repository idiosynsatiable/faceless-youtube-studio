import { describe, expect, it, beforeEach } from 'vitest';

describe('YouTube OAuth disabled mode', () => {
  beforeEach(() => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
  });

  it('reports disabled state and refuses to build an authorize URL when env vars are absent', async () => {
    const mod = await import('@/lib/youtube-oauth?disabled=test1');
    const state = mod.oauthState();
    expect(state.enabled).toBe(false);
    expect(mod.buildAuthorizeUrl('xyz')).toBeNull();
    expect(mod.disabledOAuthResponse.reason).toBe('integration_disabled');
  });

  it('upload publish never simulates success when integration is disabled', async () => {
    const mod = await import('@/lib/youtube-upload?disabled=test1');
    const draft = mod.preparePackage({
      title: 'Demo upload',
      description: '',
      tags: [],
      category: '27',
      privacyStatus: 'private'
    });
    const result = mod.publishOutcome({ videoProjectId: 'abc', authorization: 'user_confirmed', privacyStatus: 'private' }, draft);
    expect(result.status).toBe('needs_review');
    expect(result.reason).toBe('integration_disabled');
  });
});
