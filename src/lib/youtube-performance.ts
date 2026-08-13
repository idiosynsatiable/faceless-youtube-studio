import type { FetchLike } from './youtube-client';

const ANALYTICS_URL = 'https://youtubeanalytics.googleapis.com/v2/reports';

export interface ChannelPerformance {
  views28d: number;
  averageViewDurationSeconds: number;
  subscribersGained28d: number;
  summary: string;
  available: boolean;
}

function dateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export async function fetchChannelPerformance(accessToken: string, fetchImpl: FetchLike = fetch): Promise<ChannelPerformance> {
  const end = new Date();
  end.setUTCDate(end.getUTCDate() - 1);
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 27);
  const query = new URLSearchParams({
    ids: 'channel==MINE',
    startDate: dateOnly(start),
    endDate: dateOnly(end),
    metrics: 'views,averageViewDuration,subscribersGained'
  });
  const res = await fetchImpl(`${ANALYTICS_URL}?${query.toString()}`, { headers: { Authorization: `Bearer ${accessToken}` } });
  if (!res.ok) return { views28d: 0, averageViewDurationSeconds: 0, subscribersGained28d: 0, summary: 'YouTube Analytics unavailable for this cycle.', available: false };
  const payload = await res.json().catch(() => null) as { columnHeaders?: { name?: string }[]; rows?: unknown[][] } | null;
  const headers = payload?.columnHeaders?.map((header) => header.name ?? '') ?? [];
  const row = payload?.rows?.[0] ?? [];
  const values = Object.fromEntries(headers.map((header, index) => [header, row[index]]));
  const views = Number(values.views ?? 0) || 0;
  const avd = Number(values.averageViewDuration ?? 0) || 0;
  const subs = Number(values.subscribersGained ?? 0) || 0;
  return {
    views28d: Math.round(views),
    averageViewDurationSeconds: avd,
    subscribersGained28d: Math.round(subs),
    summary: `Last 28 days: ${Math.round(views)} views, ${avd.toFixed(1)}s average view duration, ${Math.round(subs)} subscribers gained.`,
    available: true
  };
}
