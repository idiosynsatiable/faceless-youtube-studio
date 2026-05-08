import { describe, expect, it } from 'vitest';
import { planMonetization } from '@/lib/monetization-engine';

describe('monetization engine', () => {
  it('returns a complete plan with primary path, ladder, first 10 sponsor targets, and first 10 affiliate categories', () => {
    const p = planMonetization({
      niche: 'personal finance',
      audience: 'finance beginners',
      region: 'US',
      monetizationGoal: 'affiliate',
      channelSizeTier: 'small'
    });
    expect(p.primaryPath).toBeTruthy();
    expect(p.secondaryPath).toBeTruthy();
    expect(p.firstTenSponsorTargets).toHaveLength(10);
    expect(p.firstTenAffiliateCategories).toHaveLength(10);
    expect(p.productLadder.length).toBe(5);
    expect(p.revenueReadinessScore).toBeGreaterThanOrEqual(0);
    expect(p.revenueReadinessScore).toBeLessThanOrEqual(100);
    expect(p.policyNotes.length).toBeGreaterThan(0);
  });
});
