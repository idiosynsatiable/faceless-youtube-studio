import { describe, expect, it } from 'vitest';
import { planShortsFunnel } from '@/lib/shorts-funnel';

describe('shorts funnel', () => {
  it('routes a Short with a long-form anchor to watch_long_form CTA', () => {
    const f = planShortsFunnel({
      shortTitle: 'Index funds: myth vs fact',
      niche: 'personal finance',
      audience: 'finance beginners',
      longFormTitle: 'Index funds explained for first-time investors',
      hasAffiliateLinks: true,
      monetizationGoal: 'affiliate',
      topicFlags: ['financial']
    });
    expect(f.ctaType).toBe('watch_long_form');
    expect(f.pinnedComment).toContain('Full video');
    expect(f.affiliateDisclosure).toBeDefined();
    expect(f.disclaimers.length).toBeGreaterThan(0);
  });

  it('falls back to lead_magnet CTA when no long-form anchor and balanced goal', () => {
    const f = planShortsFunnel({
      shortTitle: 'Standalone Short',
      niche: 'self-improvement',
      audience: 'self-improvement viewers'
    });
    expect(f.ctaType).toBe('lead_magnet');
    expect(f.leadMagnetCta).toBeDefined();
  });
});
