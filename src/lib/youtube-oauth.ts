// YouTube OAuth abstraction. Disabled-safe by default.

import { config } from './config';

export interface OAuthState {
  enabled: boolean;
  redirectUri: string;
  clientId: string;
}

export function oauthState(): OAuthState {
  return {
    enabled: config.youtube.enabled,
    redirectUri: config.youtube.redirectUri,
    clientId: config.youtube.clientId
  };
}

export function buildAuthorizeUrl(state: string, scopes: string[] = ['https://www.googleapis.com/auth/youtube.upload', 'https://www.googleapis.com/auth/youtube.readonly']): string | null {
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
