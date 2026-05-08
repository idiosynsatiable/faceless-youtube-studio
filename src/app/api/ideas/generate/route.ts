import { NextResponse } from 'next/server';
import { ideaInput } from '@/lib/validators';
import { generateIdeas } from '@/lib/idea-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = ideaInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const ideas = generateIdeas(parsed.data);
  return NextResponse.json({ ideas });
}
