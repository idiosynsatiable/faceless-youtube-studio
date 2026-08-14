import type { FetchLike } from './youtube-client';

const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';
const VIDEOS_URL = 'https://www.googleapis.com/youtube/v3/videos';

export interface ChannelPerformance {
  lifetimeViews: number;
  subscribers: number;
  videos: number;
  summary: string;
  available: boolean;
}

export interface VideoPerformance {
  id: string;
  title: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
}

function nonNegativeInt(value: unknown): number {
  const parsed = Number.parseInt(String(value ?? '0'), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function fetchChannelPerformance(accessToken: string, fetchImpl: FetchLike = fetch): Promise<ChannelPerformance> {
  const res = await fetchImpl(`${CHANNELS_URL}?mine=true&part=statistics`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { lifetimeViews: 0, subscribers: 0, videos: 0, summary: 'YouTube channel statistics unavailable for this cycle.', available: false };
  const payload = await res.json().catch(() => null) as { items?: Array<{ statistics?: { viewCount?: string; subscriberCount?: string; videoCount?: string } }> } | null;
  const stats = payload?.items?.[0]?.statistics;
  if (!stats) return { lifetimeViews: 0, subscribers: 0, videos: 0, summary: 'YouTube channel statistics unavailable for this cycle.', available: false };
  const views = nonNegativeInt(stats.viewCount);
  const subscribers = nonNegativeInt(stats.subscriberCount);
  const videos = nonNegativeInt(stats.videoCount);
  return {
    lifetimeViews: views,
    subscribers,
    videos,
    summary: `Channel baseline: ${views} lifetime views, ${subscribers} subscribers, ${videos} published videos.`,
    available: true
  };
}

export async function fetchVideoPerformance(
  accessToken: string,
  videoIds: string[],
  fetchImpl: FetchLike = fetch
): Promise<VideoPerformance[]> {
  const ids = [...new Set(videoIds.map((id) => id.trim()).filter(Boolean))].slice(0, 50);
  if (ids.length === 0) return [];
  const params = new URLSearchParams({
    part: 'snippet,statistics',
    id: ids.join(','),
    maxResults: String(ids.length)
  });
  const res = await fetchImpl(`${VIDEOS_URL}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  if (!res.ok) return [];
  const payload = await res.json().catch(() => null) as {
    items?: Array<{
      id?: string;
      snippet?: { title?: string; publishedAt?: string };
      statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
    }>;
  } | null;
  return (payload?.items ?? []).flatMap((item) => {
    if (!item.id) return [];
    return [{
      id: item.id,
      title: item.snippet?.title ?? 'Untitled video',
      publishedAt: item.snippet?.publishedAt ?? '',
      viewCount: nonNegativeInt(item.statistics?.viewCount),
      likeCount: nonNegativeInt(item.statistics?.likeCount),
      commentCount: nonNegativeInt(item.statistics?.commentCount)
    }];
  });
}
