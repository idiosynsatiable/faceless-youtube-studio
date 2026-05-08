import { NextResponse } from 'next/server';
import { billingCheckoutInput } from '@/lib/validators';
import { buildCheckoutResult } from '@/lib/billing';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = billingCheckoutInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const result = buildCheckoutResult(parsed.data.tier, parsed.data.successUrl, parsed.data.cancelUrl);
  if (!result.enabled) {
    return NextResponse.json({ ok: false, ...result }, { status: 503 });
  }
  if (result.reason === 'invalid_tier') {
    return NextResponse.json({ ok: false, ...result }, { status: 400 });
  }
  return NextResponse.json({ ok: true, ...result });
}
