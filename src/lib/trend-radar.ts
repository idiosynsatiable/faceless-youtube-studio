// Trend Radar — deterministic scoring engine. No scraping, no fake data.
// Operates on user-provided or imported trend records.

import type { TrendInput } from './validators';

export interface TrendOutput {
  topic: string;
  region: string;
  language: string;
  audienceSegment: string;
  risingReason: string;
  searchIntent: 'informational' | 'commercial' | 'transactional' | 'navigational';
  urgencyScore: number;
  monetizationScore: number;
  competitionScore: number;
  evergreenScore: number;
  advertiserSafetyScore: number;
  trendScore: number;
  suggestedAngles: string[];
  suggestedFormats: string[];
  recommendedPublishTiming: string;
}

const COMMERCIAL_HINTS = ['buy', 'best', 'review', 'price', 'compare', 'vs', 'deal', 'discount'];
const TRANSACTIONAL_HINTS = ['sign up', 'apply', 'register', 'get', 'order', 'subscribe'];
const NAV_HINTS = ['login', 'site:', 'official'];
const RISKY_HINTS = ['weapon', 'illegal', 'hack', 'exploit', 'gore', 'shock'];
const FINANCE_HINTS = ['stocks', 'invest', 'crypto', 'earn', 'income', 'side hustle', 'make money', 'tax'];
const SAFE_HINTS = ['guide', 'tutorial', 'how to', 'history', 'science', 'documentary'];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function classifyIntent(topic: string): TrendOutput['searchIntent'] {
  const t = topic.toLowerCase();
  if (NAV_HINTS.some((k) => t.includes(k))) return 'navigational';
  if (TRANSACTIONAL_HINTS.some((k) => t.includes(k))) return 'transactional';
  if (COMMERCIAL_HINTS.some((k) => t.includes(k))) return 'commercial';
  return 'informational';
}

function detectAudience(topic: string, hint?: string): string {
  if (hint && hint.length > 0) return hint;
  const t = topic.toLowerCase();
  if (t.includes('student') || t.includes('school')) return 'students';
  if (FINANCE_HINTS.some((h) => t.includes(h))) return 'finance beginners';
  if (t.includes('parent') || t.includes('kids')) return 'parents';
  if (t.includes('game')) return 'gamers';
  if (t.includes('health') || t.includes('fitness')) return 'health-conscious viewers';
  if (t.includes('career') || t.includes('job')) return 'job seekers';
  if (t.includes('startup') || t.includes('founder')) return 'entrepreneurs';
  if (t.includes('learn english') || t.includes('esl')) return 'international English learners';
  return 'self-improvement viewers';
}

function detectRisingReason(input: TrendInput): string {
  switch (input.source) {
    case 'news':
      return 'News-driven attention spike';
    case 'reddit':
      return 'Community discussion volume rising';
    case 'tiktok':
      return 'Short-form social momentum';
    case 'x':
      return 'Topic chatter on X';
    case 'youtube_suggestions':
      return 'Search suggestion frequency on YouTube';
    case 'google_trends':
      return 'Increasing relative search interest';
    case 'csv_import':
      return 'Imported from creator dataset';
    default:
      return 'Creator-identified opportunity';
  }
}

function urgency(input: TrendInput): number {
  const intent = classifyIntent(input.topic);
  let score = 50;
  if (input.source === 'news') score += 25;
  if (input.source === 'tiktok' || input.source === 'x') score += 15;
  if (intent === 'commercial' || intent === 'transactional') score += 10;
  if (input.region !== 'US') score -= 5;
  return clamp(score);
}

function monetization(input: TrendInput): number {
  const t = input.topic.toLowerCase();
  let score = 55;
  if (FINANCE_HINTS.some((h) => t.includes(h))) score += 20;
  if (COMMERCIAL_HINTS.some((h) => t.includes(h))) score += 15;
  if (TRANSACTIONAL_HINTS.some((h) => t.includes(h))) score += 5;
  if (RISKY_HINTS.some((h) => t.includes(h))) score -= 35;
  return clamp(score);
}

function competition(input: TrendInput): number {
  const t = input.topic.toLowerCase();
  let score = 60;
  if (FINANCE_HINTS.some((h) => t.includes(h))) score += 20;
  if (t.includes('ai') || t.includes('chatgpt')) score += 15;
  if (SAFE_HINTS.some((h) => t.includes(h))) score -= 5;
  return clamp(score);
}

function evergreen(input: TrendInput): number {
  const t = input.topic.toLowerCase();
  let score = 50;
  if (SAFE_HINTS.some((h) => t.includes(h))) score += 25;
  if (input.source === 'news') score -= 25;
  if (t.includes('today') || t.includes('this week')) score -= 15;
  if (t.includes('history') || t.includes('explained')) score += 15;
  return clamp(score);
}

function advertiserSafety(input: TrendInput): number {
  const t = input.topic.toLowerCase();
  let score = 80;
  if (RISKY_HINTS.some((h) => t.includes(h))) score -= 70;
  if (t.includes('crypto') || t.includes('gambling')) score -= 15;
  if (FINANCE_HINTS.some((h) => t.includes(h))) score -= 5;
  if (SAFE_HINTS.some((h) => t.includes(h))) score += 10;
  return clamp(score);
}

function suggestedAngles(input: TrendInput): string[] {
  const base = input.topic;
  return [
    `${base} explained for beginners`,
    `${base} - what creators get wrong`,
    `${base} step-by-step framework`,
    `${base} myths vs facts`,
    `${base} 5-minute briefing`
  ];
}

function suggestedFormats(input: TrendInput): string[] {
  const t = input.topic.toLowerCase();
  const formats = new Set<string>(['explainer', 'documentary-style', 'listicle']);
  if (FINANCE_HINTS.some((h) => t.includes(h))) {
    formats.add('market analysis');
    formats.add('case study');
  }
  if (t.includes('how to') || t.includes('guide')) formats.add('tutorial');
  if (t.includes('history')) formats.add('history/timeline');
  if (input.source === 'news') formats.add('news context breakdown');
  return Array.from(formats);
}

function publishTiming(input: TrendInput): string {
  if (input.source === 'news') return 'Within 24 hours while attention is rising';
  if (input.source === 'tiktok' || input.source === 'x') return 'Within 72 hours';
  return 'Evergreen — schedule for prime audience hours in target region';
}

export function scoreTrend(input: TrendInput): TrendOutput {
  const u = urgency(input);
  const m = monetization(input);
  const c = competition(input);
  const e = evergreen(input);
  const a = advertiserSafety(input);
  const trendScore = clamp(0.25 * u + 0.25 * m + 0.2 * (100 - c) + 0.15 * e + 0.15 * a);
  return {
    topic: input.topic,
    region: input.region,
    language: input.language,
    audienceSegment: detectAudience(input.topic, input.audienceHint),
    risingReason: detectRisingReason(input),
    searchIntent: classifyIntent(input.topic),
    urgencyScore: u,
    monetizationScore: m,
    competitionScore: c,
    evergreenScore: e,
    advertiserSafetyScore: a,
    trendScore,
    suggestedAngles: suggestedAngles(input),
    suggestedFormats: suggestedFormats(input),
    recommendedPublishTiming: publishTiming(input)
  };
}
