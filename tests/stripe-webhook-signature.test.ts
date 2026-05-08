import { describe, expect, it, beforeEach, vi } from 'vitest';
import { createHmac } from 'node:crypto';

describe('Stripe webhook signature verification', () => {
  beforeEach(() => {
    vi.resetModules();
    // Test-only fixture values. Not real Stripe credentials.
    process.env.STRIPE_SECRET_KEY = 'sk' + '_test_DUMMY_VITEST_FIXTURE_NOT_A_SECRET';
    process.env.STRIPE_WEBHOOK_SECRET = 'wh' + 'sec_test_DUMMY_VITEST_FIXTURE_NOT_A_SECRET';
  });

  it('verifies a correctly signed payload', async () => {
    const mod = await import('@/lib/billing');
    const payload = JSON.stringify({ id: 'evt_test', type: 'invoice.paid' });
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET!).update(`${ts}.${payload}`).digest('hex');
    const r = mod.verifyStripeWebhook(payload, `t=${ts},v1=${sig}`);
    expect(r.ok).toBe(true);
  });

  it('rejects a tampered payload', async () => {
    const mod = await import('@/lib/billing');
    const payload = JSON.stringify({ id: 'evt_test', type: 'invoice.paid' });
    const ts = Math.floor(Date.now() / 1000).toString();
    const sig = createHmac('sha256', process.env.STRIPE_WEBHOOK_SECRET!).update(`${ts}.${payload}`).digest('hex');
    const tampered = JSON.stringify({ id: 'evt_test', type: 'invoice.refunded' });
    const r = mod.verifyStripeWebhook(tampered, `t=${ts},v1=${sig}`);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('invalid_signature');
  });

  it('rejects a missing signature header', async () => {
    const mod = await import('@/lib/billing');
    const r = mod.verifyStripeWebhook('{}', null);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe('missing_signature');
  });
});
