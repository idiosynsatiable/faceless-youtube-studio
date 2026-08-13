// YouTube OAuth abstraction. Disabled-safe by default.

import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { config } from './config';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;

export interface OAuthState {
  enabled: boolean;
  redirectUri: string;
  clientId: string;
  authorizedChannelId: string;
  authorizedChannelHandle: string;
}

export interface ParsedOAuthState {
  nonce: string;
  issuedAt: number;
}

function base64Url(value: string): string {
  return Buffer.from(value, 'utf8').toString('base64url');
}

function fromBase64Url(value: string): string | null {
  try {
    return Buffer.from(value, 'base64url').toString('utf8');
  } catch {
    return null;
  }
}

function sign(value: string): string {
  return createHmac('sha256', config.oauthStateSecret).update(value).digest('base64url');
}

export function oauthState(): OAuthState {
  return {
    enabled: config.youtube.enabled,
    redirectUri: config.youtube.redirectUri,
    clientId: config.youtube.clientId,
    authorizedChannelId: config.youtube.authorizedChannelId,
    authorizedChannelHandle: config.youtube.authorizedChannelHandle
  };
}

export function createOAuthState(now = Date.now()): string {
  const payload = base64Url(JSON.stringify({ nonce: randomBytes(24).toString('base64url'), issuedAt: now }));
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(state: string, now = Date.now()): ParsedOAuthState | null {
  const [payload, signature, ...rest] = state.split('.');
  if (!payload || !signature || rest.length > 0) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

  const decoded = fromBase64Url(payload);
  if (!decoded) return null;
  try {
    const parsed = JSON.parse(decoded) as { nonce?: unknown; issuedAt?: unknown };
    if (typeof parsed.nonce !== 'string' || parsed.nonce.length < 16 || typeof parsed.issuedAt !== 'number') return null;
    if (parsed.issuedAt > now + 30_000 || now - parsed.issuedAt > OAUTH_STATE_TTL_MS) return null;
    return { nonce: parsed.nonce, issuedAt: parsed.issuedAt };
  } catch {
    return null;
  }
}

export function buildAuthorizeUrl(
  state: string,
  scopes: string[] = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']
): string | null {
  if (!config.youtube.enabled) return null;
  const params = new URLSearchParams({
    client_id: config.youtube.clientId,
    redirect_uri: config.youtube.redirectUri,
    response_type: 'code',
    scope: scopes.join(' '),
    access_type: 'offline',
    include_granted_scopes: 'true',
    prompt: 'consent',
    state
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export interface DisabledModeResponse {
  ok: false;
  reason: 'integration_disabled';
  detail: string;
}

export const disabledOAuthResponse: DisabledModeResponse = {
  ok: false,
  reason: 'integration_disabled',
  detail: 'YouTube OAuth is disabled because YOUTUBE_CLIENT_ID or YOUTUBE_CLIENT_SECRET is not set.'
};
