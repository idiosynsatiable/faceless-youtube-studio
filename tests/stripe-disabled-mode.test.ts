import { describe, expect, it, beforeEach } from 'vitest';

describe('Stripe disabled mode', () => {
  beforeEach(() => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('returns integration_disabled for the checkout flow when env vars are absent', async () => {
    const mod = await import('@/lib/billing?stripe-test=1');
    const result = mod.buildCheckoutResult('creator', 'http://localhost/success', 'http://localhost/cancel');
    expect(result.enabled).toBe(false);
    expect(result.reason).toBe('integration_disabled');
  });

  it('refuses to verify a webhook when Stripe is disabled', async () => {
    const mod = await import('@/lib/billing?stripe-test=1');
    const verification = mod.verifyStripeWebhook('payload', 't=1,v1=abcd');
    expect(verification.ok).toBe(false);
    expect(verification.reason).toBe('integration_disabled');
  });
});
