import { NextResponse } from 'next/server';
import { scriptInput } from '@/lib/validators';
import { generateScript } from '@/lib/script-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = scriptInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const script = generateScript(parsed.data);
  return NextResponse.json({ script });
}
