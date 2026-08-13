// YouTube + Google OAuth REST client.
//
// Pure fetch — no googleapis npm dependency. Implements:
// - authorization-code → token exchange (oauth2.googleapis.com/token)
// - refresh-token → access-token refresh
// - youtube.channels.list?mine=true to identify the connected channel
// - explicit expected-channel checks before credentials can be stored or used
//
// All functions accept an explicit `fetchImpl` parameter so tests can inject
// a deterministic mock instead of hitting the real Google endpoints.

import { config } from './config';

export type FetchLike = typeof fetch;

export interface OAuthTokenSet {
  accessToken: string;
  refreshToken: string;
  expiresInSeconds: number;
  scope: string;
  tokenType: string;
}

export interface RefreshedAccessToken {
  accessToken: string;
  expiresInSeconds: number;
  scope: string;
  tokenType: string;
}

export interface YouTubeChannelInfo {
  id: string;
  title: string;
  defaultLanguage?: string;
  country?: string;
}

export interface AuthorizedChannelExpectation {
  channelId?: string;
  channelHandle?: string;
}

export class YouTubeClientError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message);
    this.name = 'YouTubeClientError';
  }
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels?mine=true&part=snippet';
const CHANNEL_BY_HANDLE_URL = 'https://www.googleapis.com/youtube/v3/channels?part=snippet&forHandle=';

function ensureConfigured(): void {
  if (!config.youtube.enabled) {
    throw new YouTubeClientError('YouTube OAuth is not configured (YOUTUBE_CLIENT_ID / SECRET missing).');
  }
}

function normalizeHandle(handle: string): string {
  return handle.trim().replace(/^@/, '').toLowerCase();
}

function requireChannelId(payload: unknown, context: string): YouTubeChannelInfo {
  const items = (payload as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new YouTubeClientError(`${context} returned no channel items`);
  }
  const first = items[0] as { id?: unknown; snippet?: { title?: unknown; defaultLanguage?: unknown; country?: unknown } };
  if (typeof first.id !== 'string' || first.id.length === 0) {
    throw new YouTubeClientError(`${context} item has no channel id`);
  }
  return {
    id: first.id,
    title: typeof first.snippet?.title === 'string' ? first.snippet.title : 'untitled',
    defaultLanguage: typeof first.snippet?.defaultLanguage === 'string' ? first.snippet.defaultLanguage : undefined,
    country: typeof first.snippet?.country === 'string' ? first.snippet.country : undefined
  };
}

export async function exchangeAuthorizationCode(
  code: string,
  fetchImpl: FetchLike = fetch
): Promise<OAuthTokenSet> {
  ensureConfigured();
  const body = new URLSearchParams({
    code,
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    redirect_uri: config.youtube.redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) {
    throw new YouTubeClientError(
      `token exchange failed (${res.status})`,
      res.status,
      payload
    );
  }
  if (!payload.refresh_token) {
    throw new YouTubeClientError(
      'token response is missing refresh_token. The user may have previously consented; force consent with prompt=consent on the authorize URL.',
      res.status,
      payload
    );
  }
  return {
    accessToken: String(payload.access_token),
    refreshToken: String(payload.refresh_token),
    expiresInSeconds: Number(payload.expires_in ?? 0),
    scope: String(payload.scope ?? ''),
    tokenType: String(payload.token_type ?? 'Bearer')
  };
}

export async function refreshAccessToken(
  refreshToken: string,
  fetchImpl: FetchLike = fetch
): Promise<RefreshedAccessToken> {
  ensureConfigured();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    grant_type: 'refresh_token'
  });
  const res = await fetchImpl(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload || !payload.access_token) {
    throw new YouTubeClientError(`token refresh failed (${res.status})`, res.status, payload);
  }
  return {
    accessToken: String(payload.access_token),
    expiresInSeconds: Number(payload.expires_in ?? 0),
    scope: String(payload.scope ?? ''),
    tokenType: String(payload.token_type ?? 'Bearer')
  };
}

export async function getMyChannel(
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<YouTubeChannelInfo> {
  const res = await fetchImpl(CHANNELS_URL, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) {
    throw new YouTubeClientError(`channels.list failed (${res.status})`, res.status, payload);
  }
  return requireChannelId(payload, 'channels.list?mine=true');
}

export async function getChannelByHandle(
  handle: string,
  accessToken: string,
  fetchImpl: FetchLike = fetch
): Promise<YouTubeChannelInfo> {
  const normalized = normalizeHandle(handle);
  if (!normalized) throw new YouTubeClientError('an authorized channel handle is required');
  const res = await fetchImpl(`${CHANNEL_BY_HANDLE_URL}${encodeURIComponent(`@${normalized}`)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) {
    throw new YouTubeClientError(`channel handle lookup failed (${res.status})`, res.status, payload);
  }
  return requireChannelId(payload, `channels.list?forHandle=@${normalized}`);
}

/**
 * Confirms that the current OAuth token resolves to the owner-approved channel.
 * This is intentionally called after every refresh, immediately before upload.
 */
export async function verifyAuthorizedChannel(
  accessToken: string,
  expectation: AuthorizedChannelExpectation,
  fetchImpl: FetchLike = fetch
): Promise<YouTubeChannelInfo> {
  if (!expectation.channelId && !expectation.channelHandle) {
    throw new YouTubeClientError('authorized channel configuration is missing; refuse to publish without a channel lock');
  }

  const mine = await getMyChannel(accessToken, fetchImpl);
  if (expectation.channelId && mine.id !== expectation.channelId) {
    throw new YouTubeClientError(`authenticated channel mismatch: expected ${expectation.channelId}, received ${mine.id}`);
  }

  if (expectation.channelHandle) {
    const expected = await getChannelByHandle(expectation.channelHandle, accessToken, fetchImpl);
    if (mine.id !== expected.id) {
      throw new YouTubeClientError(`authenticated channel does not match authorized handle @${normalizeHandle(expectation.channelHandle)}`);
    }
  }

  return mine;
}
