// Monetization engine. Returns a complete revenue plan, affiliate plan,
// sponsor plan, product ladder, and the first 10-user / first-10 strategy.

import type { MonetizationInput } from './validators';

export interface RevenueStream {
  name: string;
  description: string;
  fitScore: number;
  effort: 'low' | 'medium' | 'high';
  monthsToMaterial: number;
}

export interface MonetizationPlan {
  primaryPath: string;
  secondaryPath: string;
  revenueStreams: RevenueStream[];
  ctaStrategy: string[];
  affiliatePlan: { categories: string[]; firstTenAdvertisers: string[]; placement: string };
  sponsorPlan: { firstTenSponsorTargets: string[]; pitchOutline: string[]; pricingFrameworkUsd: string };
  emailFunnel: { leadMagnetIdea: string; capturePoint: string; followupSequence: string[] };
  productLadder: { tier: string; offer: string; priceUsd: string; goal: string }[];
  firstTenSponsorTargets: string[];
  firstTenAffiliateCategories: string[];
  revenueReadinessScore: number;
  policyNotes: string[];
}

const STREAMS: Omit<RevenueStream, 'fitScore'>[] = [
  { name: 'YouTube Partner Program', description: 'Ad revenue once eligibility thresholds are met', effort: 'low', monthsToMaterial: 6 },
  { name: 'Affiliate links', description: 'Commission when viewers buy via tracked links', effort: 'medium', monthsToMaterial: 2 },
  { name: 'Sponsorships', description: 'Paid placements in matching videos', effort: 'medium', monthsToMaterial: 4 },
  { name: 'Digital products', description: 'Templates, ebooks, notion packs', effort: 'medium', monthsToMaterial: 3 },
  { name: 'Lead magnets', description: 'Free downloadable that grows email list', effort: 'low', monthsToMaterial: 1 },
  { name: 'Email list', description: 'Owned channel for direct viewer relationships', effort: 'low', monthsToMaterial: 1 },
  { name: 'Paid newsletter', description: 'Subscription newsletter for power viewers', effort: 'medium', monthsToMaterial: 6 },
  { name: 'Memberships', description: 'YouTube channel memberships or Patreon', effort: 'medium', monthsToMaterial: 6 },
  { name: 'Templates', description: 'Reusable templates sold as a one-time product', effort: 'low', monthsToMaterial: 2 },
  { name: 'Courses', description: 'Self-paced course tied to channel framework', effort: 'high', monthsToMaterial: 6 },
  { name: 'Consulting funnel', description: 'High-ticket consulting to qualified viewers', effort: 'high', monthsToMaterial: 4 },
  { name: 'Productized services', description: 'Defined-scope offers at a fixed price', effort: 'medium', monthsToMaterial: 3 },
  { name: 'Tool promotion', description: 'Promote owned or partner tool', effort: 'medium', monthsToMaterial: 3 },
  { name: 'Community offers', description: 'Paid community or workshop offers', effort: 'medium', monthsToMaterial: 5 },
  { name: 'Licensing content packages', description: 'License the channel framework to partners', effort: 'high', monthsToMaterial: 9 }
];

