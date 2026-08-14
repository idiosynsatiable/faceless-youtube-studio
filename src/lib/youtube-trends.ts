import type { FetchLike } from './youtube-client';

const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

export interface PopularVideoSignal {
  id: string;
  title: string;
  channelTitle: string;
  description: string;
  categoryId: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  url: string;
}

function count(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function fetchMostPopularVideos(
  accessToken: string,
  regionCode = 'US',
  maxResults = 25,
  fetchImpl: FetchLike = fetch
): Promise<PopularVideoSignal[]> {
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    chart: 'mostPopular',
    regionCode: regionCode.toUpperCase(),
    maxResults: String(Math.max(5, Math.min(50, Math.round(maxResults))))
  });
  const res = await fetchImpl(`${VIDEOS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await res.json().catch(() => null) as {
    items?: Array<{
      id?: string;
      snippet?: {
        title?: string;
        channelTitle?: string;
        description?: string;
        categoryId?: string;
        publishedAt?: string;
      };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
    error?: unknown;
  } | null;
  if (!res.ok || !payload) throw new Error(`YouTube mostPopular request failed (${res.status})`);
  return (payload.items ?? []).flatMap((item) => {
    if (!item.id || !item.snippet?.title) return [];
    return [{
      id: item.id,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle ?? 'unknown',
      description: (item.snippet.description ?? '').slice(0, 500),
      categoryId: item.snippet.categoryId ?? '0',
      publishedAt: item.snippet.publishedAt ?? '',
      viewCount: count(item.statistics?.viewCount),
      likeCount: count(item.statistics?.likeCount),
      commentCount: count(item.statistics?.commentCount),
      url: `https://www.youtube.com/watch?v=${encodeURIComponent(item.id)}`
    }];
  });
}
