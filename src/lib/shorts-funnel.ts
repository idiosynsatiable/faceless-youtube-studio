// Shorts funnel. Connects a Short to its long-form anchor and to monetization
// paths with FTC-aligned disclosures.

import { runDisclaimerEngine } from './disclaimer-engine';

export type ShortsCtaType =
  | 'watch_long_form'
  | 'subscribe'
  | 'lead_magnet'
  | 'newsletter'
  | 'product_offer'
  | 'community_question'
  | 'affiliate_link';

export interface ShortsFunnelInput {
  shortTitle: string;
  shortHook?: string;
  niche: string;
  audience: string;
  longFormTitle?: string;
  longFormPlaylist?: string;
  hasAffiliateLinks?: boolean;
  hasSponsor?: boolean;
  monetizationGoal?: 'balanced' | 'affiliate' | 'sponsor' | 'product';
  channelName?: string;
  topicFlags?: string[];
}

export interface ShortsFunnelOutput {
  relatedLongForm: string;
  pinnedComment: string;
  descriptionCta: string;
  playlistRecommendation: string;
  endScreenStrategyForLongForm: string[];
  channelSubscribeCta: string;
  leadMagnetCta?: string;
  affiliateDisclosure?: string;
  monetizationPath: string;
  ctaType: ShortsCtaType;
  disclaimers: string[];
}

function inferCtaType(input: ShortsFunnelInput): ShortsCtaType {
  if (input.longFormTitle) return 'watch_long_form';
  if (input.monetizationGoal === 'affiliate' && input.hasAffiliateLinks) return 'affiliate_link';
  if (input.monetizationGoal === 'product') return 'product_offer';
  if (input.monetizationGoal === 'sponsor') return 'subscribe';
  return 'lead_magnet';
}

function pinnedComment(input: ShortsFunnelInput, ctaType: ShortsCtaType): string {
  const lines: string[] = [];
  if (input.longFormTitle) {
    lines.push(`Full video: ${input.longFormTitle} - link in description.`);
  }
  if (ctaType === 'lead_magnet') {
    lines.push(`Free ${input.niche} starter checklist for ${input.audience} - link in description.`);
  }
  if (input.hasAffiliateLinks) {
    lines.push('Some description links may be affiliate links. The channel may earn a commission at no extra cost to you.');
  }
  if (input.hasSponsor) {
    lines.push('This video includes a paid sponsorship that is clearly disclosed.');
  }
  if (lines.length === 0) {
    lines.push('Sources for this Short are listed in the description.');
  }
  return lines.join('\n');
}

function descriptionCta(input: ShortsFunnelInput, ctaType: ShortsCtaType): string {
  switch (ctaType) {
    case 'watch_long_form':
      return `Watch the full video on ${input.longFormTitle}.`;
    case 'lead_magnet':
      return `Free ${input.niche} starter checklist for ${input.audience} - signup link.`;
    case 'newsletter':
      return `Weekly recap newsletter for ${input.audience}.`;
    case 'product_offer':
      return `${input.niche} templates for ${input.audience} - link in description.`;
    case 'community_question':
      return `Comment your toughest ${input.niche} question for next week's video.`;
    case 'affiliate_link':
      return `Tools we vetted are linked with a clear affiliate disclosure.`;
    case 'subscribe':
      return 'Subscribe for the next episode in this series.';
  }
}

function endScreenStrategy(input: ShortsFunnelInput): string[] {
  return [
    `Link to long-form: ${input.longFormTitle ?? 'next episode in this series'}`,
    `Playlist: ${input.longFormPlaylist ?? input.niche + ' essentials'}`,
    'Subscribe button visible for the last 5 seconds',
    'Optional: a single channel poster card'
  ];
}

function affiliateDisclosure(input: ShortsFunnelInput): string | undefined {
  if (!input.hasAffiliateLinks) return undefined;
  return `${input.channelName ?? 'The channel'} may earn a commission at no extra cost to you when you use the affiliate links in the description. We only recommend tools we have used and would still recommend without a commission.`;
}

function monetizationPath(input: ShortsFunnelInput, ctaType: ShortsCtaType): string {
  if (ctaType === 'affiliate_link') return 'Shorts -> long-form -> description affiliate link with disclosure';
  if (ctaType === 'product_offer') return 'Shorts -> long-form -> creator product CTA';
  if (ctaType === 'lead_magnet') return 'Shorts -> long-form -> lead magnet -> email follow-up sequence';
  if (ctaType === 'subscribe') return 'Shorts -> long-form -> sponsor segment in long-form -> subscribe CTA';
  return 'Shorts -> long-form anchor in pinned comment and description';
}

function disclaimers(input: ShortsFunnelInput, topicFlags: string[]): string[] {
  const r = runDisclaimerEngine({
    flags: {
      hasAffiliateLinks: Boolean(input.hasAffiliateLinks),
      hasSponsor: Boolean(input.hasSponsor),
      aiGeneratedContent: true,
      thirdPartyFootage: false
    },
    topicFlags
  });
  return r.required.map((d) => d.text);
}

export function planShortsFunnel(input: ShortsFunnelInput): ShortsFunnelOutput {
  const ctaType = inferCtaType(input);
  const topicFlags = input.topicFlags ?? [];
  return {
    relatedLongForm: input.longFormTitle ?? `Schedule a long-form follow-up for "${input.shortTitle}" if it performs.`,
    pinnedComment: pinnedComment(input, ctaType),
    descriptionCta: descriptionCta(input, ctaType),
    playlistRecommendation: input.longFormPlaylist ?? `${input.niche} essentials`,
    endScreenStrategyForLongForm: endScreenStrategy(input),
    channelSubscribeCta: `Subscribe if calmer, sourced ${input.niche} explainers help.`,
    leadMagnetCta: ctaType === 'lead_magnet' ? `${input.niche} starter checklist for ${input.audience}` : undefined,
    affiliateDisclosure: affiliateDisclosure(input),
    monetizationPath: monetizationPath(input, ctaType),
    ctaType,
    disclaimers: disclaimers(input, topicFlags)
  };
}
