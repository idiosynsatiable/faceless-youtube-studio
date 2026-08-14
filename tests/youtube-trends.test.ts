import { describe, expect, it } from 'vitest';
import { fetchMostPopularVideos } from '@/lib/youtube-trends';

function fetcher(response: Response, inspect?: (url: string, init?: RequestInit) => void): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    inspect?.(url, init);
    return response;
  }) as typeof fetch;
}

describe('YouTube mostPopular trend discovery', () => {
  it('uses the official mostPopular chart and parses engagement signals', async () => {
    const response = new Response(JSON.stringify({
      items: [{
        id: 'abc123',
        snippet: {
          title: 'A rising topic explained',
          channelTitle: 'Example Channel',
          description: 'Context',
          categoryId: '28',
          publishedAt: '2026-08-14T12:00:00Z'
        },
        statistics: { viewCount: '12345', likeCount: '678', commentCount: '90' }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const videos = await fetchMostPopularVideos('access-token', 'us', 25, fetcher(response, (url, init) => {
      expect(url).toContain('chart=mostPopular');
      expect(url).toContain('regionCode=US');
      expect(url).toContain('part=snippet%2Cstatistics');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer access-token');
    }));

    expect(videos).toHaveLength(1);
    expect(videos[0]).toMatchObject({
      id: 'abc123',
      title: 'A rising topic explained',
      viewCount: 12345,
      likeCount: 678,
      commentCount: 90,
      url: 'https://www.youtube.com/watch?v=abc123'
    });
  });

  it('throws instead of inventing trends when YouTube fails', async () => {
    const response = new Response(JSON.stringify({ error: { message: 'quota or auth failure' } }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
    await expect(fetchMostPopularVideos('bad-token', 'US', 25, fetcher(response))).rejects.toThrow(/failed \(403\)/);
  });
});
