// Shorts cutter. Identifies clip-worthy moments inside a long-form script
// or transcript and produces structured Shorts concepts that route back
// to the long-form video.

export interface LongFormSegment {
  text: string;
  index: number;
  startSeconds: number;
  endSeconds: number;
}

export type ShortReason =
  | 'strong_claim'
  | 'surprising_fact'
  | 'emotional_peak'
  | 'list_point'
  | 'comparison_moment'
  | 'safe_controversial_angle'
  | 'transformation_moment'
  | 'before_after'
  | 'myth_vs_fact'
  | 'high_curiosity'
  | 'quote_worthy';

export interface ExtractedClip {
  sourceVideoId?: string;
  sourceVideoTitle?: string;
  startTimeEstimate: number;
  endTimeEstimate: number;
  clipTitle: string;
  clipHook: string;
  clipScript: string;
  captionText: string;
  reasonSelected: ShortReason;
  expectedRetentionScore: number;
}

export interface ShortsCutterInput {
  sourceVideoId?: string;
  sourceVideoTitle?: string;
  scriptText: string;
  segments?: LongFormSegment[];
  maxClips?: number;
  audience: string;
}

const STRONG_CLAIM_RX = /\b(must|always|never|the only|the simplest|the cheapest|the fastest|guaranteed not to|the truth|the real reason)\b/i;
const NUMBER_RX = /\b\d{1,3}(?:[.,]\d+)?(?:\s?%|x|x faster|x cheaper)?\b/;
const COMPARISON_RX = /\b(vs|versus|better than|worse than|compared to|in contrast|alternatively)\b/i;
const TRANSFORMATION_RX = /\b(before|after|used to|turned into|now|then|previously)\b/i;
const MYTH_RX = /\b(myth|truth|misconception|widely believed|actually|in fact)\b/i;
const QUOTE_RX = /[“”"'].{8,140}[“”"']|"[^"]{8,140}"/;
const EMOTION_RX = /\b(surprising|shocking-but-true|painful|relieving|fascinating|hopeful|cautionary)\b/i;
const LIST_RX = /\b(first|second|third|step\s?\d+|next,?|finally,?|number\s\d+|\d\.)\b/i;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

export function timestampLabel(totalSeconds: number): string {
  const mm = Math.floor(totalSeconds / 60);
  const ss = totalSeconds % 60;
  return `${pad(mm)}:${pad(ss)}`;
}

function reasonFor(text: string): ShortReason | null {
  if (MYTH_RX.test(text)) return 'myth_vs_fact';
  if (TRANSFORMATION_RX.test(text)) return 'before_after';
  if (COMPARISON_RX.test(text)) return 'comparison_moment';
  if (LIST_RX.test(text)) return 'list_point';
  if (STRONG_CLAIM_RX.test(text)) return 'strong_claim';
  if (EMOTION_RX.test(text)) return 'emotional_peak';
  if (QUOTE_RX.test(text)) return 'quote_worthy';
  if (NUMBER_RX.test(text)) return 'surprising_fact';
  if (text.length >= 120) return 'high_curiosity';
  return null;
}

function buildSegments(scriptText: string, providedSegments?: LongFormSegment[]): LongFormSegment[] {
  if (providedSegments && providedSegments.length > 0) {
    return providedSegments
      .map((s, i) => ({ ...s, index: i }))
      .sort((a, b) => a.startSeconds - b.startSeconds);
  }
  const sentences = scriptText.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 0);
  if (sentences.length === 0) return [];
  // Estimate ~2.5 words per second cumulative.
  const segments: LongFormSegment[] = [];
  let cursor = 0;
  sentences.forEach((s, i) => {
    const seconds = Math.max(3, Math.round(s.split(' ').length / 2.5));
    segments.push({ text: s.trim(), index: i, startSeconds: cursor, endSeconds: cursor + seconds });
    cursor += seconds;
  });
  return segments;
}

function expectedRetention(reason: ShortReason): number {
  switch (reason) {
    case 'myth_vs_fact':
      return 80;
    case 'surprising_fact':
      return 78;
    case 'comparison_moment':
      return 76;
    case 'before_after':
      return 76;
    case 'list_point':
      return 73;
    case 'transformation_moment':
      return 75;
    case 'safe_controversial_angle':
      return 74;
    case 'strong_claim':
      return 72;
    case 'emotional_peak':
      return 71;
    case 'quote_worthy':
      return 72;
    case 'high_curiosity':
      return 70;
  }
}

