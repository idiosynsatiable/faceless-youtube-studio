import { NextResponse } from 'next/server';
import { shortsFunnelInputSchema } from '@/lib/validators';
import { planShortsFunnel } from '@/lib/shorts-funnel';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = shortsFunnelInputSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ funnel: planShortsFunnel(parsed.data) });
}
