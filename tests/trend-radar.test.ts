import { describe, expect, it } from 'vitest';
import { scoreTrend } from '@/lib/trend-radar';

describe('trend radar', () => {
  it('returns a structured trend record with bounded scores', () => {
    const result = scoreTrend({
      topic: 'Best low-cost index funds explained',
      region: 'US',
      language: 'en',
      source: 'youtube_suggestions'
    });
    expect(result.topic).toBe('Best low-cost index funds explained');
    expect(result.searchIntent).toBeDefined();
    for (const score of [
      result.urgencyScore,
      result.monetizationScore,
      result.competitionScore,
      result.evergreenScore,
      result.advertiserSafetyScore,
      result.trendScore
    ]) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    }
    expect(result.suggestedAngles.length).toBeGreaterThan(0);
    expect(result.suggestedFormats.length).toBeGreaterThan(0);
  });

  it('classifies a clearly commercial topic as commercial', () => {
    const r = scoreTrend({ topic: 'Best DSLR camera review under 800', region: 'US', language: 'en', source: 'manual' });
    expect(r.searchIntent).toBe('commercial');
  });
});
