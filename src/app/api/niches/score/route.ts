import { NextResponse } from 'next/server';
import { nicheInput } from '@/lib/validators';
import { scoreNiche } from '@/lib/niche-scorer';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = nicheInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const result = scoreNiche(parsed.data);
  return NextResponse.json({ niche: result });
}
