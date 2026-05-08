// Faceless video script engine. Produces a structured, voiceover-ready script.
// Honest, non-clickbait, marks unverified claims, and inserts disclaimer placement notes.

import type { ScriptInput } from './validators';
import { buildHookPlan } from './hook-engine';

export interface ScriptSection {
  heading: string;
  narration: string;
  visualDirection: string;
  bRollNotes: string;
  captionEmphasis: string[];
  retentionBeat: string;
  flagsClaimsToVerify: string[];
  disclaimerInsert?: string;
}

export interface VideoScript {
  title: string;
  hook: string;
  intro: ScriptSection;
  body: ScriptSection[];
  transitions: string[];
  cta: string;
  outro: string;
  sourcesNeeded: string[];
  factCheckChecklist: string[];
  disclaimerPlacements: string[];
}

const FINANCE_KEYWORDS = ['money', 'invest', 'stock', 'crypto', 'tax', 'income', 'finance', 'loan', 'side hustle'];
const MEDICAL_KEYWORDS = ['medical', 'doctor', 'health', 'symptom', 'medicine', 'mental', 'nutrition', 'diet'];
const LEGAL_KEYWORDS = ['legal', 'law', 'lawyer', 'attorney', 'contract', 'court'];
const AI_KEYWORDS = ['ai voice', 'ai generated', 'ai narration', 'synthetic'];

function detectFlags(input: ScriptInput): string[] {
  const haystack = `${input.title} ${input.keyPoints.join(' ')}`.toLowerCase();
  const set = new Set<string>(input.flags || []);
  if (FINANCE_KEYWORDS.some((k) => haystack.includes(k))) set.add('financial');
  if (MEDICAL_KEYWORDS.some((k) => haystack.includes(k))) set.add('medical');
  if (LEGAL_KEYWORDS.some((k) => haystack.includes(k))) set.add('legal');
  if (AI_KEYWORDS.some((k) => haystack.includes(k))) set.add('ai_content');
  set.add('general');
  set.add('results');
  return Array.from(set);
}

function disclaimerForFlag(flag: string): string {
  switch (flag) {
    case 'financial':
      return 'Insert financial disclaimer: This content is not financial advice.';
    case 'medical':
      return 'Insert medical disclaimer: This content is not medical advice.';
    case 'legal':
      return 'Insert legal disclaimer: This content is not legal advice.';
    case 'ai_content':
      return 'Insert AI content disclosure when AI voice or visuals are material.';
    case 'results':
      return 'Insert results disclaimer: Results are not guaranteed.';
    case 'affiliate':
      return 'Insert affiliate disclosure if any link in the description is an affiliate link.';
    case 'sponsor':
      return 'Insert sponsor disclosure at the start of the sponsor segment.';
    default:
      return 'Insert general educational disclaimer.';
  }
}

function transitionsFor(count: number): string[] {
  const t: string[] = [];
  for (let i = 0; i < count; i++) {
    t.push(`Transition ${i + 1}: short whoosh + on-screen recap line, no music gap`);
  }
  return t;
}

function chunkKeyPoints(points: string[], targetSections: number): string[][] {
  if (points.length === 0) return Array.from({ length: targetSections }, () => []);
  const out: string[][] = Array.from({ length: targetSections }, () => []);
  points.forEach((p, i) => out[i % targetSections].push(p));
  return out;
}

function buildSection(heading: string, points: string[], retentionBeat: string, claimsHint: string[]): ScriptSection {
  const narration = points.length > 0
    ? `${heading}. ${points.map((p) => `${p}.`).join(' ')} Recap: ${heading.toLowerCase()} matters because it changes what the viewer does next.`
    : `${heading}. Lay out the framework clearly, define every term you introduce, and tie this section to the original promise of the video. Recap before moving on.`;
  return {
    heading,
    narration,
    visualDirection: 'Editorial b-roll matching narration. Lower-third title for the section. Caption keywords on screen.',
    bRollNotes: 'Use creator-owned, public-domain, or licensed stock only. No copyrighted clips without written license.',
    captionEmphasis: points.length > 0 ? points.slice(0, 3) : [heading],
    retentionBeat,
    flagsClaimsToVerify: claimsHint
  };
}

function flaggedClaims(points: string[]): string[] {
  return points.filter((p) => /[0-9%]/.test(p) || /best|fastest|biggest|guaranteed/i.test(p)).map((p) => `Verify with primary source: ${p}`);
}

export function generateScript(input: ScriptInput): VideoScript {
  const flags = detectFlags(input);
  const hookPlan = buildHookPlan({
    title: input.title,
    audience: input.audience,
    format: input.format,
    durationMinutes: input.durationMinutes
  });

  const sectionHeadings = ['Setup', 'Framework', 'Evidence', 'Action step'];
  const grouped = chunkKeyPoints(input.keyPoints, sectionHeadings.length);
  const body = sectionHeadings.map((h, i) =>
    buildSection(
      h,
      grouped[i],
      hookPlan.payoffSchedule[Math.min(i, hookPlan.payoffSchedule.length - 1)],
      flaggedClaims(grouped[i])
    )
  );

  const intro = buildSection('Intro', input.keyPoints.slice(0, 1), 'First micro-payoff before the 60s mark', flaggedClaims(input.keyPoints.slice(0, 1)));
  intro.narration = `${input.hook ?? hookPlan.fiveSecondHook} ${hookPlan.viewerPromise}`;
  intro.captionEmphasis = ['promise', 'what you will learn'];

  if (flags.includes('financial')) intro.disclaimerInsert = disclaimerForFlag('financial');
  if (flags.includes('medical')) {
    body[1].disclaimerInsert = disclaimerForFlag('medical');
  }
  if (flags.includes('legal')) {
    body[1].disclaimerInsert = (body[1].disclaimerInsert ? body[1].disclaimerInsert + ' ' : '') + disclaimerForFlag('legal');
  }
  if (flags.includes('ai_content')) {
    body[0].disclaimerInsert = disclaimerForFlag('ai_content');
  }

  const cta = `If this helped, subscribe for more ${input.format.toLowerCase()} videos for ${input.audience}. The links and sources we used are pinned in the description.`;
  const outro = `That is the framework. Clip on screen now goes deeper into one specific scenario. Watch it next when you are ready.`;

  const sourcesNeeded = (input.sources && input.sources.length > 0)
    ? input.sources
    : ['Primary source for every numeric claim', 'Authoritative reference for every named entity', 'Quote attribution for every quotation'];

  const factCheckChecklist = [
    'Verify every statistic against a primary source',
    'Confirm every named expert is correctly attributed',
    'Confirm every product claim with public documentation or vendor confirmation',
    'Confirm any historical date with two independent sources',
    'Remove any unverifiable claim before publishing'
  ];

  const disclaimerPlacements = flags.map(disclaimerForFlag);

  return {
    title: input.title,
    hook: input.hook ?? hookPlan.fiveSecondHook,
    intro,
    body,
    transitions: transitionsFor(body.length - 1),
    cta,
    outro,
    sourcesNeeded,
    factCheckChecklist,
    disclaimerPlacements
  };
}
