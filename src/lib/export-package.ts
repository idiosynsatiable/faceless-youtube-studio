// Export package generator. Returns Markdown and JSON deliverables.

import type { ExportInput } from './validators';
import { safeFilename } from './security';
import { generateShorts, type ShortsConcept, type ShortsFormat } from './shorts-engine';
import { extractClips, type ExtractedClip } from './shorts-cutter';
import { planShortsCalendar, type ShortsCalendarOutput } from './shorts-calendar';
import { planShortsFunnel } from './shorts-funnel';

export interface ExportFile {
  type: 'markdown' | 'json';
  filename: string;
  content: string;
}

export interface ExportBundle {
  files: ExportFile[];
  summary: { markdownLines: number; jsonBytes: number };
}

export interface ShortsBundleInput {
  title: string;
  niche: string;
  audience: string;
  longFormTitle?: string;
  longFormScript?: string;
  longFormStoryboardJson?: unknown;
  hasAffiliateLinks?: boolean;
  hasSponsor?: boolean;
  monetizationGoal?: 'balanced' | 'affiliate' | 'sponsor' | 'product';
  topicFlags?: string[];
  channelStage?: 'new' | 'growing' | 'established';
  productionCapacity?: 'low' | 'medium' | 'high';
  weeks?: number;
  formats?: ('markdown' | 'json')[];
  variantSeconds?: (15 | 30 | 60)[];
}

const VARIANT_FORMAT_MAP: Record<15 | 30 | 60, ShortsFormat> = {
  15: 'quick_hook_15s',
  30: 'mini_explainer_30s',
  60: 'high_retention_60s'
};

