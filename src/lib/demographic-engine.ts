// Demographic intelligence engine. Maps a topic + niche to audience segments
// with US and international fit, content fit, and monetization fit.

import type { DemographicInput } from './validators';

export interface DemographicAnalysis {
  bestAudience: string;
  secondaryAudience: string;
  ageBands: string[];
  region: string;
  language: string;
  incomeIntent: 'low' | 'mid' | 'high';
  educationLevel: 'general' | 'curious' | 'advanced';
  consumerIntent: 'browse' | 'compare' | 'buy';
  lifestyleInterests: string[];
  problemAwareness: 'unaware' | 'aware' | 'solution-aware' | 'product-aware';
  buyingReadiness: number;
  platformBehavior: string[];
  shortVsLongFit: { long: number; short: number };
  usFit: number;
  internationalFit: number;
  painPoints: string[];
  curiosityTriggers: string[];
  objections: string[];
  preferredTone: string;
  videoLengthMinutes: { min: number; max: number };
  thumbnailStyle: string;
  monetizationFit: { display: number; affiliate: number; sponsor: number; product: number };
  audienceFitScore: number;
}

const SEGMENTS = [
  'students',
  'side hustlers',
  'parents',
  'tech enthusiasts',
  'finance beginners',
  'entrepreneurs',
  'gamers',
  'health-conscious viewers',
  'self-improvement viewers',
  'entertainment viewers',
  'local business owners',
  'creators',
  'job seekers',
  'retirees',
  'international English learners'
];

function pickPrimary(topic: string, niche: string): string {
  const t = `${topic} ${niche}`.toLowerCase();
  if (/(invest|stock|crypto|finance|money|saving|tax|loan)/.test(t)) return 'finance beginners';
  if (/(side hustle|make money|extra income|freelance)/.test(t)) return 'side hustlers';
  if (/(startup|founder|entrepreneur|business model)/.test(t)) return 'entrepreneurs';
  if (/(health|fitness|nutrition|diet|sleep)/.test(t)) return 'health-conscious viewers';
  if (/(parenting|kids|family|baby)/.test(t)) return 'parents';
  if (/(student|study|college|exam|school)/.test(t)) return 'students';
  if (/(career|resume|job|interview)/.test(t)) return 'job seekers';
  if (/(game|gaming|esports)/.test(t)) return 'gamers';
  if (/(creator|youtube|content|filmmaking)/.test(t)) return 'creators';
  if (/(retire|pension|senior)/.test(t)) return 'retirees';
  if (/(local|small business|main street)/.test(t)) return 'local business owners';
  if (/(esl|learn english|language)/.test(t)) return 'international English learners';
  if (/(ai|software|gadget|tech)/.test(t)) return 'tech enthusiasts';
  if (/(self|productivity|habit|mindset|growth)/.test(t)) return 'self-improvement viewers';
  return 'self-improvement viewers';
}

function pickSecondary(primary: string): string {
  const fallback = SEGMENTS.find((s) => s !== primary);
  if (primary === 'finance beginners') return 'side hustlers';
  if (primary === 'side hustlers') return 'entrepreneurs';
  if (primary === 'entrepreneurs') return 'creators';
  if (primary === 'self-improvement viewers') return 'students';
  if (primary === 'students') return 'job seekers';
  if (primary === 'creators') return 'side hustlers';
  if (primary === 'tech enthusiasts') return 'creators';
  return fallback || 'self-improvement viewers';
}

function ageBands(primary: string): string[] {
  switch (primary) {
    case 'students':
      return ['18-24'];
    case 'side hustlers':
    case 'creators':
    case 'self-improvement viewers':
      return ['18-34'];
    case 'entrepreneurs':
    case 'job seekers':
    case 'tech enthusiasts':
      return ['25-44'];
    case 'parents':
      return ['25-44'];
    case 'finance beginners':
      return ['18-44'];
    case 'health-conscious viewers':
      return ['25-54'];
    case 'retirees':
      return ['55+'];
    case 'local business owners':
      return ['35-64'];
    case 'international English learners':
      return ['18-34'];
    default:
      return ['18-44'];
  }
}

