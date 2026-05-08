import { describe, expect, it } from 'vitest';
import { FORBIDDEN_GROWTH_TACTICS } from '@/lib/growth-strategy';
import { runCompliance } from '@/lib/compliance-engine';

describe('no fake engagement', () => {
  it('lists all forbidden tactics so they are visible to creators', () => {
    expect(FORBIDDEN_GROWTH_TACTICS).toEqual(
      expect.arrayContaining([
        'Buying subscribers',
        'Buying likes',
        'Buying views',
        'Buying comments',
        'Bot networks',
        'Engagement pods',
        'Spam DMs to viewers',
        'Misleading thumbnails',
        'Impersonation'
      ])
    );
  });

  it('compliance flags scripts that mention buying engagement as high severity', () => {
    const r = runCompliance({
      scriptText: 'Buy fake subscribers to grow overnight using a bot network and engagement pod.',
      metadata: { title: 'Grow fast', description: '', tags: [] },
      flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: false, thirdPartyFootage: false }
    });
    expect(r.passed).toBe(false);
    expect(r.issues.some((i) => i.severity === 'high' && i.category === 'fake_engagement')).toBe(true);
  });
});
