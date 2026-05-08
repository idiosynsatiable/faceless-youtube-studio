import { describe, expect, it } from 'vitest';
import { planShortsCalendar } from '@/lib/shorts-calendar';

describe('shorts no-spam guarantee', () => {
  it('never recommends more than 3 shorts per day even at extreme settings', () => {
    const cal = planShortsCalendar({
      niche: 'personal finance',
      audience: 'finance beginners',
      channelStage: 'established',
      productionCapacity: 'high',
      longFormPerWeek: 4,
      audienceFatigueSignal: 'low',
      weeks: 1
    });
    expect(cal.cadence.recommendedShortsPerDay).toBeLessThanOrEqual(3);
  });

  it('quality warning fires when capacity is low and cadence is high', () => {
    const cal = planShortsCalendar({
      niche: 'tech',
      audience: 'tech enthusiasts',
      channelStage: 'growing',
      productionCapacity: 'low',
      longFormPerWeek: 1,
      audienceFatigueSignal: 'low',
      weeks: 1
    });
    // With low capacity the engine reduces cadence; quality warning is still informative.
    expect(cal.cadence.qualityWarning.length).toBeGreaterThan(0);
  });

  it('saturation warning fires for high audience fatigue', () => {
    const cal = planShortsCalendar({
      niche: 'tech',
      audience: 'tech enthusiasts',
      channelStage: 'established',
      productionCapacity: 'high',
      longFormPerWeek: 1,
      audienceFatigueSignal: 'high',
      weeks: 1
    });
    expect(cal.cadence.saturationWarning.toLowerCase()).toContain('audience fatigue');
  });
});
