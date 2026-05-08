import { describe, expect, it } from 'vitest';
import { planShortsCalendar } from '@/lib/shorts-calendar';

describe('shorts calendar', () => {
  it('returns a sustainable cadence and rejects spam-level recommendations', () => {
    const cal = planShortsCalendar({
      niche: 'personal finance',
      audience: 'finance beginners',
      channelStage: 'new',
      productionCapacity: 'low',
      longFormPerWeek: 1,
      audienceFatigueSignal: 'high',
      weeks: 2
    });
    // High fatigue + low capacity must keep cadence tight.
    expect(cal.cadence.recommendedShortsPerDay).toBeLessThanOrEqual(1);
    expect(cal.cadence.qualityWarning.length).toBeGreaterThan(0);
    expect(cal.cadence.policyNote).toMatch(/no spam/i);
    expect(cal.cadence.policyNote).toMatch(/no fake engagement/i);
  });

  it('caps growing channel cadence at 3 per day even with high capacity', () => {
    const cal = planShortsCalendar({
      niche: 'personal finance',
      audience: 'finance beginners',
      channelStage: 'growing',
      productionCapacity: 'high',
      longFormPerWeek: 2,
      weeks: 1
    });
    expect(cal.cadence.recommendedShortsPerDay).toBeLessThanOrEqual(3);
    expect(cal.daily.length).toBeGreaterThan(0);
  });

  it('warns when a topic cluster repeats too often', () => {
    const cal = planShortsCalendar({
      niche: 'personal finance',
      audience: 'finance beginners',
      channelStage: 'established',
      productionCapacity: 'medium',
      longFormPerWeek: 0,
      topicClusters: ['only one cluster'],
      weeks: 2
    });
    expect(cal.warnings.some((w) => w.toLowerCase().includes('cluster'))).toBe(true);
  });
});
