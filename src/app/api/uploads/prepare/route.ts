import { NextResponse } from 'next/server';
import { uploadPrepareInput } from '@/lib/validators';
import { preparePackage } from '@/lib/youtube-upload';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = uploadPrepareInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const pkg = preparePackage(parsed.data);
  return NextResponse.json({ ok: true, package: pkg });
}
