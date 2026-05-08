import { NextResponse } from 'next/server';
import { verifyStripeWebhook } from '@/lib/billing';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!config.stripe.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'integration_disabled', detail: 'Stripe is not configured.' },
      { status: 503 }
    );
  }
  const signature = request.headers.get('stripe-signature');
  const raw = await request.text();
  const verification = verifyStripeWebhook(raw, signature);
  if (!verification.ok) {
    return NextResponse.json({ ok: false, reason: verification.reason, detail: verification.detail }, { status: 400 });
  }
  let event: unknown;
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ ok: false, reason: 'invalid_payload', detail: 'Webhook payload is not valid JSON.' }, { status: 400 });
  }
  return NextResponse.json({ ok: true, received: true, event });
}
