import { NextResponse } from 'next/server';
import { videoPlanInput } from '@/lib/validators';
import { planVideoAssembly } from '@/lib/video-assembler';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = videoPlanInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ plan: planVideoAssembly(parsed.data) });
}
