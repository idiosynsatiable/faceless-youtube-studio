import { NextResponse } from 'next/server';
import { z } from 'zod';
import { planVoiceover } from '@/lib/voiceover-planner';

export const runtime = 'nodejs';

const schema = z.object({
  text: z.string().min(20),
  tone: z.string().default('documentary')
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ voiceover: planVoiceover(parsed.data.text, parsed.data.tone) });
}