function incomeIntent(primary: string): 'low' | 'mid' | 'high' {
  if (['students', 'international English learners', 'side hustlers'].includes(primary)) return 'low';
  if (['entrepreneurs', 'tech enthusiasts', 'local business owners', 'creators'].includes(primary)) return 'high';
  return 'mid';
}

function educationLevel(primary: string): 'general' | 'curious' | 'advanced' {
  if (['entrepreneurs', 'tech enthusiasts', 'creators'].includes(primary)) return 'advanced';
  if (['finance beginners', 'self-improvement viewers', 'side hustlers', 'parents'].includes(primary)) return 'curious';
  return 'general';
}

function painPoints(primary: string): string[] {
  switch (primary) {
    case 'finance beginners':
      return ['confusing jargon', 'fear of losing money', 'choosing first account or app', 'distrust of advice'];
    case 'side hustlers':
      return ['low time availability', 'unclear first step', 'shiny-object distraction', 'income inconsistency'];
    case 'entrepreneurs':
      return ['hiring', 'cash flow', 'positioning', 'distribution'];
    case 'tech enthusiasts':
      return ['feature overload', 'time to learn', 'workflow integration', 'cost'];
    case 'parents':
      return ['lack of time', 'screen time worry', 'reliable answers', 'budget pressure'];
    case 'creators':
      return ['ideation fatigue', 'algorithm volatility', 'editing time', 'monetization timing'];
    case 'students':
      return ['focus and motivation', 'study methods', 'note systems', 'exam stress'];
    case 'job seekers':
      return ['resume noise', 'interview anxiety', 'salary negotiation', 'networking'];
    case 'health-conscious viewers':
      return ['too many opinions', 'time for routines', 'tracking accuracy', 'sustainable habits'];
    case 'self-improvement viewers':
      return ['inconsistency', 'overwhelm', 'unclear identity', 'comparison'];
    case 'gamers':
      return ['skill plateaus', 'gear ROI', 'time vs reward', 'community drama'];
    case 'retirees':
      return ['safe income', 'healthcare costs', 'staying engaged', 'family support'];
    case 'local business owners':
      return ['marketing budget', 'local visibility', 'staff retention', 'pricing'];
    default:
      return ['time scarcity', 'information overload', 'trust', 'execution'];
  }
}

function curiosityTriggers(primary: string): string[] {
  return [
    `Counter-intuitive truth about ${primary}`,
    `What people get wrong every time`,
    `Numbers that change the decision`,
    `Process most viewers never see`
  ];
}

function objections(primary: string): string[] {
  const generic = ['Too good to be true', 'Hard to act on', 'Wrong for my situation'];
  if (primary === 'finance beginners') generic.push('Sounds like financial advice without a license');
  if (primary === 'health-conscious viewers') generic.push('Sounds like medical advice without a license');
  return generic;
}

function preferredTone(primary: string): string {
  if (['entrepreneurs', 'tech enthusiasts'].includes(primary)) return 'analytical';
  if (['finance beginners', 'students', 'parents'].includes(primary)) return 'calm educational';
  if (['side hustlers', 'creators'].includes(primary)) return 'high-retention YouTube';
  if (primary === 'gamers') return 'energetic';
  return 'documentary';
}

function lengthRecommendation(primary: string): { min: number; max: number } {
  if (['side hustlers', 'creators', 'gamers'].includes(primary)) return { min: 6, max: 10 };
  if (['students', 'self-improvement viewers'].includes(primary)) return { min: 7, max: 12 };
  if (['entrepreneurs', 'tech enthusiasts'].includes(primary)) return { min: 9, max: 16 };
  return { min: 6, max: 12 };
}

function thumbnailStyle(primary: string): string {
  if (['gamers', 'side hustlers'].includes(primary)) return 'high-contrast text + bold object';
  if (['entrepreneurs', 'tech enthusiasts'].includes(primary)) return 'clean infographic with one strong number';
  if (['finance beginners', 'parents', 'health-conscious viewers'].includes(primary)) return 'calm trustworthy with concept icon';
  return 'editorial documentary still';
}

