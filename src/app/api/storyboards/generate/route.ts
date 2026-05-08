import { NextResponse } from 'next/server';
import { storyboardInput } from '@/lib/validators';
import { generateStoryboard } from '@/lib/storyboard-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = storyboardInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ storyboard: generateStoryboard(parsed.data) });
}
