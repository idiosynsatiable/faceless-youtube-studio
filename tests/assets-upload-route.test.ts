import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'faceless-assets-'));
  process.env.WORKER_INPUT_ALLOWLIST = tmpRoot;
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
  delete process.env.WORKER_INPUT_ALLOWLIST;
});

function makeForm(opts: { userId?: string; projectId?: string; filename?: string; mime?: string; bytes?: Buffer }): Request {
  const form = new FormData();
  if (opts.userId !== undefined) form.set('userId', opts.userId);
  if (opts.projectId !== undefined) form.set('projectId', opts.projectId);
  if (opts.bytes) {
    const file = new File([opts.bytes], opts.filename ?? 'asset.mp4', { type: opts.mime ?? 'video/mp4' });
    form.set('file', file);
  }
  return new Request('https://example.com/api/assets/upload', { method: 'POST', body: form });
}

describe('POST /api/assets/upload', () => {
  it('rejects when the form is missing the file field', async () => {
    const route = await import('@/app/api/assets/upload/route');
    const res = await route.POST(makeForm({ userId: 'u1', projectId: 'p1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('missing_file');
  });

  it('rejects when userId or projectId is missing', async () => {
    const route = await import('@/app/api/assets/upload/route');
    const res = await route.POST(
      makeForm({ projectId: 'p1', filename: 'a.mp4', mime: 'video/mp4', bytes: Buffer.from('x') })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('invalid_input');
  });

  it('rejects a disallowed mime type', async () => {
    const route = await import('@/app/api/assets/upload/route');
    const res = await route.POST(
      makeForm({ userId: 'u1', projectId: 'p1', filename: 'evil.exe', mime: 'application/x-msdownload', bytes: Buffer.from('x') })
    );
    expect(res.status).toBe(415);
    expect((await res.json()).error).toBe('mime_not_allowed');
  });

  it('writes an allowed file under the inputs allowlist and returns its path', async () => {
    const payload = Buffer.from('FAKE-MP4');
    const route = await import('@/app/api/assets/upload/route');
    const res = await route.POST(
      makeForm({ userId: 'user-1', projectId: 'proj-1', filename: 'scene 1.mp4', mime: 'video/mp4', bytes: payload })
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.role).toBe('broll');
    expect(body.bytes).toBe(payload.byteLength);
    expect(body.path.startsWith(tmpRoot)).toBe(true);
    const onDisk = await fs.readFile(body.path);
    expect(onDisk.equals(payload)).toBe(true);
  });

  it('refuses path-traversal in userId / projectId', async () => {
    const route = await import('@/app/api/assets/upload/route');
    const res = await route.POST(
      makeForm({
        userId: '../etc',
        projectId: '../passwd',
        filename: 'x.mp4',
        mime: 'video/mp4',
        bytes: Buffer.from('x')
      })
    );
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe('unsafe_path');
  });
});
