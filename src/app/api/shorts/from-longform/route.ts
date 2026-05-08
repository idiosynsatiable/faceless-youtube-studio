import { NextResponse } from 'next/server';
import { shortsFromLongformInput } from '@/lib/validators';
import { extractClips } from '@/lib/shorts-cutter';
import { generateShorts, type ShortsFormat } from '@/lib/shorts-engine';

export const runtime = 'nodejs';

const VARIANT_FORMATS: ShortsFormat[] = ['quick_hook_15s', 'mini_explainer_30s', 'high_retention_60s'];

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = shortsFromLongformInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const clips = extractClips({
    sourceVideoId: data.sourceVideoId,
    sourceVideoTitle: data.sourceVideoTitle,
    scriptText: data.scriptText,
    segments: data.segments,
    maxClips: data.maxClips,
    audience: data.audience
  });
  const variants = clips.map((clip) => {
    const concepts = VARIANT_FORMATS.map((format) => {
      const [c] = generateShorts({
        niche: data.niche,
        audience: data.audience,
        topic: clip.clipTitle,
        longFormTitle: data.sourceVideoTitle,
        longFormSummary: data.scriptText.slice(0, 600),
        formats: [format],
        count: 1,
        monetizationGoal: data.monetizationGoal,
        hasAffiliateLinks: data.hasAffiliateLinks,
        hasSponsor: data.hasSponsor,
        aiGeneratedContent: data.aiGeneratedContent,
        topicFlags: data.topicFlags
      });
      return c;
    });
    return { clip, variants: concepts };
  });
  return NextResponse.json({ source: data.sourceVideoTitle, clips, packages: variants });
}
