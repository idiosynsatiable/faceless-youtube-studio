// Stripe billing abstraction. Disabled-safe by default.
// Webhook signature verification uses HMAC SHA-256 with constant-time comparison.

import { createHmac, timingSafeEqual } from 'node:crypto';
import { config } from './config';

export type Tier = 'free' | 'creator' | 'studio' | 'agency' | 'enterprise';

export interface CheckoutResult {
  enabled: boolean;
  reason?: 'integration_disabled' | 'invalid_tier';
  url?: string;
  message: string;
}

export function buildCheckoutResult(tier: Tier, successUrl: string, cancelUrl: string): CheckoutResult {
  if (!config.stripe.enabled) {
    return {
      enabled: false,
      reason: 'integration_disabled',
      message: 'Stripe is disabled because STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET is not configured.'
    };
  }
  const priceId = ({
    creator: config.stripe.priceIds.creator,
    studio: config.stripe.priceIds.studio,
    agency: config.stripe.priceIds.agency
  } as Record<string, string>)[tier];
  if (!priceId) {
    return {
      enabled: true,
      reason: 'invalid_tier',
      message: `No Stripe price ID configured for tier ${tier}.`
    };
  }
  const params = new URLSearchParams({
    'mode': 'subscription',
    'line_items[0][price]': priceId,
    'line_items[0][quantity]': '1',
    'success_url': successUrl,
    'cancel_url': cancelUrl
  });
  return {
    enabled: true,
    url: `https://api.stripe.com/v1/checkout/sessions?${params.toString()}`,
    message: 'Server should call Stripe with this payload to create a checkout session.'
  };
}

export interface WebhookVerificationResult {
  ok: boolean;
  reason?: 'integration_disabled' | 'missing_signature' | 'invalid_signature' | 'malformed_header';
  detail: string;
}

export function verifyStripeWebhook(rawBody: string, signatureHeader: string | null, toleranceSeconds = 300): WebhookVerificationResult {
  if (!config.stripe.enabled) {
    return { ok: false, reason: 'integration_disabled', detail: 'Stripe webhook secret is not configured.' };
  }
  if (!signatureHeader) {
    return { ok: false, reason: 'missing_signature', detail: 'Stripe-Signature header is missing.' };
  }
  const parts = signatureHeader.split(',').map((s) => s.trim());
  let timestamp = '';
  const sigs: string[] = [];
  for (const part of parts) {
    const [k, v] = part.split('=');
    if (k === 't') timestamp = v;
    if (k === 'v1') sigs.push(v);
  }
  if (!timestamp || sigs.length === 0) {
    return { ok: false, reason: 'malformed_header', detail: 'Stripe-Signature header is malformed.' };
  }
  const ts = parseInt(timestamp, 10);
  if (!Number.isFinite(ts)) {
    return { ok: false, reason: 'malformed_header', detail: 'Timestamp portion of Stripe-Signature is not numeric.' };
  }
  const ageSeconds = Math.abs(Date.now() / 1000 - ts);
  if (ageSeconds > toleranceSeconds) {
    return { ok: false, reason: 'invalid_signature', detail: 'Webhook timestamp is outside tolerance window.' };
  }
  const payload = `${timestamp}.${rawBody}`;
  const expected = createHmac('sha256', config.stripe.webhookSecret).update(payload, 'utf8').digest('hex');
  const expectedBuf = Buffer.from(expected, 'hex');
  for (const sig of sigs) {
    let buf: Buffer;
    try {
      buf = Buffer.from(sig, 'hex');
    } catch {
      continue;
    }
    if (buf.length === expectedBuf.length && timingSafeEqual(buf, expectedBuf)) {
      return { ok: true, detail: 'Stripe signature verified.' };
    }
  }
  return { ok: false, reason: 'invalid_signature', detail: 'No provided signature matched the expected HMAC.' };
}
