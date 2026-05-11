import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';

const ENV = {
  YOUTUBE_CLIENT_ID: 'test-client-id',
  YOUTUBE_CLIENT_SECRET: 'test-client-secret',
  YOUTUBE_REDIRECT_URI: 'http://localhost/api/youtube/callback'
};

let tmpFile: string;

beforeEach(async () => {
  vi.resetModules();
  Object.assign(process.env, ENV);
  tmpFile = path.join(os.tmpdir(), `vitest-upload-${Date.now()}.mp4`);
  await fs.writeFile(tmpFile, Buffer.from('FAKE-MP4-PAYLOAD'));
});

afterEach(async () => {
  await fs.rm(tmpFile, { force: true });
});

function mockFetch(handlers: Array<(url: string, init?: RequestInit) => Response>): typeof fetch {
  let i = 0;
  return (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const handler = handlers[i++];
    if (!handler) throw new Error(`unexpected fetch call ${i} for ${url}`);
    return handler(url, init);
  }) as typeof fetch;
}

describe('youtube uploader', () => {
  it('refreshes the token, initiates a resumable upload, and PUTs the file', async () => {
    const fetcher = mockFetch([
      // 1. refresh
      () => new Response(JSON.stringify({
        access_token: 'ya29.fresh',
        expires_in: 3599,
        scope: 'https://www.googleapis.com/auth/youtube.upload',
        token_type: 'Bearer'
      }), { status: 200, headers: { 'Content-Type': 'application/json' } }),
      // 2. init resumable
      (url) => {
        expect(url).toContain('/upload/youtube/v3/videos');
        return new Response('', {
          status: 200,
          headers: { Location: 'https://upload.example/resumable/xyz' }
        });
      },
      // 3. PUT
      (url) => {
        expect(url).toBe('https://upload.example/resumable/xyz');
        return new Response(JSON.stringify({
          id: 'YT_VIDEO_ID',
          status: { uploadStatus: 'uploaded' }
        }), { status: 200, headers: { 'Content-Type': 'application/json' } });
      }
    ]);

    const mod = await import('@/worker/youtube-uploader');
    const result = await mod.uploadVideoToYouTube(
      {
        filePath: tmpFile,
        refreshToken: '1//refresh',
        title: 'Index funds explained',
        description: 'Educational only. Not financial advice.',
        tags: ['index funds', 'investing'],
        categoryId: '27',
        privacyStatus: 'private'
      },
      fetcher
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.videoId).toBe('YT_VIDEO_ID');
      expect(result.status).toBe('uploaded');
    }
  });

  it('returns refresh_failed when the token endpoint returns 400', async () => {
    const fetcher = mockFetch([
      () => new Response(JSON.stringify({ error: 'invalid_grant' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      })
    ]);
    const mod = await import('@/worker/youtube-uploader');
    const result = await mod.uploadVideoToYouTube(
      {
        filePath: tmpFile,
        refreshToken: '1//bad',
        title: 't',
        description: 'd',
        tags: [],
        categoryId: '27',
        privacyStatus: 'private'
      },
      fetcher
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('refresh_failed');
  });

  it('returns file_unreadable when the input file does not exist', async () => {
    const mod = await import('@/worker/youtube-uploader');
    const result = await mod.uploadVideoToYouTube(
      {
        filePath: '/tmp/does-not-exist-zzz.mp4',
        refreshToken: '1//refresh',
        title: 't',
        description: 'd',
        tags: [],
        categoryId: '27',
        privacyStatus: 'private'
      },
      mockFetch([])
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('file_unreadable');
  });
});
