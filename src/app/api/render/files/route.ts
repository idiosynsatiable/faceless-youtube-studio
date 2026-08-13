import path from 'node:path';
import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { NextResponse } from 'next/server';
import { safeJoinUnderRoot } from '@/worker/path-allowlist';

export const runtime = 'nodejs';

function contentType(filename: string): string {
  if (filename.endsWith('.mp4')) return 'video/mp4';
  if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) return 'image/jpeg';
  if (filename.endsWith('.png')) return 'image/png';
  return 'application/octet-stream';
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const relativePath = url.searchParams.get('path') ?? '';
  if (!relativePath || relativePath.length > 500) {
    return NextResponse.json({ error: 'invalid_path' }, { status: 400 });
  }

  const root = path.resolve(process.env.WORKER_OUTPUT_ROOT ?? '/var/lib/faceless-studio/exports');
  const joined = safeJoinUnderRoot(root, relativePath);
  if (!joined.ok || !joined.resolved || joined.resolved.includes(`${path.sep}_work${path.sep}`)) {
    return NextResponse.json({ error: 'unsafe_path' }, { status: 400 });
  }

  try {
    const stat = await fs.stat(joined.resolved);
    if (!stat.isFile()) return NextResponse.json({ error: 'not_found' }, { status: 404 });
    const filename = path.basename(joined.resolved).replace(/[^A-Za-z0-9._-]/g, '_');
    const nodeStream = createReadStream(joined.resolved);
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