function monetizationFit(primary: string) {
  switch (primary) {
    case 'finance beginners':
      return { display: 60, affiliate: 80, sponsor: 75, product: 70 };
    case 'side hustlers':
      return { display: 55, affiliate: 90, sponsor: 70, product: 80 };
    case 'entrepreneurs':
      return { display: 60, affiliate: 70, sponsor: 80, product: 90 };
    case 'tech enthusiasts':
      return { display: 70, affiliate: 85, sponsor: 80, product: 65 };
    case 'creators':
      return { display: 60, affiliate: 80, sponsor: 70, product: 85 };
    case 'health-conscious viewers':
      return { display: 55, affiliate: 70, sponsor: 70, product: 80 };
    default:
      return { display: 55, affiliate: 60, sponsor: 60, product: 65 };
  }
}

function buyingReadiness(primary: string): number {
  switch (primary) {
    case 'entrepreneurs':
    case 'local business owners':
    case 'tech enthusiasts':
      return 75;
    case 'side hustlers':
    case 'creators':
    case 'finance beginners':
      return 65;
    case 'students':
    case 'international English learners':
      return 35;
    default:
      return 50;
  }
}

function usFit(input: DemographicInput): number {
  if (input.region.toUpperCase() === 'US') return 90;
  return 60;
}

function internationalFit(input: DemographicInput, primary: string): number {
  if (input.region.toUpperCase() !== 'US') return 90;
  if (primary === 'international English learners') return 95;
  if (['students', 'self-improvement viewers', 'tech enthusiasts'].includes(primary)) return 80;
  return 60;
}

function platformBehavior(primary: string): string[] {
  if (primary === 'gamers') return ['watches Shorts', 'streams nightly', 'discord communities'];
  if (primary === 'students') return ['mobile-first', 'short attention', 'study with video on'];
  if (primary === 'creators') return ['research videos', 'cross-post Shorts', 'reads comments'];
  return ['watches at home', 'desktop and mobile mix', 'subscribes to weekly creators'];
}

function audienceFitScore(input: DemographicInput, primary: string): number {
  const tone = preferredTone(primary);
  let score = 70;
  if (input.monetizationGoal === 'affiliate' && monetizationFit(primary).affiliate >= 80) score += 10;
  if (input.monetizationGoal === 'sponsor' && monetizationFit(primary).sponsor >= 75) score += 10;
  if (input.monetizationGoal === 'product' && monetizationFit(primary).product >= 80) score += 10;
  if (tone === 'documentary') score += 5;
  return Math.max(0, Math.min(100, score));
}

export function analyzeDemographics(input: DemographicInput): DemographicAnalysis {
  const primary = pickPrimary(input.topic, input.niche);
  const secondary = pickSecondary(primary);
  return {
    bestAudience: primary,
    secondaryAudience: secondary,
    ageBands: ageBands(primary),
    region: input.region,
    language: input.language,
    incomeIntent: incomeIntent(primary),
    educationLevel: educationLevel(primary),
    consumerIntent: incomeIntent(primary) === 'high' ? 'buy' : incomeIntent(primary) === 'mid' ? 'compare' : 'browse',
    lifestyleInterests: ['internet culture', 'self-improvement', 'productivity'],
    problemAwareness: 'aware',
    buyingReadiness: buyingReadiness(primary),
    platformBehavior: platformBehavior(primary),
    shortVsLongFit: { long: 70, short: 60 },
    usFit: usFit(input),
    internationalFit: internationalFit(input, primary),
    painPoints: painPoints(primary),
    curiosityTriggers: curiosityTriggers(primary),
    objections: objections(primary),
    preferredTone: preferredTone(primary),
    videoLengthMinutes: lengthRecommendation(primary),
    thumbnailStyle: thumbnailStyle(primary),
    monetizationFit: monetizationFit(primary),
    audienceFitScore: audienceFitScore(input, primary)
  };
}
