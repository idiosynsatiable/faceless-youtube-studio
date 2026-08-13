// YouTube + Google OAuth REST client.
// Pure fetch, with injectable transport for deterministic tests.

import { config } from './config';
import { channelMatchesTarget } from './channel-lock';

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
const CHANNELS_URL = 'https://www.googleapis.com/youtube/v3/channels';

function ensureConfigured(): void {
  if (!config.youtube.enabled) {
    throw new YouTubeClientError('YouTube OAuth is not configured (YOUTUBE_CLIENT_ID / SECRET missing).');
  }
}

function parseChannel(payload: unknown): YouTubeChannelInfo {
  const items = (payload as { items?: unknown[] } | null)?.items;
  if (!Array.isArray(items) || items.length === 0) throw new YouTubeClientError('channels.list returned no items');
  const first = items[0] as { id?: string; snippet?: { title?: string; defaultLanguage?: string; country?: string } };
  if (!first.id) throw new YouTubeClientError('channels.list item has no id');
  return {
    id: first.id,
    title: first.snippet?.title ?? 'untitled',
    defaultLanguage: first.snippet?.defaultLanguage,
    country: first.snippet?.country
  };
}

export async function exchangeAuthorizationCode(code: string, fetchImpl: FetchLike = fetch): Promise<OAuthTokenSet> {
  ensureConfigured();
  const body = new URLSearchParams({
    code,
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    redirect_uri: config.youtube.redirectUri,
    grant_type: 'authorization_code'
  });
  const res = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) throw new YouTubeClientError(`token exchange failed (${res.status})`, res.status, payload);
  const p = payload as Record<string, unknown>;
  if (!p.refresh_token) throw new YouTubeClientError('token response is missing refresh_token. Force consent with prompt=consent.', res.status, payload);
  return {
    accessToken: String(p.access_token),
    refreshToken: String(p.refresh_token),
    expiresInSeconds: Number(p.expires_in ?? 0),
    scope: String(p.scope ?? ''),
    tokenType: String(p.token_type ?? 'Bearer')
  };
}

export async function refreshAccessToken(refreshToken: string, fetchImpl: FetchLike = fetch): Promise<RefreshedAccessToken> {
  ensureConfigured();
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    client_id: config.youtube.clientId,
    client_secret: config.youtube.clientSecret,
    grant_type: 'refresh_token'
  });
  const res = await fetchImpl(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload || !(payload as Record<string, unknown>).access_token) {
    throw new YouTubeClientError(`token refresh failed (${res.status})`, res.status, payload);
  }
  const p = payload as Record<string, unknown>;
  return {
    accessToken: String(p.access_token),
    expiresInSeconds: Number(p.expires_in ?? 0),
    scope: String(p.scope ?? ''),
    tokenType: String(p.token_type ?? 'Bearer')
  };
}

export async function getMyChannel(accessToken: string, fetchImpl: FetchLike = fetch): Promise<YouTubeChannelInfo> {
  const res = await fetchImpl(`${CHANNELS_URL}?mine=true&part=snippet`, { headers: { Authorization: `Bearer ${accessToken}` } });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) throw new YouTubeClientError(`channels.list failed (${res.status})`, res.status, payload);
  return parseChannel(payload);
}

export async function getChannelByHandle(accessToken: string, handle: string, fetchImpl: FetchLike = fetch): Promise<YouTubeChannelInfo> {
  const normalized = handle.startsWith('@') ? handle : `@${handle}`;
  const res = await fetchImpl(`${CHANNELS_URL}?part=snippet&forHandle=${encodeURIComponent(normalized)}`, {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const payload = await res.json().catch(() => null);
  if (!res.ok || !payload) throw new YouTubeClientError(`channels.list forHandle failed (${res.status})`, res.status, payload);
  return parseChannel(payload);
}

export interface ChannelLockResult {
  ok: boolean;
  mine: YouTubeChannelInfo;
  target: YouTubeChannelInfo;
  reason?: 'channel_mismatch' | 'channel_id_mismatch';
}

export async function verifyTargetChannel(
  accessToken: string,
  targetHandle: string,
  expectedChannelId = '',
  fetchImpl: FetchLike = fetch
): Promise<ChannelLockResult> {
  const [mine, target] = await Promise.all([
    getMyChannel(accessToken, fetchImpl),
    getChannelByHandle(accessToken, targetHandle, fetchImpl)
  ]);
  if (!channelMatchesTarget(mine, target)) return { ok: false, mine, target, reason: 'channel_mismatch' };
  if (!channelMatchesTarget(mine, target, expectedChannelId)) return { ok: false, mine, target, reason: 'channel_id_mismatch' };
  return { ok: true, mine, target };
}
