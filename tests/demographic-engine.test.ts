import { describe, expect, it } from 'vitest';
import { analyzeDemographics } from '@/lib/demographic-engine';

describe('demographic engine', () => {
  it('returns a primary audience and a different secondary audience', () => {
    const a = analyzeDemographics({ topic: 'index funds explained', niche: 'personal finance', region: 'US', language: 'en', monetizationGoal: 'affiliate' });
    expect(a.bestAudience).toBeDefined();
    expect(a.secondaryAudience).toBeDefined();
    expect(a.bestAudience).not.toBe(a.secondaryAudience);
    expect(a.usFit).toBeGreaterThanOrEqual(60);
  });

  it('weights international for non-US regions', () => {
    const a = analyzeDemographics({ topic: 'learn english fast', niche: 'language learning', region: 'INTL', language: 'en', monetizationGoal: 'product' });
    expect(a.internationalFit).toBeGreaterThanOrEqual(80);
  });
});
