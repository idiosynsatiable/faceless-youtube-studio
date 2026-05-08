import { describe, expect, it } from 'vitest';
import { generateMetadata } from '@/lib/metadata-engine';

describe('metadata engine', () => {
  it('returns a complete metadata package', () => {
    const m = generateMetadata({
      title: 'Index funds explained for first-time investors',
      niche: 'personal finance',
      audience: 'finance beginners',
      keywords: ['index fund', 'first investment'],
      hasAffiliateLinks: true,
      hasSponsor: false,
      topicFlags: ['financial']
    });
    expect(m.titleOptions.length).toBe(10);
    expect(m.description).toContain('Chapters');
    expect(m.tags.length).toBeGreaterThanOrEqual(5);
    expect(m.chapters.length).toBeGreaterThan(0);
    expect(m.pinnedComment).toContain('affiliate');
    expect(m.disclaimer.length).toBeGreaterThan(0);
  });
});
