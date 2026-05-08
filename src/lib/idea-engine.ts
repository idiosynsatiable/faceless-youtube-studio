// Generates faceless video ideas using deterministic templates.
// Produces structured ideas. Avoids clickbait, false claims, and harm.

import type { IdeaInput } from './validators';

export interface VideoIdea {
  title: string;
  audience: string;
  corePromise: string;
  curiosityGap: string;
  hook: string;
  format: string;
  estimatedLengthMinutes: number;
  monetizationAngle: string;
  retentionStrategy: string;
  thumbnailConcept: string;
  disclaimerNeeds: string[];
  riskLevel: 'low' | 'medium' | 'high';
  productionDifficulty: 'easy' | 'medium' | 'hard';
  evergreenValue: 'low' | 'medium' | 'high';
  score: number;
}

const FORMATS = [
  'explainer',
  'documentary-style',
  'listicle',
  'comparison',
  'case study',
  'tutorial',
  'market analysis',
  'reactionless commentary',
  'animated explainer',
  'data visualization',
  'product research',
  'trend breakdown',
  'history/timeline',
  'myth vs fact',
  'beginner guide',
  'advanced guide',
  'mistakes to avoid',
  'opportunity report',
  'news context breakdown'
];

function detectDisclaimers(niche: string, topic: string): string[] {
  const t = `${niche} ${topic}`.toLowerCase();
  const list: string[] = ['general'];
  if (/(money|invest|crypto|stocks|tax|loan|side hustle|income|finance|business model)/.test(t)) list.push('financial');
  if (/(health|medical|nutrition|diet|fitness|sleep|mental)/.test(t)) list.push('medical');
  if (/(legal|law|attorney|immigration|tax law|contract)/.test(t)) list.push('legal');
  if (/(ai|gpt|midjourney|generated|deepfake)/.test(t)) list.push('ai_content');
  list.push('results');
  list.push('affiliate');
  return Array.from(new Set(list));
}

function riskLevel(disc: string[]): VideoIdea['riskLevel'] {
  if (disc.includes('financial') || disc.includes('medical') || disc.includes('legal')) return 'medium';
  return 'low';
}

function difficulty(format: string): VideoIdea['productionDifficulty'] {
  if (['animated explainer', 'data visualization', 'documentary-style'].includes(format)) return 'hard';
  if (['case study', 'comparison', 'tutorial', 'history/timeline'].includes(format)) return 'medium';
  return 'easy';
}

function evergreen(format: string): VideoIdea['evergreenValue'] {
  if (['news context breakdown', 'trend breakdown'].includes(format)) return 'low';
  if (['comparison', 'product research'].includes(format)) return 'medium';
  return 'high';
}

function buildHook(title: string, audience: string): string {
  const cleaned = title.replace(/[?.!]+$/, '');
  return `In the next 5 seconds I'll show ${audience} the part of "${cleaned}" most videos skip - using only verified information.`;
}

function buildPromise(title: string): string {
  return `By the end you'll be able to explain "${title}" clearly and decide your next concrete step.`;
}

function buildCuriosityGap(title: string): string {
  return `What most creators miss about "${title}" - and the framework you can apply tonight.`;
}

function pickFormat(i: number, monetizationGoal: string): string {
  if (monetizationGoal === 'affiliate' && i % 3 === 0) return 'product research';
  if (monetizationGoal === 'sponsor' && i % 4 === 0) return 'case study';
  if (monetizationGoal === 'product' && i % 5 === 0) return 'opportunity report';
  return FORMATS[i % FORMATS.length];
}

function lengthForFormat(format: string): number {
  const map: Record<string, number> = {
    explainer: 8,
    'documentary-style': 14,
    listicle: 9,
    comparison: 8,
    'case study': 11,
    tutorial: 10,
    'market analysis': 12,
    'reactionless commentary': 9,
    'animated explainer': 7,
    'data visualization': 8,
    'product research': 9,
    'trend breakdown': 7,
    'history/timeline': 14,
    'myth vs fact': 8,
    'beginner guide': 11,
    'advanced guide': 14,
    'mistakes to avoid': 9,
    'opportunity report': 12,
    'news context breakdown': 6
  };
  return map[format] ?? 9;
}

