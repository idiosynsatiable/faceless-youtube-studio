// Shorts engine. Generates YouTube Shorts concepts deterministically.
// Honest packaging only. No clickbait, no fake authority, no false promises.

import { runDisclaimerEngine } from './disclaimer-engine';

export type ShortsFormat =
  | 'quick_hook_15s'
  | 'mini_explainer_30s'
  | 'story_arc_45s'
  | 'high_retention_60s'
  | 'list_style'
  | 'myth_vs_fact'
  | 'three_things_you_missed'
  | 'before_you_try_this'
  | 'market_insight'
  | 'history_timeline'
  | 'product_comparison'
  | 'finance_disclaimer_safe'
  | 'tutorial_micro_step'
  | 'long_form_teaser'
  | 'comment_response';

export interface ShortsBeat {
  range: string;
  label: string;
  text: string;
  visual: string;
  caption: string;
}

export interface ShortsScript {
  format: ShortsFormat;
  estimatedDurationSeconds: 15 | 30 | 45 | 60;
  beats: ShortsBeat[];
  fullNarration: string;
}

export interface ShortsVisualPlan {
  aspectRatio: '9:16';
  scenes: { index: number; concept: string; motion: string; assetType: string; license: string }[];
  firstFrame: string;
  pacingNotes: string[];
  textOnScreen: string;
}

export interface ShortsCaptionPlan {
  burnedIn: boolean;
  shortLines: string[];
  emphasisWords: string[];
  accessibilityNote: string;
}

export interface ShortsConcept {
  shortTitle: string;
  hook: string;
  format: ShortsFormat;
  estimatedDurationSeconds: 15 | 30 | 45 | 60;
  script: ShortsScript;
  visualPlan: ShortsVisualPlan;
  captionPlan: ShortsCaptionPlan;
  hashtags: string[];
  description: string;
  pinnedComment: string;
  targetAudience: string;
  retentionStrategy: string;
  longFormConnection: string;
  cta: string;
  disclaimers: string[];
  riskFlags: string[];
  uploadPriorityScore: number;
}

export interface ShortsEngineInput {
  niche: string;
  audience: string;
  region?: string;
  language?: string;
  topic?: string;
  longFormTitle?: string;
  longFormSummary?: string;
  monetizationGoal?: 'balanced' | 'affiliate' | 'sponsor' | 'product';
  formats?: ShortsFormat[];
  count?: number;
  hasAffiliateLinks?: boolean;
  hasSponsor?: boolean;
  aiGeneratedContent?: boolean;
  topicFlags?: string[];
}

const DEFAULT_FORMATS: ShortsFormat[] = [
  'quick_hook_15s',
  'mini_explainer_30s',
  'story_arc_45s',
  'high_retention_60s',
  'list_style',
  'myth_vs_fact',
  'three_things_you_missed',
  'before_you_try_this',
  'market_insight',
  'history_timeline',
  'product_comparison',
  'finance_disclaimer_safe',
  'tutorial_micro_step',
  'long_form_teaser',
  'comment_response'
];

const FINANCE_KEYWORDS = ['money', 'invest', 'stock', 'crypto', 'tax', 'income', 'finance', 'loan', 'side hustle'];
const MEDICAL_KEYWORDS = ['medical', 'doctor', 'health', 'symptom', 'medicine', 'mental', 'nutrition', 'diet'];
const LEGAL_KEYWORDS = ['legal', 'law', 'attorney', 'contract', 'court'];

function detectTopicFlags(haystack: string, manual: string[] = []): string[] {
  const text = haystack.toLowerCase();
  const set = new Set<string>(manual);
  if (FINANCE_KEYWORDS.some((k) => text.includes(k))) set.add('financial');
  if (MEDICAL_KEYWORDS.some((k) => text.includes(k))) set.add('medical');
  if (LEGAL_KEYWORDS.some((k) => text.includes(k))) set.add('legal');
  return Array.from(set);
}

function durationFor(format: ShortsFormat): 15 | 30 | 45 | 60 {
  switch (format) {
    case 'quick_hook_15s':
      return 15;
    case 'mini_explainer_30s':
    case 'comment_response':
    case 'three_things_you_missed':
      return 30;
    case 'story_arc_45s':
    case 'before_you_try_this':
    case 'tutorial_micro_step':
      return 45;
    default:
      return 60;
  }
}

