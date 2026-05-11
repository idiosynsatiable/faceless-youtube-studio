// YouTube resumable video upload — pure fetch, no googleapis dependency.
//
// Two-step flow per https://developers.google.com/youtube/v3/docs/videos/insert
// "Resumable uploads":
// 1. POST to /upload/youtube/v3/videos?uploadType=resumable&part=snippet,status
//    with JSON metadata body. Response carries the upload URL in the
//    Location header.
// 2. PUT the file bytes to that URL with the correct Content-Type. We do a
//    single-shot PUT for files up to a configurable size (default 200 MB).
//    For larger files, operators should switch to chunked transfer; the
//    architecture supports it but we keep the scaffold simple.
//
// The worker refreshes the access token using the channel's stored refresh
// token immediately before initiating the upload to minimize 401s.

import fs from 'node:fs/promises';
import { refreshAccessToken, type FetchLike, YouTubeClientError } from '@/lib/youtube-client';

const INIT_URL = 'https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status';
const MAX_SINGLE_PUT_BYTES = 200 * 1024 * 1024;

export type UploadPrivacyStatus = 'private' | 'unlisted' | 'public';

export interface YouTubeUploadInput {
  filePath: string;
  refreshToken: string;
  title: string;
  description: string;
  tags: string[];
  categoryId: string;
  privacyStatus: UploadPrivacyStatus;
  scheduledAt?: string;
  contentType?: string;
}

export interface YouTubeUploadResult {
  ok: true;
  videoId: string;
  status: 'uploaded' | 'scheduled';
  uploadUrl: string;
}

export interface YouTubeUploadFailure {
  ok: false;
  reason:
    | 'refresh_failed'
    | 'init_failed'
    | 'init_no_location'
    | 'put_failed'
    | 'file_unreadable'
    | 'file_too_large';
  detail: string;
  status?: number;
}

export async function uploadVideoToYouTube(
  input: YouTubeUploadInput,
  fetchImpl: FetchLike = fetch
): Promise<YouTubeUploadResult | YouTubeUploadFailure> {
  // Pre-flight: confirm the file is readable and within the single-PUT limit.
  let fileBytes: Buffer;
  try {
    fileBytes = await fs.readFile(input.filePath);
  } catch (err) {
    return {
      ok: false,
      reason: 'file_unreadable',
      detail: err instanceof Error ? err.message : 'cannot read file'
    };
  }
  if (fileBytes.byteLength > MAX_SINGLE_PUT_BYTES) {
    return {
      ok: false,
      reason: 'file_too_large',
      detail: `file is ${fileBytes.byteLength} bytes, single-PUT cap is ${MAX_SINGLE_PUT_BYTES}`
    };
  }

  // Step 1: refresh access token.
  let accessToken: string;
  try {
    const refreshed = await refreshAccessToken(input.refreshToken, fetchImpl);
    accessToken = refreshed.accessToken;
  } catch (err) {
    return {
      ok: false,
      reason: 'refresh_failed',
      detail: err instanceof YouTubeClientError ? err.message : 'refresh failed',
      status: err instanceof YouTubeClientError ? err.status : undefined
    };
  }

  // Step 2: initiate resumable upload — POST metadata, capture Location header.
  const contentType = input.contentType ?? 'video/mp4';
  const body = JSON.stringify({
    snippet: {
      title: input.title,
      description: input.description,
      tags: input.tags,
      categoryId: input.categoryId
    },
    status: {
      privacyStatus: input.privacyStatus,
      publishAt: input.scheduledAt,
      selfDeclaredMadeForKids: false
    }
  });
  const initRes = await fetchImpl(INIT_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Upload-Content-Type': contentType,
      'X-Upload-Content-Length': String(fileBytes.byteLength)
    },
    body
  });
  if (!initRes.ok) {
    let detail = `init responded ${initRes.status}`;
    try {
      const j = await initRes.json();
      detail = JSON.stringify(j);
    } catch {
      // ignore
    }
    return { ok: false, reason: 'init_failed', detail, status: initRes.status };
  }
  const uploadUrl = initRes.headers.get('location') ?? initRes.headers.get('Location');
  if (!uploadUrl) {
    return { ok: false, reason: 'init_no_location', detail: 'YouTube did not return an upload URL' };
  }

  // Step 3: PUT the file bytes.
  const putRes = await fetchImpl(uploadUrl, {
    method: 'PUT',
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(fileBytes.byteLength)
    },
    body: fileBytes
  });
  if (!putRes.ok) {
    let detail = `PUT responded ${putRes.status}`;
    try {
      const j = await putRes.json();
      detail = JSON.stringify(j);
    } catch {
      // ignore
    }
    return { ok: false, reason: 'put_failed', detail, status: putRes.status };
  }

  let payload: { id?: string; status?: { uploadStatus?: string } } | null = null;
  try {
    payload = await putRes.json();
  } catch {
    // ignore
  }
  const videoId = payload?.id;
  if (!videoId) {
    return { ok: false, reason: 'put_failed', detail: 'PUT succeeded but response had no video id' };
  }
  return {
    ok: true,
    videoId,
    status: input.scheduledAt ? 'scheduled' : 'uploaded',
    uploadUrl
  };
}
