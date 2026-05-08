import { NextResponse } from 'next/server';
import { shortsAnalyticsInput } from '@/lib/validators';
import { analyzeShorts } from '@/lib/shorts-analytics';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = shortsAnalyticsInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ analytics: analyzeShorts(parsed.data) });
}