function safeTitle(seed: string, format: ShortsFormat, longFormTitle?: string): string {
  const base = seed.trim().replace(/\s+/g, ' ').slice(0, 70);
  switch (format) {
    case 'quick_hook_15s':
      return `${base} (15-second take)`;
    case 'mini_explainer_30s':
      return `${base} - 30-second mini explainer`;
    case 'story_arc_45s':
      return `${base} in 45 seconds`;
    case 'high_retention_60s':
      return `${base} in one minute`;
    case 'list_style':
      return `5 things about ${base}`;
    case 'myth_vs_fact':
      return `${base}: myth vs fact`;
    case 'three_things_you_missed':
      return `3 things you missed about ${base}`;
    case 'before_you_try_this':
      return `Before you try this: ${base}`;
    case 'market_insight':
      return `${base}: market insight in one minute`;
    case 'history_timeline':
      return `${base} - quick history`;
    case 'product_comparison':
      return `${base}: a fair comparison`;
    case 'finance_disclaimer_safe':
      return `${base} (educational, not advice)`;
    case 'tutorial_micro_step':
      return `${base}: one micro-step`;
    case 'long_form_teaser':
      return longFormTitle ? `Why ${longFormTitle} matters` : `${base}: full story in description`;
    case 'comment_response':
      return `Answer to "${base}"`;
  }
}

function hookFor(audience: string, seed: string, format: ShortsFormat): string {
  const cleaned = seed.replace(/[?.!]+$/, '');
  switch (format) {
    case 'quick_hook_15s':
      return `${audience}: in 15 seconds, the part of "${cleaned}" most videos skip.`;
    case 'myth_vs_fact':
      return `Myth: ${cleaned} is what most people think. Fact: it isn't. Stay 5 seconds for the proof.`;
    case 'three_things_you_missed':
      return `Three things almost everyone misses about "${cleaned}". Watch for #2.`;
    case 'before_you_try_this':
      return `Before you try "${cleaned}", watch this 45-second briefing.`;
    case 'long_form_teaser':
      return `One useful idea from the full video on "${cleaned}". Description has the rest.`;
    case 'comment_response':
      return `Top comment asked: "${cleaned}". Here's the calm answer.`;
    case 'product_comparison':
      return `Two real options for ${cleaned}. Same minute. No hype.`;
    case 'market_insight':
      return `One number that changes how ${audience} should think about ${cleaned}.`;
    case 'history_timeline':
      return `Why ${cleaned} happened - in 60 seconds.`;
    case 'tutorial_micro_step':
      return `${audience}: the one micro-step that unlocks "${cleaned}".`;
    case 'finance_disclaimer_safe':
      return `Educational note for ${audience} on ${cleaned}. Not financial advice.`;
    default:
      return `For ${audience}: a calm, useful take on "${cleaned}". No hype.`;
  }
}

function beats(format: ShortsFormat, seed: string, audience: string, durationSeconds: 15 | 30 | 45 | 60): ShortsBeat[] {
  const baseBeats: ShortsBeat[] = [
    { range: '0:00-0:02', label: 'Pattern interrupt', text: hookFor(audience, seed, format), visual: 'bold first frame, single subject', caption: 'STOP - one minute of clarity' },
    { range: '0:02-0:07', label: 'Promise', text: `Here is the clear promise for ${audience}.`, visual: 'on-screen promise card', caption: 'Promise on screen' },
    { range: '0:07-0:20', label: 'Fast value', text: `One specific, verifiable point about "${seed}".`, visual: 'b-roll matching the point', caption: 'Point one' },
    { range: '0:20-0:45', label: 'Payoff or twist', text: `Concrete example or twist that earns the rest of the time.`, visual: 'cut-on-motion to example', caption: 'Example' },
    { range: '0:45-end', label: 'Clean CTA / loop', text: `Calm CTA - watch the long-form for the full story.`, visual: 'end card with one CTA', caption: 'Watch full video' }
  ];
  if (durationSeconds === 15) return baseBeats.slice(0, 3);
  if (durationSeconds === 30) return baseBeats.slice(0, 4);
  return baseBeats;
}

function fullNarration(beats: ShortsBeat[]): string {
  return beats.map((b) => b.text).join(' ');
}

