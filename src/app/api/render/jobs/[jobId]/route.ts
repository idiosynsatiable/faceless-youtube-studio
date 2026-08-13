import path from 'node:path';
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { validateInputPath } from '@/worker/path-allowlist';
import type { JobOutcome } from '@/worker/types';

export const runtime = 'nodejs';

const STATUS_KEY = 'faceless:jobs:status';
const RESULT_KEY = 'faceless:jobs:result';

function exposeOutcome(outcome: JobOutcome) {
  const outputRoot = path.resolve(process.env.WORKER_OUTPUT_ROOT ?? '/var/lib/faceless-studio/exports');
  return {
    ...outcome,
    outputs: outcome.outputs.map((output) => {
      const validated = validateInputPath(output.absolutePath, [outputRoot]);
      const relativePath = validated.ok && validated.resolved
        ? path.relative(outputRoot, validated.resolved).split(path.sep).join('/')
        : null;
      return {
        profile: output.profile,
        width: output.width,
        height: output.height,
        durationSeconds: output.durationSeconds,
        downloadUrl: relativePath ? `/api/render/files?path=${encodeURIComponent(relativePath)}` : null
      };
    })
  };
}

export async function GET(
  _request: Request,
  context: { params: { jobId: string } }
) {
  const jobId = context.params.jobId;
  if (!/^[A-Za-z0-9-]{8,120}$/.test(jobId)) {
    return NextResponse.json({ error: 'invalid_job_id' }, { status: 400 });
  }
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return NextResponse.json({ error: 'queue_disabled', detail: 'REDIS_URL is not configured.' }, { status: 503 });
  }

  const client = createClient({ url: redisUrl });
  client.on('error', () => undefined);
  try {
    await client.connect();
    const [resultJson, statusJson] = await Promise.all([
      client.hGet(RESULT_KEY, jobId),
      client.hGet(STATUS_KEY, jobId)
    ]);

    if (resultJson) {
      const outcome = JSON.parse(resultJson) as JobOutcome;
      return NextResponse.json({ ok: true, status: outcome.status, outcome: exposeOutcome(outcome) });
    }
    if (statusJson) {
      return NextResponse.json({ ok: true, ...JSON.parse(statusJson) });
    }
    return NextResponse.json({ error: 'job_not_found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: 'status_unavailable', detail: err instanceof Error ? err.message : 'unknown error' },
      { status: 503 }
    );
  } finally {
    if (client.isOpen) await client.quit();
  }
}