function monetizationAngle(format: string, goal: string): string {
  if (goal === 'affiliate' || format === 'product research' || format === 'comparison') {
    return 'Affiliate links to vetted tools or resources mentioned in the video';
  }
  if (goal === 'sponsor' || format === 'case study') {
    return 'Sponsor segment positioned as case-study sponsor - disclose clearly';
  }
  if (goal === 'product') {
    return 'Direct CTA to creator product or lead magnet relevant to the topic';
  }
  return 'YouTube ad revenue plus an end-screen CTA to a free lead magnet';
}

function retentionStrategy(format: string): string {
  if (format === 'documentary-style' || format === 'history/timeline') {
    return 'Open loop in the first 30 seconds, payoff at 60% mark, micro-cliffhangers between chapters';
  }
  if (format === 'tutorial' || format === 'beginner guide') {
    return 'Promise specific outcome up front, deliver in numbered steps with on-screen recap every 60 seconds';
  }
  if (format === 'comparison' || format === 'product research') {
    return 'Tease a surprising winner, withhold final pick until after each criterion is explained';
  }
  return 'Strong 5-second hook, pattern interrupts every 45 seconds, recap before any new section';
}

function thumbnailConcept(title: string, format: string): string {
  if (format === 'comparison') return `Two contrasting subjects with bold numbers and a vs label - title clip "${title.slice(0, 28)}"`;
  if (format === 'data visualization') return `One striking chart, one bold number, minimal copy`;
  return `Editorial still capturing the core promise of "${title}", legible at 240px`;
}

function ideaScore(format: string, audience: string, goal: string): number {
  let score = 70;
  if (['comparison', 'opportunity report', 'case study'].includes(format)) score += 8;
  if (audience === 'finance beginners' || audience === 'side hustlers') score += 6;
  if (goal === 'affiliate' && format === 'product research') score += 6;
  if (goal === 'product' && format === 'opportunity report') score += 6;
  return Math.min(98, score);
}

export function generateIdeas(input: IdeaInput): VideoIdea[] {
  const seeds = (input.topics && input.topics.length > 0) ? input.topics : [input.niche];
  const ideas: VideoIdea[] = [];
  for (let i = 0; i < input.count; i++) {
    const seed = seeds[i % seeds.length];
    const format = pickFormat(i, input.monetizationGoal);
    const title = ideaTitleFor(seed, format, i);
    const disc = detectDisclaimers(input.niche, title);
    ideas.push({
      title,
      audience: input.audience,
      corePromise: buildPromise(title),
      curiosityGap: buildCuriosityGap(title),
      hook: buildHook(title, input.audience),
      format,
      estimatedLengthMinutes: lengthForFormat(format),
      monetizationAngle: monetizationAngle(format, input.monetizationGoal),
      retentionStrategy: retentionStrategy(format),
      thumbnailConcept: thumbnailConcept(title, format),
      disclaimerNeeds: disc,
      riskLevel: riskLevel(disc),
      productionDifficulty: difficulty(format),
      evergreenValue: evergreen(format),
      score: ideaScore(format, input.audience, input.monetizationGoal)
    });
  }
  return ideas;
}

function ideaTitleFor(seed: string, format: string, i: number): string {
  const base = seed.trim();
  const rotations = [
    `${base}: the underrated framework explained`,
    `Everything ${base} videos get wrong (and the fix)`,
    `${base} compared - what actually performs`,
    `${base}: a beginner's first 30 days`,
    `${base}: what the data really says`,
    `${base}: the mistake most people repeat`,
    `${base}: 5 lessons from real case studies`,
    `${base} myth vs fact - settled in 8 minutes`,
    `${base}: the opportunity report for ${new Date().getFullYear()}`,
    `${base}: a calm step-by-step playbook`
  ];
  const variant = rotations[i % rotations.length];
  if (format === 'history/timeline') return `${base}: a short history that explains today`;
  if (format === 'news context breakdown') return `${base}: the context behind today's headlines`;
  return variant;
}
