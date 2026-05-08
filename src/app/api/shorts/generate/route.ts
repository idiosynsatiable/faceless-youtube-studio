import { NextResponse } from 'next/server';
import { shortsGenerateInput } from '@/lib/validators';
import { generateShorts } from '@/lib/shorts-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = shortsGenerateInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const concepts = generateShorts(parsed.data);
  return NextResponse.json({ shorts: concepts });
}
