import { describe, expect, it } from 'vitest';
import { extractClips } from '@/lib/shorts-cutter';

describe('shorts cutter', () => {
  it('extracts clip-worthy moments and assigns reasons', () => {
    const text = 'Most people think index funds are boring. They are not. Myth: only stock pickers beat the market. Fact: most active managers lose. Before you try anything fancy, the simplest portfolio often wins. Step one is automating contributions. Step two is staying boring on purpose. The total market fund grew 1200% over three decades.';
    const clips = extractClips({
      sourceVideoTitle: 'Index funds',
      scriptText: text,
      audience: 'finance beginners',
      maxClips: 5
    });
    expect(clips.length).toBeGreaterThanOrEqual(3);
    const reasons = new Set(clips.map((c) => c.reasonSelected));
    expect(reasons.has('myth_vs_fact') || reasons.has('strong_claim') || reasons.has('list_point')).toBe(true);
    for (const c of clips) {
      expect(c.clipTitle).toBeTruthy();
      expect(c.clipScript).toBeTruthy();
      expect(c.expectedRetentionScore).toBeGreaterThanOrEqual(60);
      expect(c.endTimeEstimate).toBeGreaterThan(c.startTimeEstimate);
    }
  });

  it('respects the maxClips cap', () => {
    const text = Array.from({ length: 30 }, (_, i) => `Surprising number ${i * 7}% appears in this segment.`).join(' ');
    const clips = extractClips({ scriptText: text, audience: 'finance beginners', maxClips: 4 });
    expect(clips.length).toBeLessThanOrEqual(4);
  });
});