function fitFor(stream: string, niche: string, audience: string, goal: string): number {
  const n = niche.toLowerCase();
  const a = audience.toLowerCase();
  let score = 60;
  if (stream === 'Affiliate links') {
    if (/finance|tech|software|side hustle|business/.test(n)) score += 25;
    if (goal === 'affiliate') score += 10;
  }
  if (stream === 'Sponsorships') {
    if (/business|tech|finance|productivity/.test(n)) score += 20;
    if (goal === 'sponsor') score += 10;
  }
  if (stream === 'Digital products' || stream === 'Templates' || stream === 'Courses') {
    if (a.includes('side hustlers') || a.includes('creators') || a.includes('entrepreneurs') || a.includes('students')) score += 15;
    if (goal === 'product') score += 10;
  }
  if (stream === 'Email list' || stream === 'Lead magnets') score += 10;
  if (stream === 'YouTube Partner Program') {
    if (audience.includes('international English learners')) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function affiliateCategories(niche: string): string[] {
  const n = niche.toLowerCase();
  if (/finance|money|invest/.test(n)) return [
    'Brokerage onboarding bonuses',
    'Personal finance apps',
    'Tax software',
    'Banking tools',
    'Credit monitoring',
    'Budget templates',
    'Bookkeeping software',
    'Investing newsletters',
    'Educational courses on finance',
    'High-yield savings comparisons'
  ];
  if (/tech|software|ai/.test(n)) return [
    'Productivity software',
    'AI assistants',
    'Note-taking apps',
    'Code editors and IDEs',
    'Cloud hosting credits',
    'Domain registrars',
    'Email tools',
    'Analytics platforms',
    'Backup tools',
    'Security tools'
  ];
  if (/health|fitness/.test(n)) return [
    'Fitness equipment',
    'Wearable trackers',
    'Nutrition apps',
    'Education platforms',
    'Mindfulness apps',
    'Recovery tools',
    'Supplements with disclaimers',
    'Recipe books',
    'Hydration trackers',
    'Sleep tools'
  ];
  if (/business|side hustle|entrepreneur/.test(n)) return [
    'CRM software',
    'Bookkeeping platforms',
    'Web hosting',
    'Email automation',
    'Course platforms',
    'Project management tools',
    'Print on demand platforms',
    'E-commerce tools',
    'Marketing analytics',
    'AI assistants'
  ];
  return [
    'Note-taking apps',
    'Productivity tools',
    'Online courses',
    'Books recommended in videos',
    'Software trials',
    'Audiobook services',
    'Newsletter services',
    'Gear used to produce the channel',
    'Fonts and design assets',
    'Stock media subscriptions'
  ];
}

function firstTenSponsorTargets(niche: string): string[] {
  const generic = [
    'Productivity SaaS company in your topic adjacent space',
    'Newsletter platform that targets your audience',
    'Course platform serving your audience',
    'Tool that solves a problem you cover often',
    'Hosting or domain provider relevant to creators',
    'Education platform aligned with your niche',
    'Software with a free tier and clear funnel',
    'Direct-to-consumer brand whose audience overlaps',
    'Mid-market B2B tool that needs creator distribution',
    'AI assistant or workflow tool with creator program'
  ];
  return generic;
}

function ctaStrategy(goal: string): string[] {
  const list = [
    'One soft CTA inside intro after the promise',
    'One value-add CTA mid-video tied to the lesson',
    'One end-screen CTA pointing to next video and lead magnet',
    'Pinned comment with link plus full disclosure'
  ];
  if (goal === 'affiliate') list.push('Description includes vetted affiliate links with clear disclosure block');
  if (goal === 'sponsor') list.push('Sponsor segment within first 60 seconds, clearly disclosed');
  if (goal === 'product') list.push('Direct CTA to creator product with case-study evidence');
  return list;
}

function productLadder(audience: string): { tier: string; offer: string; priceUsd: string; goal: string }[] {
  return [
    { tier: 'Free', offer: `Lead magnet PDF for ${audience}`, priceUsd: '$0', goal: 'Capture email and qualify interest' },
    { tier: 'Tripwire', offer: 'Templates pack', priceUsd: '$9', goal: 'Convert email list to first-time buyers' },
    { tier: 'Core', offer: 'Self-paced course', priceUsd: '$49', goal: 'Teach the framework in depth' },
    { tier: 'Premium', offer: 'Workshop or paid newsletter', priceUsd: '$199', goal: 'High intent learners' },
    { tier: 'High touch', offer: 'Productized service or consulting day', priceUsd: '$1,200', goal: 'Hands-on outcome with the creator' }
  ];
}

function readinessScore(input: MonetizationInput): number {
  let s = 50;
  if (input.channelSizeTier === 'small') s += 10;
  if (input.channelSizeTier === 'mid') s += 25;
  if (input.channelSizeTier === 'established') s += 35;
  if (input.region.toUpperCase() === 'US') s += 5;
  return Math.max(0, Math.min(100, s));
}

const POLICY_NOTES: string[] = [
  'No fake engagement, bot subscribers, fake likes, fake comments, or view manipulation',
  'No incentivized engagement schemes',
  'No reused content without transformation',
  'No copyright theft',
  'No deceptive metadata',
  'No spam uploading',
  'No scraped content compilations without original value'
];

export function planMonetization(input: MonetizationInput): MonetizationPlan {
  const ranked = STREAMS.map((s) => ({
    ...s,
    fitScore: fitFor(s.name, input.niche, input.audience, input.monetizationGoal)
  })).sort((a, b) => b.fitScore - a.fitScore);
  return {
    primaryPath: ranked[0].name,
    secondaryPath: ranked[1].name,
    revenueStreams: ranked,
    ctaStrategy: ctaStrategy(input.monetizationGoal),
    affiliatePlan: {
      categories: affiliateCategories(input.niche),
      firstTenAdvertisers: affiliateCategories(input.niche),
      placement: 'Description with disclosure block plus pinned comment with full disclosure'
    },
    sponsorPlan: {
      firstTenSponsorTargets: firstTenSponsorTargets(input.niche),
      pitchOutline: [
        'Subject line summarizing audience match',
        '1-line creator credentials',
        'Audience description (size, demographics, intent)',
        'Last-30-day metrics from public analytics',
        'Proposed sponsor segment placement and length',
        'Disclosure language to be used',
        'Reference videos that show similar segment quality',
        'Pricing options (flat fee, CPM, performance)',
        'Timeline and exclusivity'
      ],
      pricingFrameworkUsd: 'Suggested CPM range $20-$45 for engaged niche audiences. Adjust by topic, region, and exclusivity.'
    },
    emailFunnel: {
      leadMagnetIdea: `${input.niche} starter checklist for ${input.audience}`,
      capturePoint: 'Pinned comment, description, end-screen CTA',
      followupSequence: [
        'Day 0: deliver the lead magnet and set expectations',
        'Day 2: share the related framework video with one new insight',
        'Day 5: case study email tied to the lead magnet',
        'Day 8: low-ticket offer relevant to the topic',
        'Day 12: re-engagement email with a single useful tip',
        'Day 15: invitation to the core course or community'
      ]
    },
    productLadder: productLadder(input.audience),
    firstTenSponsorTargets: firstTenSponsorTargets(input.niche),
    firstTenAffiliateCategories: affiliateCategories(input.niche),
    revenueReadinessScore: readinessScore(input),
    policyNotes: POLICY_NOTES
  };
}