function buildMarkdown(input: ExportInput): string {
  const lines: string[] = [];
  lines.push(`# Faceless YouTube Studio package — ${input.title}`);
  lines.push('');
  lines.push(`Niche: ${input.niche}  `);
  lines.push(`Audience: ${input.audience}`);
  lines.push('');
  lines.push('## Script');
  lines.push('');
  lines.push(input.scriptText);
  lines.push('');
  if (input.metadataJson) {
    lines.push('## YouTube metadata');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(input.metadataJson, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (input.storyboardJson) {
    lines.push('## Storyboard');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(input.storyboardJson, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (input.complianceJson) {
    lines.push('## Compliance');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(input.complianceJson, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (input.monetizationJson) {
    lines.push('## Monetization plan');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(input.monetizationJson, null, 2));
    lines.push('```');
    lines.push('');
  }
  if (input.calendarJson) {
    lines.push('## Launch calendar');
    lines.push('');
    lines.push('```json');
    lines.push(JSON.stringify(input.calendarJson, null, 2));
    lines.push('```');
    lines.push('');
  }
  lines.push('## Editing checklist');
  lines.push('- Verify every statistic against a primary source');
  lines.push('- Replace any unverifiable claim');
  lines.push('- Confirm all assets carry a documented license');
  lines.push('- Confirm captions are accurate');
  lines.push('- Confirm chapters match the final timestamps');
  lines.push('');
  lines.push('## Disclaimer package');
  lines.push('Insert the disclaimers listed in the compliance section. Read them clearly in the video, and include them in the description.');
  lines.push('');
  lines.push('## Sponsor pitch brief');
  lines.push('- Subject line summarizing audience match');
  lines.push('- Audience metrics (size, demographics, intent)');
  lines.push('- Proposed segment placement and length');
  lines.push('- Disclosure language to be used');
  return lines.join('\n');
}

export function buildExportBundle(input: ExportInput): ExportBundle {
  const baseName = safeFilename(input.title, 'video-package');
  const files: ExportFile[] = [];
  if (input.formats.includes('markdown')) {
    const md = buildMarkdown(input);
    files.push({ type: 'markdown', filename: `${baseName}.md`, content: md });
  }
  if (input.formats.includes('json')) {
    const json = JSON.stringify(input, null, 2);
    files.push({ type: 'json', filename: `${baseName}.json`, content: json });
  }
  return {
    files,
    summary: {
      markdownLines: (files.find((f) => f.type === 'markdown')?.content.split('\n').length) ?? 0,
      jsonBytes: Buffer.byteLength(files.find((f) => f.type === 'json')?.content ?? '', 'utf8')
    }
  };
}

interface ShortsBundlePayload {
  title: string;
  niche: string;
  audience: string;
  longFormTitle?: string;
  variants: ShortsConcept[];
  clips: ExtractedClip[];
  calendar: ShortsCalendarOutput;
  funnel: ReturnType<typeof planShortsFunnel>;
  monetizationNotes: string[];
  complianceNotes: string[];
}

function buildShortsMarkdown(payload: ShortsBundlePayload): string {
  const lines: string[] = [];
  lines.push(`# Shorts package — ${payload.title}`);
  lines.push('');
  lines.push(`Niche: ${payload.niche}`);
  lines.push(`Audience: ${payload.audience}`);
  if (payload.longFormTitle) {
    lines.push(`Long-form anchor: ${payload.longFormTitle}`);
  }
  lines.push('');
  lines.push('## 15s / 30s / 60s scripts');
  lines.push('');
  payload.variants.forEach((v) => {
    lines.push(`### ${v.shortTitle} (${v.estimatedDurationSeconds}s)`);
    lines.push(`Hook: ${v.hook}`);
    lines.push('');
    lines.push('Beats:');
    v.script.beats.forEach((b) => {
      lines.push(`- ${b.range} ${b.label}: ${b.text}`);
    });
    lines.push('');
    lines.push(`Description: ${v.description}`);
    lines.push('');
    lines.push(`Pinned comment:\n${v.pinnedComment}`);
    lines.push('');
    lines.push(`Hashtags: ${v.hashtags.join(' ')}`);
    lines.push('');
    lines.push(`CTA: ${v.cta}`);
    lines.push('');
  });
  if (payload.clips.length > 0) {
    lines.push('## Clips extracted from long-form');
    payload.clips.forEach((c) => {
      lines.push(`- ${c.clipTitle} (reason: ${c.reasonSelected}, est. retention ${c.expectedRetentionScore})`);
    });
    lines.push('');
  }
  lines.push('## Upload schedule');
  lines.push('');
  payload.calendar.daily.slice(0, 14).forEach((d) => {
    lines.push(`- ${d.date} ${d.publishWindow} ${d.type} - ${d.title}`);
  });
  lines.push('');
  lines.push('## Long-form funnel');
  lines.push(`- Related long-form: ${payload.funnel.relatedLongForm}`);
  lines.push(`- Pinned comment:\n${payload.funnel.pinnedComment}`);
  lines.push(`- Description CTA: ${payload.funnel.descriptionCta}`);
  lines.push(`- Playlist: ${payload.funnel.playlistRecommendation}`);
  lines.push('');
  lines.push('## Disclaimer block');
  payload.variants[0]?.disclaimers.forEach((d) => lines.push(`- ${d}`));
  lines.push('');
  lines.push('## Compliance notes');
  payload.complianceNotes.forEach((n) => lines.push(`- ${n}`));
  lines.push('');
  lines.push('## Monetization notes');
  payload.monetizationNotes.forEach((n) => lines.push(`- ${n}`));
  return lines.join('\n');
}

export function buildShortsBundle(input: ShortsBundleInput): ExportBundle {
  const formats = (input.formats && input.formats.length > 0) ? input.formats : ['markdown', 'json'];
  const variantSeconds: (15 | 30 | 60)[] = (input.variantSeconds && input.variantSeconds.length > 0)
    ? input.variantSeconds
    : [15, 30, 60];
  const variantFormats = variantSeconds.map((s) => VARIANT_FORMAT_MAP[s]);
  const variants = generateShorts({
    niche: input.niche,
    audience: input.audience,
    topic: input.title,
    longFormTitle: input.longFormTitle,
    longFormSummary: input.longFormScript?.slice(0, 600),
    formats: variantFormats,
    count: variantFormats.length,
    monetizationGoal: input.monetizationGoal ?? 'balanced',
    hasAffiliateLinks: input.hasAffiliateLinks,
    hasSponsor: input.hasSponsor,
    topicFlags: input.topicFlags
  });
  const clips = input.longFormScript
    ? extractClips({
        sourceVideoTitle: input.longFormTitle,
        scriptText: input.longFormScript,
        audience: input.audience,
        maxClips: 5
      })
    : [];
  const calendar = planShortsCalendar({
    niche: input.niche,
    audience: input.audience,
    channelStage: input.channelStage ?? 'new',
    productionCapacity: input.productionCapacity ?? 'medium',
    longFormPerWeek: input.longFormTitle ? 1 : 0,
    weeks: input.weeks ?? 4
  });
  const funnel = planShortsFunnel({
    shortTitle: input.title,
    niche: input.niche,
    audience: input.audience,
    longFormTitle: input.longFormTitle,
    hasAffiliateLinks: input.hasAffiliateLinks,
    hasSponsor: input.hasSponsor,
    monetizationGoal: input.monetizationGoal ?? 'balanced',
    topicFlags: input.topicFlags
  });
  const monetizationNotes = [
    'Shorts ad revenue is typically lower than long-form per view; treat Shorts as discovery, not the revenue engine.',
    'Route every successful Short to the long-form anchor and the lead magnet.',
    'Disclose all affiliate and sponsor relationships in-video and in the description.'
  ];
  const complianceNotes = [
    'Disclaimers required by the compliance engine are listed above; copy them verbatim.',
    'Do not use copyrighted media without a documented license.',
    'Do not promise income, medical outcomes, or legal results.',
    'No fake engagement, bots, or paid pods - cadence relies on retention only.'
  ];
  const payload: ShortsBundlePayload = {
    title: input.title,
    niche: input.niche,
    audience: input.audience,
    longFormTitle: input.longFormTitle,
    variants,
    clips,
    calendar,
    funnel,
    monetizationNotes,
    complianceNotes
  };
  const baseName = safeFilename(`${input.title}-shorts`, 'shorts-package');
  const files: ExportFile[] = [];
  if (formats.includes('markdown')) {
    files.push({ type: 'markdown', filename: `${baseName}.md`, content: buildShortsMarkdown(payload) });
  }
  if (formats.includes('json')) {
    files.push({ type: 'json', filename: `${baseName}.json`, content: JSON.stringify(payload, null, 2) });
  }
  return {
    files,
    summary: {
      markdownLines: (files.find((f) => f.type === 'markdown')?.content.split('\n').length) ?? 0,
      jsonBytes: Buffer.byteLength(files.find((f) => f.type === 'json')?.content ?? '', 'utf8')
    }
  };
}

export interface CombinedBundleInput extends ExportInput {
  shorts?: ShortsBundleInput;
}

export function buildCombinedBundle(input: CombinedBundleInput): ExportBundle {
  const main = buildExportBundle(input);
  if (!input.shorts) return main;
  const shorts = buildShortsBundle({
    ...input.shorts,
    longFormTitle: input.shorts.longFormTitle ?? input.title,
    longFormScript: input.shorts.longFormScript ?? input.scriptText,
    formats: input.formats
  });
  const files = [...main.files, ...shorts.files];
  return {
    files,
    summary: {
      markdownLines: files.filter((f) => f.type === 'markdown').reduce((s, f) => s + f.content.split('\n').length, 0),
      jsonBytes: files.filter((f) => f.type === 'json').reduce((s, f) => s + Buffer.byteLength(f.content, 'utf8'), 0)
    }
  };
}
