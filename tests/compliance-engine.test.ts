import { describe, expect, it } from 'vitest';
import { runCompliance } from '@/lib/compliance-engine';

describe('compliance engine', () => {
  it('triggers financial, affiliate, and ai disclaimers', () => {
    const r = runCompliance({
      scriptText: 'In this video we discuss tax considerations and crypto basics. Some links may be affiliate links.',
      metadata: { title: 'Crypto basics for beginners', description: 'Some links may be affiliate links.', tags: ['crypto'] },
      flags: { hasAffiliateLinks: true, hasSponsor: false, aiGeneratedContent: true, thirdPartyFootage: false }
    });
    expect(r.topicFlags).toContain('financial');
    expect(r.triggeredKeys).toContain('financial');
    expect(r.triggeredKeys).toContain('affiliate');
    expect(r.triggeredKeys).toContain('ai_content');
    expect(r.triggeredKeys).toContain('investment_risk');
  });

  it('triggers medical and legal disclaimers when topics appear', () => {
    const r = runCompliance({
      scriptText: 'A doctor would say to verify with your healthcare professional. Legal advice should come from an attorney.',
      metadata: { title: 'Medical and legal information for travelers', description: '', tags: [] },
      flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false }
    });
    expect(r.triggeredKeys).toContain('medical');
    expect(r.triggeredKeys).toContain('legal');
  });

  it('triggers a no-guaranteed-results disclaimer always', () => {
    const r = runCompliance({
      scriptText: 'A neutral, friendly explainer about productivity habits.',
      metadata: { title: 'Productivity habits', description: '', tags: [] },
      flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false }
    });
    expect(r.triggeredKeys).toContain('no_guaranteed_results');
    expect(r.triggeredKeys).toContain('general');
  });

  it('flags fake-engagement language as a high-severity issue', () => {
    const r = runCompliance({
      scriptText: 'You can buy subscribers from this site to grow fast.',
      metadata: { title: 'How to grow fast', description: '', tags: [] },
      flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false }
    });
    expect(r.passed).toBe(false);
    expect(r.issues.some((i) => i.severity === 'high' && i.category === 'fake_engagement')).toBe(true);
  });
});
