import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { safeFilename } from '@/lib/security';
import { safeJoinUnderRoot } from '@/worker/path-allowlist';

export const runtime = 'nodejs';

const MAX_BYTES = 500 * 1024 * 1024; // 500 MB

const ROLE_BY_MIME: Record<string, 'narration' | 'broll' | 'music' | 'sfx' | 'caption_track' | 'thumbnail_still'> = {
  'audio/wav': 'narration',
  'audio/x-wav': 'narration',
  'audio/wave': 'narration',
  'audio/mpeg': 'narration',
  'audio/mp3': 'narration',
  'audio/m4a': 'narration',
  'audio/x-m4a': 'narration',
  'video/mp4': 'broll',
  'video/quicktime': 'broll',
  'video/webm': 'broll',
  'image/jpeg': 'thumbnail_still',
  'image/png': 'thumbnail_still',
  'image/webp': 'thumbnail_still',
  'application/x-subrip': 'caption_track',
  'text/vtt': 'caption_track',
  'text/plain': 'caption_track'
};

const ALLOWED_MIME_TYPES = new Set(Object.keys(ROLE_BY_MIME));

const formMetaSchema = z.object({
  userId: z.string().min(1).max(120),
  projectId: z.string().min(1).max(120)
});

function inputsRoot(): string {
  const list = (process.env.WORKER_INPUT_ALLOWLIST ?? '/var/lib/faceless-studio/inputs')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length === 0) return '/var/lib/faceless-studio/inputs';
  // Assets are written to the first allowlisted prefix.
  return path.resolve(list[0]);
}

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'invalid_form' }, { status: 400 });
  }

  const parsed = formMetaSchema.safeParse({
    userId: String(form.get('userId') ?? ''),
    projectId: String(form.get('projectId') ?? '')
  });
  if (!parsed.success) {
    return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  }

  const file = form.get('file');
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'missing_file', detail: 'expected multipart field "file"' }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: 'empty_file' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 413 });
  }

  const mime = file.type || 'application/octet-stream';
  if (!ALLOWED_MIME_TYPES.has(mime)) {
    return NextResponse.json(
      {
        error: 'mime_not_allowed',
        mime,
        allowed: Array.from(ALLOWED_MIME_TYPES)
      },
      { status: 415 }
    );
  }

  const sanitizedFilename = safeFilename(file.name, 'asset');
  const role = ROLE_BY_MIME[mime];

  // Build the absolute path and verify it's inside the inputs allowlist root.
  const root = inputsRoot();
  const joined = safeJoinUnderRoot(root, parsed.data.userId, parsed.data.projectId, sanitizedFilename);
  if (!joined.ok || !joined.resolved) {
    return NextResponse.json(
      { error: 'unsafe_path', reason: joined.reason ?? 'unknown' },
      { status: 400 }
    );
  }

  try {
    await fs.mkdir(path.dirname(joined.resolved), { recursive: true });
    const bytes = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(joined.resolved, bytes);
  } catch (err) {
    return NextResponse.json(
      {
        error: 'write_failed',
        detail: err instanceof Error ? err.message : 'unknown filesystem error'
      },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    path: joined.resolved,
    relativePath: `${parsed.data.userId}/${parsed.data.projectId}/${sanitizedFilename}`,
    bytes: file.size,
    mime,
    role
  });
}
