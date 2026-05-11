import { describe, expect, it, beforeEach, vi } from 'vitest';

const ENV = {
  YOUTUBE_CLIENT_ID: 'test-client-id',
  YOUTUBE_CLIENT_SECRET: 'test-client-secret',
  YOUTUBE_REDIRECT_URI: 'http://localhost/api/youtube/callback'
};

function mockFetch(handlers: Array<(url: string, init?: RequestInit) => Response>): typeof fetch {
  let i = 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const handler = handlers[i++];
    if (!handler) throw new Error(`unexpected fetch call ${i} for ${url}`);
    return handler(url, init);
  }) as typeof fetch;
}

describe('youtube client', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ENV);
  });

  it('exchangeAuthorizationCode posts to the token endpoint and returns parsed tokens', async () => {
    const fetcher = mockFetch([
      (url, init) => {
        expect(url).toBe('https://oauth2.googleapis.com/token');
        expect(init?.method).toBe('POST');
        const body = init?.body as URLSearchParams;
        expect(body.get('code')).toBe('AUTH_CODE');
        expect(body.get('grant_type')).toBe('authorization_code');
        return new Response(JSON.stringify({
          access_token: 'ya29.access',
          refresh_token: '1//refresh',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          token_type: 'Bearer'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);
    const mod = await import('@/lib/youtube-client');
    const tokens = await mod.exchangeAuthorizationCode('AUTH_CODE', fetcher);
    expect(tokens.accessToken).toBe('ya29.access');
    expect(tokens.refreshToken).toBe('1//refresh');
    expect(tokens.expiresInSeconds).toBe(3599);
  });

  it('exchangeAuthorizationCode throws when refresh_token is missing', async () => {
    const fetcher = mockFetch([
      () => new Response(JSON.stringify({ access_token: 'ya29.access' }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ]);
    const mod = await import('@/lib/youtube-client');
    await expect(mod.exchangeAuthorizationCode('AUTH_CODE', fetcher)).rejects.toThrow(/refresh_token/);
  });

  it('exchangeAuthorizationCode throws when integration is disabled', async () => {
    delete process.env.YOUTUBE_CLIENT_ID;
    delete process.env.YOUTUBE_CLIENT_SECRET;
    const fetcher = mockFetch([]);
    const mod = await import('@/lib/youtube-client');
    await expect(mod.exchangeAuthorizationCode('CODE', fetcher)).rejects.toThrow(/not configured/);
  });

  it('refreshAccessToken returns the new access token', async () => {
    const fetcher = mockFetch([
      (_, init) => {
        const body = init?.body as URLSearchParams;
        expect(body.get('grant_type')).toBe('refresh_token');
        expect(body.get('refresh_token')).toBe('1//refresh');
        return new Response(JSON.stringify({
          access_token: 'ya29.refreshed',
          expires_in: 3599,
          scope: 'https://www.googleapis.com/auth/youtube.upload',
          token_type: 'Bearer'
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);
    const mod = await import('@/lib/youtube-client');
    const refreshed = await mod.refreshAccessToken('1//refresh', fetcher);
    expect(refreshed.accessToken).toBe('ya29.refreshed');
  });

  it('getMyChannel returns the first item id and title', async () => {
    const fetcher = mockFetch([
      (url, init) => {
        expect(url).toContain('youtube/v3/channels');
        const headers = init?.headers as Record<string, string>;
        expect(headers.Authorization).toBe('Bearer ya29.access');
        return new Response(JSON.stringify({
          items: [
            { id: 'UC_test_channel_id', snippet: { title: 'sobit ca', defaultLanguage: 'en', country: 'US' } }
          ]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);
    const mod = await import('@/lib/youtube-client');
    const info = await mod.getMyChannel('ya29.access', fetcher);
    expect(info.id).toBe('UC_test_channel_id');
    expect(info.title).toBe('sobit ca');
  });
});
