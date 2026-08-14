import { describe, expect, it } from 'vitest';
import { fetchVideoPerformance } from '@/lib/youtube-performance';

function fetcher(response: Response, inspect?: (url: string, init?: RequestInit) => void): typeof fetch {
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    inspect?.(url, init);
    return response;
  }) as typeof fetch;
}

describe('YouTube recent-video performance', () => {
  it('fetches official statistics for owned video ids with a valid id-filter request', async () => {
    const response = new Response(JSON.stringify({
      items: [{
        id: 'video-1',
        snippet: { title: 'One', publishedAt: '2026-08-14T12:00:00Z' },
        statistics: { viewCount: '1200', likeCount: '80', commentCount: '12' }
      }]
    }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    const rows = await fetchVideoPerformance('token', ['video-1', 'video-1'], fetcher(response, (url, init) => {
      expect(url).toContain('part=snippet%2Cstatistics');
      expect(url).toContain('id=video-1');
      expect(url).not.toContain('maxResults');
      expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer token');
    }));

    expect(rows).toEqual([{
      id: 'video-1',
      title: 'One',
      publishedAt: '2026-08-14T12:00:00Z',
      viewCount: 1200,
      likeCount: 80,
      commentCount: 12
    }]);
  });

  it('returns no fabricated metrics when the API fails', async () => {
    const response = new Response('{}', { status: 403 });
    await expect(fetchVideoPerformance('token', ['video-1'], fetcher(response))).resolves.toEqual([]);
  });
});
