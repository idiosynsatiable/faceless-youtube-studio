import { randomUUID } from 'node:crypto';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getQueueProducer,
  QueueDisabledError,
  type RenderJobRequest
} from '@/lib/queue-producer';

export const runtime = 'nodejs';

const renderJobInput = z.object({
  userId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
  projectId: z.string().regex(/^[A-Za-z0-9_-]{8,120}$/),
  title: z.string().min(2).max(160),
  durationMinutes: z.number().min(1).max(60).default(8),
  shortsCount: z.number().int().min(0).max(10).default(1),
  storyboardScenes: z.number().int().min(1).max(40).default(8),
  style: z.enum(['cinematic', 'cinematic-clean', 'punchy', 'documentary']).default('cinematic-clean')
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const parsed = renderJobInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }

  const job: RenderJobRequest = {
    kind: 'render',
    id: randomUUID(),
    ...parsed.data,
    enqueuedAt: new Date().toISOString()
  };

  try {
    const result = await getQueueProducer().enqueue(job);
    return NextResponse.json(
      {
        ok: true,
        job: {
          id: job.id,
          status: 'queued',
          queueKey: result.queueKey,
          enqueuedAt: job.enqueuedAt
        }
      },
      { status: 202 }
    );
  } catch (err) {
    if (err instanceof QueueDisabledError) {
      return NextResponse.json(
        { ok: false, error: 'queue_disabled', detail: err.message },
        { status: 503 }
      );
    }
    return NextResponse.json(
      { ok: false, error: 'enqueue_failed', detail: err instanceof Error ? err.message : 'unknown error' },
      { status: 502 }
    );
  }
}
