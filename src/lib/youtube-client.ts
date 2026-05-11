// YouTube + Google OAuth REST client.
//
// Pure fetch — no googleapis npm dependency. Implements:
// - authorization-code → token exchange  (oauth2.googleapis.com/token)
// - refresh-token → access-token refresh
// - youtube.channels.list?mine=true to identify the connected channel
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

export class YouTubeClientError extends Error {
  constructor(message: string, public readonly status?: number, public readonly body?: unknown) {
    super(message);
    this.name = 'YouTubeClientError';
  }
}

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels?mine=true&part=snippet';

function ensureConfigured(): void {
  if (!config.youtube.enabled) {
    throw new YouTubeClientError('YouTube OAuth is not configured (YOUTUBE_CLIENT_ID / SECRET missing).');
  }
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
  const items: unknown = (payload as { items?: unknown[] }).items;
  if (!Array.isArray(items) || items.length === 0) {
    throw new YouTubeClientError('channels.list returned no items — the OAuthed account has no YouTube channel');
  }
  const first = items[0] as { id: string; snippet?: { title?: string; defaultLanguage?: string; country?: string } };
  if (!first.id) {
    throw new YouTubeClientError('channels.list item has no id');
  }
  return {
    id: first.id,
    title: first.snippet?.title ?? 'untitled',
    defaultLanguage: first.snippet?.defaultLanguage,
    country: first.snippet?.country
  };
}
