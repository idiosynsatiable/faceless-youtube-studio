import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { NextResponse } from 'next/server';
import { createClient } from 'redis';
import { completedOutputPath } from '@/lib/render-artifacts';
import type { JobOutcome } from '@/worker/types';

export const runtime = 'nodejs';

const RESULT_KEY = 'faceless:jobs:result';

function contentType(filename: string): string {
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const jobId = url.searchParams.get('jobId') ?? '';
  const relativePath = url.searchParams.get('path') ?? '';
  if (!/^[A-Za-z0-9-]{8,120}$/.test(jobId)) {
    return NextResponse.json({ error: 'invalid_job_id' }, { status: 400 });
  }
  if (!relativePath || relativePath.length > 500) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    return NextResponse.json({ error: 'queue_disabled', detail: 'REDIS_URL is not configured.' }, { status: 503 });
  }

  const root = path.resolve(/* turbopackIgnore: true */ process.env.WORKER_OUTPUT_ROOT ?? '/var/lib/faceless-studio/exports');
  const client = createClient({ url: redisUrl });
  client.on('error', () => undefined);

  let outputPath: string | null = null;
  try {
    await client.connect();
    const resultJson = await client.hGet(RESULT_KEY, jobId);
    if (!resultJson) return NextResponse.json({ error: 'job_not_found' }, { status: 404 });

    let outcome: JobOutcome;
    try {
      outcome = JSON.parse(resultJson) as JobOutcome;
    } catch {
      return NextResponse.json({ error: 'job_result_invalid' }, { status: 503 });
    }
    outputPath = completedOutputPath(outcome, root, relativePath);
    if (!outputPath) return NextResponse.json({ error: 'output_not_found' }, { status: 404 });
  } catch (err) {
    return NextResponse.json(
      { error: 'status_unavailable', detail: err instanceof Error ? err.message : 'unknown error' },
      { status: 503 }
    );
  } finally {
    if (client.isOpen) await client.quit();
  }

  try {
    const stat = await fs.stat(/* turbopackIgnore: true */ outputPath);
    if (!stat.isFile()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const filename = path.basename(outputPath).replace(/[^A-Za-z0-9._-]/g, '_');
    const nodeStream = createReadStream(/* turbopackIgnore: true */ outputPath);
    return new Response(nodeStream as unknown as BodyInit, {
      headers: {
        'Content-Type': contentType(filename),
        'Content-Length': String(stat.size),
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
        'X-Content-Type-Options': 'nosniff'
      }
    });
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
}
