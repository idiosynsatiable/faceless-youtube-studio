import { NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
import { uploadPublishInput, uploadPrepareInput } from '@/lib/validators';
import { preparePackage, publishOutcome } from '@/lib/youtube-upload';
import { config } from '@/lib/config';
import {
  getQueueProducer,
  QueueDisabledError,
  type UploadJobRequest
} from '@/lib/queue-producer';

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
      {
        error: 'authorization_required',
        detail:
          'Publish requires authorization=user_confirmed plus a videoProjectId. Refusing to publish without explicit user authorization.'
      },
      { status: 401 }
    );
  }
  if (!config.youtube.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'integration_disabled', detail: 'Connect a YouTube account before publishing.' },
      { status: 503 }
    );
  }

  // Compute the publish outcome via the youtube-upload helper. This double-
  // checks the authorization gate and the integration gate, and returns the
  // sanitized package the worker will load.
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

  // Build the queue payload. The worker hydrates this into a full AssemblyJob
  // by reading the VideoProject from the database.
  const queueRequest: UploadJobRequest = {
    id: randomUUID(),
    videoProjectId: parsed.data.videoProjectId,
    privacyStatus: parsed.data.privacyStatus,
    scheduledAt: parsed.data.scheduledAt,
    enqueuedAt: new Date().toISOString(),
    authorization: 'user_confirmed'
  };

  const producer = getQueueProducer();
  let enqueueResult;
  try {
    enqueueResult = await producer.enqueue(queueRequest);
  } catch (err) {
    if (err instanceof QueueDisabledError) {
      return NextResponse.json(
        { ok: false, reason: 'queue_disabled', detail: err.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      {
        ok: false,
        reason: 'enqueue_failed',
        detail: err instanceof Error ? err.message : 'unknown error'
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      ok: true,
      ...outcome,
      job: {
        id: queueRequest.id,
        queueKey: enqueueResult.queueKey,
        enqueuedAt: queueRequest.enqueuedAt
      }
    },
    { status: 202 }
  );
}