function buildClipTitle(reason: ShortReason, audience: string, segmentText: string): string {
  const stub = segmentText.replace(/[.!?]+$/, '').slice(0, 60);
  switch (reason) {
    case 'myth_vs_fact':
      return `Myth vs fact: ${stub}`;
    case 'surprising_fact':
      return `${stub} (the number that surprises ${audience})`;
    case 'comparison_moment':
      return `Two real options: ${stub}`;
    case 'before_after':
      return `Before vs after: ${stub}`;
    case 'list_point':
      return `One item that matters most: ${stub}`;
    case 'transformation_moment':
      return `Quiet shift: ${stub}`;
    case 'safe_controversial_angle':
      return `An honest angle on ${stub}`;
    case 'strong_claim':
      return `Why this claim about "${stub}" deserves a second look`;
    case 'emotional_peak':
      return `${stub} (a moment worth sitting with)`;
    case 'quote_worthy':
      return `One quote: ${stub}`;
    case 'high_curiosity':
      return `${stub} - in 60 seconds`;
  }
}

function buildClipHook(reason: ShortReason, audience: string): string {
  switch (reason) {
    case 'myth_vs_fact':
      return `For ${audience}: this is the myth, and here is what is actually true.`;
    case 'surprising_fact':
      return `${audience}, one number changes the whole picture - here it is.`;
    case 'comparison_moment':
      return `${audience}, two options compared in under a minute.`;
    case 'before_after':
      return `${audience}: the quiet shift between before and after.`;
    case 'list_point':
      return `${audience}: of the list, this point matters most.`;
    case 'transformation_moment':
      return `${audience}, what flipped the outcome.`;
    case 'safe_controversial_angle':
      return `${audience}: an angle most videos avoid - presented calmly.`;
    case 'strong_claim':
      return `${audience}: a strong claim worth checking.`;
    case 'emotional_peak':
      return `${audience}: the part that lands.`;
    case 'quote_worthy':
      return `${audience}: one line that stayed with us.`;
    case 'high_curiosity':
      return `${audience}: the underrated minute from the full video.`;
  }
}

function buildClipScript(text: string, audience: string, longTitle?: string): string {
  return `Hook for ${audience}. ${text} Quick recap: this is the part of "${longTitle ?? 'the full video'}" worth saving. Watch the full video pinned in the comments for the rest.`;
}

function buildCaption(text: string): string {
  const cleaned = text.replace(/[\n\r]+/g, ' ').replace(/\s+/g, ' ').trim();
  const words = cleaned.split(' ').slice(0, 9).join(' ').replace(/[.!?,]+$/, '');
  return words + (cleaned.length > words.length ? '...' : '');
}

function clamp15to60(durationSeconds: number): number {
  if (durationSeconds < 15) return 15;
  if (durationSeconds > 60) return 60;
  return Math.round(durationSeconds);
}

export function extractClips(input: ShortsCutterInput): ExtractedClip[] {
  const segments = buildSegments(input.scriptText, input.segments);
  const max = Math.max(1, Math.min(10, input.maxClips ?? 5));
  const candidates: { segment: LongFormSegment; reason: ShortReason; score: number }[] = [];
  for (const segment of segments) {
    const reason = reasonFor(segment.text);
    if (!reason) continue;
    const score = expectedRetention(reason);
    candidates.push({ segment, reason, score });
  }
  candidates.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.segment.index - b.segment.index;
  });
  const chosen = candidates.slice(0, max);
  return chosen.map(({ segment, reason, score }) => {
    const duration = clamp15to60(segment.endSeconds - segment.startSeconds + 10);
    const start = segment.startSeconds;
    const end = start + duration;
    return {
      sourceVideoId: input.sourceVideoId,
      sourceVideoTitle: input.sourceVideoTitle,
      startTimeEstimate: start,
      endTimeEstimate: end,
      clipTitle: buildClipTitle(reason, input.audience, segment.text),
      clipHook: buildClipHook(reason, input.audience),
      clipScript: buildClipScript(segment.text, input.audience, input.sourceVideoTitle),
      captionText: buildCaption(segment.text),
      reasonSelected: reason,
      expectedRetentionScore: score
    };
  });
}
