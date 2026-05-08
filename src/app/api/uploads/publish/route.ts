import { NextResponse } from 'next/server';
import { uploadPublishInput, uploadPrepareInput } from '@/lib/validators';
import { preparePackage, publishOutcome } from '@/lib/youtube-upload';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = uploadPublishInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'authorization_required', detail: 'Publish requires authorization=user_confirmed plus a videoProjectId.' },
      { status: 401 }
    );
  }
  if (!config.youtube.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'integration_disabled', detail: 'Connect a YouTube account before publishing.' },
      { status: 503 }
    );
  }
  const draftInput = uploadPrepareInput.parse({
    videoProjectId: parsed.data.videoProjectId,
    title: 'Pending publish - draft loaded by worker',
    description: '',
    tags: [],
    privacyStatus: parsed.data.privacyStatus,
    scheduledAt: parsed.data.scheduledAt
  });
  const draft = preparePackage(draftInput);
  const outcome = publishOutcome(parsed.data, draft);
  if (outcome.reason === 'authorization_required') {
    return NextResponse.json({ ok: false, ...outcome }, { status: 401 });
  }
  if (outcome.reason === 'integration_disabled') {
    return NextResponse.json({ ok: false, ...outcome }, { status: 503 });
  }
  return NextResponse.json({ ok: true, ...outcome });
}
