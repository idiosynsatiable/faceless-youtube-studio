import { NextResponse } from 'next/server';
import { shortsMetadataInput } from '@/lib/validators';
import { generateShorts } from '@/lib/shorts-engine';
import { runDisclaimerEngine } from '@/lib/disclaimer-engine';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = shortsMetadataInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const data = parsed.data;
  const [concept] = generateShorts({
    niche: data.niche,
    audience: data.audience,
    topic: data.shortTitle,
    longFormTitle: data.longFormTitle,
    formats: [data.format],
    count: 1,
    hasAffiliateLinks: data.hasAffiliateLinks,
    hasSponsor: data.hasSponsor,
    topicFlags: data.topicFlags
  });
  const disc = runDisclaimerEngine({
    flags: {
      hasAffiliateLinks: data.hasAffiliateLinks,
      hasSponsor: data.hasSponsor,
      aiGeneratedContent: true,
      thirdPartyFootage: false
    },
    topicFlags: data.topicFlags ?? []
  });
  return NextResponse.json({
    metadata: {
      title: concept.shortTitle,
      description: concept.description,
      hashtags: concept.hashtags,
      pinnedComment: concept.pinnedComment,
      cta: concept.cta,
      disclosure: disc.required.map((d) => d.text).join(' '),
      disclaimers: disc.required
    }
  });
}
