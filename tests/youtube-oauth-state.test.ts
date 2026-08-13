import { beforeEach, describe, expect, it, vi } from 'vitest';

const ENV = {
  YOUTUBE_CLIENT_ID: 'test-client-id',
  YOUTUBE_CLIENT_SECRET: 'test-client-secret',
  YOUTUBE_REDIRECT_URI: 'http://localhost/api/youtube/callback',
  JWT_SECRET: 'jwt-test-secret',
  OAUTH_STATE_SECRET: 'oauth-state-test-secret'
};

describe('YouTube OAuth state', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ENV);
  });

  it('creates and verifies a signed state value within its validity window', async () => {
    const mod = await import('@/lib/youtube-oauth');
    const state = mod.createOAuthState(1_000_000);
    expect(mod.verifyOAuthState(state, 1_000_100)).toMatchObject({ issuedAt: 1_000_000 });
  });

  it('rejects tampered and expired OAuth state values', async () => {
    const mod = await import('@/lib/youtube-oauth');
    const state = mod.createOAuthState(1_000_000);
    expect(mod.verifyOAuthState(`${state}tampered`, 1_000_100)).toBeNull();
    expect(mod.verifyOAuthState(state, 1_600_001)).toBeNull();
  });
});
