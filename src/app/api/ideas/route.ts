import { NextResponse } from 'next/server';
import { ideaInput } from '@/lib/validators';
import { generateIdeas } from '@/lib/idea-engine';

export const runtime = 'nodejs';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const niche = searchParams.get('niche') ?? 'personal-finance';
  const audience = searchParams.get('audience') ?? 'finance beginners';
  const region = searchParams.get('region') ?? 'US';
  const language = searchParams.get('language') ?? 'en';
  const monetizationGoal = searchParams.get('monetizationGoal') ?? 'balanced';
  const count = Number.parseInt(searchParams.get('count') ?? '10', 10);
  const parsed = ideaInput.safeParse({ niche, audience, region, language, monetizationGoal, count });
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
  return NextResponse.json({ ideas: generateIdeas(parsed.data) });
}
