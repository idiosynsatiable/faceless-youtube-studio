import { NextResponse } from 'next/server';
import fs from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';
import { safeFilename } from '@/lib/security';
import { safeJoinUnderRoot } from '@/worker/path-allowlist';

export const runtime = 'nodejs';

const MAX_BYTES = 500 * 1024 * 1024;

type AssetRole = 'narration' | 'broll' | 'music' | 'sfx' | 'caption_track' | 'thumbnail_still';

const ROLE_BY_MIME: Record<string, AssetRole> = {
  'audio/wav': 'narration',
  'audio/x-wav': 'narration',
  'audio/wave': 'narration',
  'audio/mpeg': 'narration',
  'audio/mp3': 'narration',
  'audio/m4a': 'narration',
  'audio/x-m4a': 'narration',
  'audio/aac': 'narration',
  'audio/flac': 'narration',
  'video/mp4': 'broll',
  'video/quicktime': 'broll',
  'video/webm': 'broll',
  'video/x-matroska': 'broll',
  'image/jpeg': 'thumbnail_still',
  'image/png': 'thumbnail_still',
  'image/webp': 'thumbnail_still',
  'application/x-subrip': 'caption_track',
  'text/vtt': 'caption_track',
  'text/plain': 'caption_track'
};

const MIME_BY_EXTENSION: Record<string, string> = {
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/m4a',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.mp4': 'video/mp4',
  '.mov': 'video/quicktime',
  '.webm': 'video/webm',
  '.mkv': 'video/x-matroska',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.srt': 'application/x-subrip',
  '.vtt': 'text/vtt'
};

const formMetaSchema = z.object({
  userId: z.string().min(1).max(120),
  projectId: z.string().min(1).max(120)
});

function inputsRoot(): string {
  const list = (process.env.WORKER_INPUT_ALLOWLIST ?? '/var/lib/faceless-studio/inputs')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return path.resolve(/* turbopackIgnore: true */ list[0] ?? '/var/lib/faceless-studio/inputs');
}

function resolveMime(file: File): string {
  if (file.type && ROLE_BY_MIME[file.type]) return file.type;
  return MIME_BY_EXTENSION[path.extname(file.name).toLowerCase()] ?? file.type ?? 'application/octet-stream';
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
  if (file.size === 0) return NextResponse.json({ error: 'empty_file' }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'file_too_large', maxBytes: MAX_BYTES }, { status: 413 });

  const mime = resolveMime(file);
  const role = ROLE_BY_MIME[mime];
  if (!role) {
    return NextResponse.json(
      { error: 'mime_not_allowed', mime, allowed: Object.keys(ROLE_BY_MIME) },
      { status: 415 }
    );
  }

  const sanitizedFilename = safeFilename(file.name, 'asset');
  const root = inputsRoot();
  const joined = safeJoinUnderRoot(root, parsed.data.userId, parsed.data.projectId, sanitizedFilename);
  if (!joined.ok || !joined.resolved) {
    return NextResponse.json({ error: 'unsafe_path', reason: joined.reason ?? 'unknown' }, { status: 400 });
  }

  try {
    await fs.mkdir(path.dirname(joined.resolved), { recursive: true });
    await fs.writeFile(joined.resolved, Buffer.from(await file.arrayBuffer()));
  } catch (err) {
    return NextResponse.json(
      { error: 'write_failed', detail: err instanceof Error ? err.message : 'unknown filesystem error' },
      { status: 500 }
    );
  }

  return NextResponse.json({
    ok: true,
    relativePath: `${parsed.data.userId}/${parsed.data.projectId}/${sanitizedFilename}`,
    bytes: file.size,
    mime,
    role
  });
}
