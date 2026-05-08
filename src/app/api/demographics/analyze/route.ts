import { NextResponse } from 'next/server';
import { demographicInput } from '@/lib/validators';
import { analyzeDemographics } from '@/lib/demographic-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = demographicInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const result = analyzeDemographics(parsed.data);
  return NextResponse.json({ demographics: result });
}