function visualPlan(seed: string, format: ShortsFormat): ShortsVisualPlan {
  return {
    aspectRatio: '9:16',
    scenes: [
      { index: 1, concept: `Bold first frame for "${seed}"`, motion: 'subtle push-in', assetType: 'creator-owned footage or licensed stock', license: 'documented' },
      { index: 2, concept: 'Promise card with the audience name', motion: 'text rise', assetType: 'animated text', license: 'project-owned' },
      { index: 3, concept: 'Concrete b-roll matching the value point', motion: 'cut on motion', assetType: 'licensed stock or screen recording', license: 'documented' },
      { index: 4, concept: 'Example or visual twist', motion: 'parallax or wipe', assetType: 'data visualization or chart', license: 'project-owned' },
      { index: 5, concept: 'End card with single CTA', motion: 'static hold', assetType: 'animated text', license: 'project-owned' }
    ],
    firstFrame: `Single subject hero shot mapping to "${seed}". No clutter. No clickbait overlay.`,
    pacingNotes: [
      format === 'quick_hook_15s' ? 'Rapid cuts every 1.5s' : 'Cuts every 2-3s',
      'Keep first 2 seconds visually crisp',
      'No music sting that overpowers narration'
    ],
    textOnScreen: 'One short caption per beat. Avoid clutter.'
  };
}

function captionPlan(beats: ShortsBeat[]): ShortsCaptionPlan {
  return {
    burnedIn: true,
    shortLines: beats.map((b) => b.caption),
    emphasisWords: beats
      .map((b) => b.text)
      .join(' ')
      .split(' ')
      .filter((w) => w.length >= 7)
      .slice(0, 6),
    accessibilityNote: 'Burned-in captions with at least 4.5:1 contrast and clear sans-serif font.'
  };
}

function hashtags(niche: string, audience: string, format: ShortsFormat): string[] {
  const set = new Set<string>([
    '#shorts',
    `#${niche.replace(/\s+/g, '').toLowerCase()}`,
    `#${audience.replace(/\s+/g, '').toLowerCase()}`
  ]);
  switch (format) {
    case 'myth_vs_fact':
      set.add('#mythvsfact');
      break;
    case 'three_things_you_missed':
      set.add('#explained');
      break;
    case 'before_you_try_this':
      set.add('#beforeyoutry');
      break;
    case 'product_comparison':
      set.add('#comparison');
      break;
    case 'market_insight':
      set.add('#insight');
      break;
    default:
      set.add('#explainer');
  }
  return Array.from(set).slice(0, 5);
}

function description(longFormTitle: string | undefined, niche: string, audience: string): string {
  const lines = [
    `For ${audience} - a calm one-minute take on ${niche}.`,
    longFormTitle ? `Full video: ${longFormTitle} (link in pinned comment).` : 'Full video and sources are pinned in the comments.',
    'No clickbait. No financial, medical, or legal advice. Educational only.'
  ];
  return lines.join('\n');
}

function pinnedComment(longFormTitle: string | undefined, hasAffiliate: boolean, topicFlags: string[]): string {
  const lines: string[] = [];
  if (longFormTitle) lines.push(`Full video: ${longFormTitle} - link in description.`);
  if (hasAffiliate) lines.push('Some description links may be affiliate links. Channel may earn a commission at no extra cost.');
  if (topicFlags.includes('financial')) lines.push('Educational only. Not financial advice.');
  if (topicFlags.includes('medical')) lines.push('Educational only. Not medical advice.');
  if (topicFlags.includes('legal')) lines.push('Educational only. Not legal advice.');
  if (lines.length === 0) lines.push('Sources for this Short are listed in the description.');
  return lines.join('\n');
}

function retentionStrategy(format: ShortsFormat): string {
  switch (format) {
    case 'quick_hook_15s':
      return 'Single promise, single payoff. No filler. Bold first frame.';
    case 'mini_explainer_30s':
      return 'Promise -> one fact -> one example -> CTA loop back to start.';
    case 'story_arc_45s':
      return 'Setup -> tension -> resolution -> CTA. Cut on motion.';
    case 'long_form_teaser':
      return 'Tease one specific insight; refuse to give the full answer; route to long-form.';
    case 'list_style':
      return 'Number every beat on screen. Withhold the strongest beat for the end.';
    default:
      return 'Pattern interrupt -> clear promise -> fast value -> payoff -> calm CTA. No bait-and-switch.';
  }
}

