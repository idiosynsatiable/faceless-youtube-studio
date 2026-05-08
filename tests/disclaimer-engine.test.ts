import { describe, expect, it } from 'vitest';
import { runDisclaimerEngine, DISCLAIMERS } from '@/lib/disclaimer-engine';

describe('disclaimer engine', () => {
  it('always returns the general disclaimer with the standard text', () => {
    const r = runDisclaimerEngine({
      flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false },
      topicFlags: []
    });
    const general = r.required.find((d) => d.key === 'general');
    expect(general?.text).toBe(DISCLAIMERS.general);
  });

  it('inserts the affiliate disclaimer when affiliate links flag is true', () => {
    const r = runDisclaimerEngine({
      flags: { hasAffiliateLinks: true, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false },
      topicFlags: []
    });
    expect(r.required.find((d) => d.key === 'affiliate')?.text).toBe(DISCLAIMERS.affiliate);
  });
});
