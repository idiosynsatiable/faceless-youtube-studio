import { beforeEach, describe, expect, it, vi } from 'vitest';

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

describe('authorized YouTube channel verification', () => {
  beforeEach(() => {
    vi.resetModules();
    Object.assign(process.env, ENV);
  });

  it('accepts a token only when mine=true resolves to the expected immutable channel ID', async () => {
    const fetcher = mockFetch([
      (url, init) => {
        expect(url).toContain('channels?mine=true');
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer ya29.owner');
        return new Response(JSON.stringify({
          items: [{ id: 'UC_IDIOSYNSATIABLE', snippet: { title: 'idiosynsatiable' } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);
    const mod = await import('@/lib/youtube-client');
    const channel = await mod.verifyAuthorizedChannel('ya29.owner', { channelId: 'UC_IDIOSYNSATIABLE' }, fetcher);
    expect(channel.id).toBe('UC_IDIOSYNSATIABLE');
  });

  it('rejects a valid token when it resolves to a different channel', async () => {
    const fetcher = mockFetch([
      () => new Response(JSON.stringify({
        items: [{ id: 'UC_NOT_THE_OWNER', snippet: { title: 'different channel' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    ]);
    const mod = await import('@/lib/youtube-client');
    await expect(
      mod.verifyAuthorizedChannel('ya29.other', { channelId: 'UC_IDIOSYNSATIABLE' }, fetcher)
    ).rejects.toThrow(/channel mismatch/);
  });

  it('cross-checks the authenticated identity against the owner-approved public handle', async () => {
    const fetcher = mockFetch([
      () => new Response(JSON.stringify({
        items: [{ id: 'UC_IDIOSYNSATIABLE', snippet: { title: 'idiosynsatiable' } }]
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      (url) => {
        expect(url).toContain('forHandle=%40idiosynsatiable');
        return new Response(JSON.stringify({
          items: [{ id: 'UC_IDIOSYNSATIABLE', snippet: { title: 'idiosynsatiable' } }]
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);
    const mod = await import('@/lib/youtube-client');
    const channel = await mod.verifyAuthorizedChannel(
      'ya29.owner',
      { channelId: 'UC_IDIOSYNSATIABLE', channelHandle: '@idiosynsatiable' },
      fetcher
    );
    expect(channel.title).toBe('idiosynsatiable');
  });
});