function longFormConnection(longFormTitle: string | undefined, niche: string): string {
  if (longFormTitle) return `Drives viewers to long-form video "${longFormTitle}" via pinned comment, description, and end-frame card.`;
  return `When this Short performs, schedule a long-form follow-up that expands the topic for ${niche}.`;
}

function cta(format: ShortsFormat, hasAffiliate: boolean): string {
  if (format === 'long_form_teaser') return 'Watch the full video pinned in the comments.';
  if (hasAffiliate) return 'Tools we vet are linked in the description with a clear affiliate disclosure.';
  return 'Subscribe if calmer, sourced one-minute breakdowns help.';
}

function riskFlags(topicFlags: string[], format: ShortsFormat): string[] {
  const flags: string[] = [];
  if (topicFlags.includes('financial')) flags.push('financial-content-requires-disclaimer');
  if (topicFlags.includes('medical')) flags.push('medical-content-requires-disclaimer');
  if (topicFlags.includes('legal')) flags.push('legal-content-requires-disclaimer');
  if (format === 'product_comparison') flags.push('verify-claims-with-vendor-sources');
  if (format === 'market_insight') flags.push('attribute-numbers-to-primary-source');
  return flags;
}

function uploadPriorityScore(format: ShortsFormat, longFormTitle: string | undefined, audience: string): number {
  let score = 70;
  if (longFormTitle) score += 8;
  if (format === 'long_form_teaser') score += 6;
  if (format === 'myth_vs_fact' || format === 'three_things_you_missed') score += 4;
  if (audience === 'finance beginners' || audience === 'side hustlers') score += 4;
  if (format === 'comment_response') score += 3;
  return Math.min(98, score);
}

function disclaimersFor(input: ShortsEngineInput, topicFlags: string[]): string[] {
  const result = runDisclaimerEngine({
    flags: {
      hasAffiliateLinks: Boolean(input.hasAffiliateLinks),
      hasSponsor: Boolean(input.hasSponsor),
      aiGeneratedContent: input.aiGeneratedContent !== false,
      thirdPartyFootage: false
    },
    topicFlags
  });
  return result.required.map((r) => r.text);
}

export function generateShorts(input: ShortsEngineInput): ShortsConcept[] {
  const formats = (input.formats && input.formats.length > 0 ? input.formats : DEFAULT_FORMATS).slice();
  const count = Math.max(1, Math.min(15, input.count ?? Math.min(5, formats.length)));
  const seedTopic = input.topic ?? input.longFormTitle ?? input.niche;
  const region = input.region ?? 'US';
  const language = input.language ?? 'en';
  const concepts: ShortsConcept[] = [];
  const flags = detectTopicFlags(`${seedTopic} ${input.niche} ${input.audience} ${input.longFormSummary ?? ''}`, input.topicFlags ?? []);
  for (let i = 0; i < count; i++) {
    const format = formats[i % formats.length];
    const seconds = durationFor(format);
    const ttl = safeTitle(seedTopic, format, input.longFormTitle);
    const hk = hookFor(input.audience, seedTopic, format);
    const bts = beats(format, seedTopic, input.audience, seconds);
    const script: ShortsScript = {
      format,
      estimatedDurationSeconds: seconds,
      beats: bts,
      fullNarration: fullNarration(bts)
    };
    const concept: ShortsConcept = {
      shortTitle: ttl,
      hook: hk,
      format,
      estimatedDurationSeconds: seconds,
      script,
      visualPlan: visualPlan(seedTopic, format),
      captionPlan: captionPlan(bts),
      hashtags: hashtags(input.niche, input.audience, format),
      description: description(input.longFormTitle, input.niche, input.audience),
      pinnedComment: pinnedComment(input.longFormTitle, Boolean(input.hasAffiliateLinks), flags),
      targetAudience: input.audience,
      retentionStrategy: retentionStrategy(format),
      longFormConnection: longFormConnection(input.longFormTitle, input.niche),
      cta: cta(format, Boolean(input.hasAffiliateLinks)),
      disclaimers: disclaimersFor(input, flags),
      riskFlags: riskFlags(flags, format),
      uploadPriorityScore: uploadPriorityScore(format, input.longFormTitle, input.audience)
    };
    concepts.push(concept);
    void region; void language;
  }
  return concepts;
}
