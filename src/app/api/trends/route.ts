import { NextResponse } from 'next/server';
import { trendInput } from '@/lib/validators';
import { scoreTrend } from '@/lib/trend-radar';
import { TREND_SOURCES } from '@/lib/trend-sources';
import { rateLimit, clientKey } from '@/lib/rate-limit';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({ sources: TREND_SOURCES });
}

export async function POST(request: Request) {
  const limit = rateLimit(`trends:${clientKey(request.headers)}`, { capacity: 60, windowMs: 60_000 });
  if (!limit.allowed) return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = trendInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const result = scoreTrend(parsed.data);
  return NextResponse.json({ trend: result });
}
