import { describe, expect, it } from 'vitest';
import { generateShorts } from '@/lib/shorts-engine';

describe('shorts engine', () => {
  it('generates concepts with required fields', () => {
    const concepts = generateShorts({
      niche: 'personal finance',
      audience: 'finance beginners',
      formats: ['quick_hook_15s', 'mini_explainer_30s', 'high_retention_60s'],
      count: 3,
      hasAffiliateLinks: true,
      topicFlags: ['financial']
    });
    expect(concepts).toHaveLength(3);
    for (const c of concepts) {
      expect(c.shortTitle).toBeTruthy();
      expect(c.hook).toBeTruthy();
      expect(c.script.beats.length).toBeGreaterThan(0);
      expect(c.visualPlan.aspectRatio).toBe('9:16');
      expect(c.captionPlan.shortLines.length).toBeGreaterThan(0);
      expect(c.hashtags.length).toBeGreaterThanOrEqual(3);
      expect(c.disclaimers.length).toBeGreaterThan(0);
      expect([15, 30, 45, 60]).toContain(c.estimatedDurationSeconds);
      expect(c.uploadPriorityScore).toBeGreaterThanOrEqual(50);
      expect(c.uploadPriorityScore).toBeLessThanOrEqual(98);
    }
  });

  it('inserts financial disclaimer text on financial topics', () => {
    const [c] = generateShorts({
      niche: 'investing',
      audience: 'finance beginners',
      topic: 'index funds compared',
      formats: ['mini_explainer_30s'],
      count: 1,
      hasAffiliateLinks: true,
      topicFlags: ['financial']
    });
    expect(c.disclaimers.some((d) => d.toLowerCase().includes('financial'))).toBe(true);
  });

  it('does not include clickbait risk phrases in titles', () => {
    const concepts = generateShorts({
      niche: 'personal finance',
      audience: 'finance beginners',
      topic: 'index funds',
      formats: ['quick_hook_15s', 'mini_explainer_30s', 'list_style', 'three_things_you_missed'],
      count: 4
    });
    for (const c of concepts) {
      expect(/guaranteed|overnight|free money|one weird trick/i.test(c.shortTitle)).toBe(false);
    }
  });
});
