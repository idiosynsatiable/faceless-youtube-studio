import { requestJson } from './openai-json';
import type { ResearchDossier } from './autonomy-policy';

export interface PremiumPackage {
  title: string;
  hook: string;
  script: string;
  description: string;
  tags: string[];
  keywords: string[];
  visualPrompts: string[];
  thumbnailPrompt: string;
  durationMinutes: number;
  shortsCount: number;
}

function list(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => item.trim()).slice(0, max);
}

export async function generatePremiumPackage(args: {
  topic: string;
  dossier: ResearchDossier;
  deterministicSeed: { title: string; hook: string; format: string; retentionStrategy: string; thumbnailConcept: string };
  shortsCount: number;
}): Promise<PremiumPackage> {
  const prompt = `Create a premium faceless informational YouTube package from this verified research dossier. Topic: ${args.topic}. Dossier: ${JSON.stringify(args.dossier)}. Deterministic creative seed to preserve selectively: ${JSON.stringify(args.deterministicSeed)}.

Requirements: truthful title under 100 characters; immediate hook; approximately 900-1300 words of voiceover for a 7-10 minute video; no invented facts, quotes, urgency or statistics; uncertainty stated honestly; strong pacing without filler; no political persuasion; no medical or financial promises; visual concepts must be original/copyright-safe and not require logos or copyrighted footage. The description must include a Sources section using the dossier URLs and a transparent AI-production disclosure. Return only JSON: {"title":"...","hook":"...","script":"...","description":"...","tags":["..."],"keywords":["..."],"visualPrompts":["..."],"thumbnailPrompt":"...","durationMinutes":8,"shortsCount":${args.shortsCount}}.`;
  const r = await requestJson<Record<string, unknown>>(prompt);
  const script = typeof r.script === 'string' ? r.script.trim() : '';
  if (script.length < 1200) throw new Error('generated script did not meet the long-form quality floor');
  return {
    title: (typeof r.title === 'string' ? r.title.trim() : args.deterministicSeed.title).slice(0, 100),
    hook: typeof r.hook === 'string' ? r.hook.trim() : args.deterministicSeed.hook,
    script,
    description: (typeof r.description === 'string' ? r.description.trim() : args.dossier.summary).slice(0, 5000),
    tags: list(r.tags, 25),
    keywords: list(r.keywords, 30),
    visualPrompts: list(r.visualPrompts, 12),
    thumbnailPrompt: typeof r.thumbnailPrompt === 'string' ? r.thumbnailPrompt.trim() : args.deterministicSeed.thumbnailConcept,
    durationMinutes: Math.max(5, Math.min(15, Math.round(Number(r.durationMinutes) || 8))),
    shortsCount: Math.max(0, Math.min(4, Math.round(Number(r.shortsCount) || args.shortsCount)))
  };
}
