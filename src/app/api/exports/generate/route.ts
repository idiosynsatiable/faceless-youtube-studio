import { NextResponse } from 'next/server';
import { combinedBundleInput, shortsBundleInputSchema, exportInput } from '@/lib/validators';
import { buildExportBundle, buildShortsBundle, buildCombinedBundle } from '@/lib/export-package';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const probe = (body && typeof body === 'object') ? (body as { bundleType?: string }) : {};
  const bundleType = probe.bundleType ?? 'video';
  if (bundleType === 'shorts') {
    const parsed = shortsBundleInputSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json({ export: buildShortsBundle(parsed.data) });
  }
  if (bundleType === 'combined') {
    const parsed = combinedBundleInput.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
    return NextResponse.json({ export: buildCombinedBundle(parsed.data) });
  }
  const parsed = exportInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  return NextResponse.json({ export: buildExportBundle(parsed.data) });
}
