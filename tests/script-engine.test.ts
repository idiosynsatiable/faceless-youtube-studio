import { describe, expect, it } from 'vitest';
import { generateScript } from '@/lib/script-engine';

describe('script engine', () => {
  it('returns hook, intro, body sections, transitions, cta, outro, sources, fact-check checklist, disclaimer placements', () => {
    const s = generateScript({
      title: 'Index funds explained for first-time investors',
      audience: 'finance beginners',
      format: 'beginner guide',
      tone: 'calm educational',
      durationMinutes: 9,
      keyPoints: ['What an index fund is', 'Expense ratios that compound'],
      sources: [],
      flags: []
    });
    expect(s.hook.length).toBeGreaterThan(10);
    expect(s.intro.narration).toBeTruthy();
    expect(s.body.length).toBeGreaterThan(0);
    expect(s.transitions.length).toBe(s.body.length - 1);
    expect(s.cta).toBeTruthy();
    expect(s.outro).toBeTruthy();
    expect(s.sourcesNeeded.length).toBeGreaterThan(0);
    expect(s.factCheckChecklist.length).toBeGreaterThan(0);
    expect(s.disclaimerPlacements.length).toBeGreaterThan(0);
  });

  it('inserts a financial disclaimer placement when the topic is financial', () => {
    const s = generateScript({
      title: 'Investing in stocks for beginners',
      audience: 'finance beginners',
      format: 'beginner guide',
      tone: 'calm educational',
      durationMinutes: 8,
      keyPoints: ['risk tolerance', 'tax considerations'],
      sources: [],
      flags: []
    });
    expect(s.disclaimerPlacements.some((d) => d.toLowerCase().includes('financial'))).toBe(true);
  });
});
