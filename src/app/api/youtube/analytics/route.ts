import { NextResponse } from 'next/server';
import { analyticsAvailability } from '@/lib/youtube-analytics';

export const runtime = 'nodejs';

export async function GET() {
  const status = analyticsAvailability();
  if (!status.enabled) {
    return NextResponse.json({ ok: false, ...status }, { status: 503 });
  }
  return NextResponse.json({
    ok: true,
    note: 'Analytics retrieval runs server-side via the official YouTube Analytics API. This endpoint serves only stored or freshly fetched data; it never fabricates metrics.',
    fields: [
      'impressions',
      'clickThroughRate',
      'averageViewDuration',
      'views',
      'likes',
      'comments',
      'subscribersGained',
      'estimatedRevenue',
      'trafficSource',
      'topGeography',
      'deviceType',
      'returningViewers',
      'newViewers'
    ]
  });
}
