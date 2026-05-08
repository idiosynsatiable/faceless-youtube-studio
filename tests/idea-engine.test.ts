import { describe, expect, it } from 'vitest';
import { generateIdeas } from '@/lib/idea-engine';

describe('idea engine', () => {
  it('produces the requested number of ideas with required fields', () => {
    const ideas = generateIdeas({
      niche: 'personal finance',
      audience: 'finance beginners',
      region: 'US',
      language: 'en',
      monetizationGoal: 'affiliate',
      count: 8
    });
    expect(ideas).toHaveLength(8);
    for (const idea of ideas) {
      expect(idea.title).toBeTruthy();
      expect(idea.hook).toBeTruthy();
      expect(idea.format).toBeTruthy();
      expect(idea.disclaimerNeeds).toContain('general');
    }
  });

  it('flags financial topics with a financial disclaimer requirement', () => {
    const ideas = generateIdeas({
      niche: 'investing',
      audience: 'finance beginners',
      region: 'US',
      language: 'en',
      monetizationGoal: 'affiliate',
      count: 4,
      topics: ['How to invest in index funds with $500']
    });
    const titles = ideas.map((i) => i.title);
    expect(titles.some((t) => /index funds/i.test(t) || /invest/i.test(t))).toBe(true);
    for (const idea of ideas) {
      expect(idea.disclaimerNeeds).toContain('financial');
    }
  });
});
