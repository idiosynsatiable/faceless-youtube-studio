import type { FetchLike } from './youtube-client';

const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

export interface ChannelPerformance {
  lifetimeViews: number;
  subscribers: number;
  videos: number;
  summary: string;
  available: boolean;
}

export async function fetchChannelPerformance(accessToken: string, fetchImpl: FetchLike = fetch): Promise<ChannelPerformance> {
  const res = await fetchImpl(`${CHANNELS_URL}?mine=true&part=statistics`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { lifetimeViews: 0, subscribers: 0, videos: 0, summary: 'YouTube channel statistics unavailable for this cycle.', available: false };
  const payload = await res.json().catch(() => null) as { items?: Array<{ statistics?: { viewCount?: string; subscriberCount?: string; videoCount?: string } }> } | null;
  const stats = payload?.items?.[0]?.statistics;
  if (!stats) return { lifetimeViews: 0, subscribers: 0, videos: 0, summary: 'YouTube channel statistics unavailable for this cycle.', available: false };
  const views = Number(stats.viewCount ?? 0) || 0;
  const subscribers = Number(stats.subscriberCount ?? 0) || 0;
  const videos = Number(stats.videoCount ?? 0) || 0;
  return {
    lifetimeViews: Math.round(views),
    subscribers: Math.round(subscribers),
    videos: Math.round(videos),
    summary: `Channel baseline: ${Math.round(views)} lifetime views, ${Math.round(subscribers)} subscribers, ${Math.round(videos)} published videos.`,
    available: true
  };
}
