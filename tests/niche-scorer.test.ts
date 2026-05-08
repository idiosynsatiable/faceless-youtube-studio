import { describe, expect, it } from 'vitest';
import { scoreNiche } from '@/lib/niche-scorer';

describe('niche scorer', () => {
  it('labels a strong niche correctly', () => {
    const r = scoreNiche({
      niche: 'Personal finance for first jobs',
      region: 'US',
      language: 'en',
      competition: 60,
      monetization: 90,
      audienceUrgency: 70,
      retentionPotential: 80,
      advertiserSafety: 85,
      evergreen: true,
      highIntent: true,
      affiliateFit: true,
      seriesPotential: true,
      internationalScalability: true
    });
    expect(['Strong', 'Exceptional', 'Promising']).toContain(r.label);
    expect(r.score).toBeGreaterThanOrEqual(70);
  });

  it('penalizes weak niches', () => {
    const r = scoreNiche({
      niche: 'High-competition vlog',
      region: 'US',
      language: 'en',
      competition: 95,
      monetization: 30,
      audienceUrgency: 25,
      retentionPotential: 35,
      advertiserSafety: 30,
      evergreen: false,
      highIntent: false,
      affiliateFit: false,
      seriesPotential: false,
      internationalScalability: false
    });
    expect(r.label === 'Avoid' || r.label === 'Risky').toBe(true);
  });
});
