import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getPrisma } from '@/lib/db';
import {
  exchangeAuthorizationCode,
  verifyAuthorizedChannel,
  YouTubeClientError
} from '@/lib/youtube-client';
import { verifyOAuthState } from '@/lib/youtube-oauth';
import { encryptSecret, CryptoVaultError } from '@/lib/crypto-vault';

export const runtime = 'nodejs';

const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? 'operator@faceless-studio.local';
const UPLOAD_SCOPE = 'https://www.googleapis.com/auth/youtube.upload';

function hasUploadScope(scope: string): boolean {
  return scope.split(/\s+/).includes(UPLOAD_SCOPE);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  if (!config.youtube.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'integration_disabled', detail: 'YouTube OAuth is not configured.' },
      { status: 503 }
    );
  }
  if (!config.youtube.authorizedChannelId && !config.youtube.authorizedChannelHandle) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'authorized_channel_not_configured',
        detail: 'Set YOUTUBE_AUTHORIZED_CHANNEL_HANDLE or YOUTUBE_AUTHORIZED_CHANNEL_ID before connecting YouTube OAuth.'
      },
      { status: 503 }
    );
  }
  if (error) {
    return NextResponse.json({ ok: false, reason: 'oauth_error', detail: error }, { status: 400 });
  }
  if (!code || !state) {
    return NextResponse.json({ ok: false, reason: 'missing_parameters' }, { status: 400 });
  }
  if (!verifyOAuthState(state)) {
    return NextResponse.json(
      { ok: false, reason: 'invalid_oauth_state', detail: 'The OAuth request expired or did not originate from this studio.' },
      { status: 400 }
    );
  }

  // Step 1: exchange authorization code for tokens.
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code);
  } catch (err) {
    const message = err instanceof YouTubeClientError ? err.message : 'token exchange failed';
    return NextResponse.json(
      { ok: false, reason: 'token_exchange_failed', detail: message },
      { status: 502 }
    );
  }
  if (!hasUploadScope(tokens.scope)) {
    return NextResponse.json(
      { ok: false, reason: 'required_scope_missing', detail: 'The granted consent did not include the YouTube upload scope.' },
      { status: 403 }
    );
  }

  // Step 2: resolve and lock the exact owner-approved YouTube identity before
  // storing a long-lived credential. A valid Google account is not sufficient.
  let channelInfo;
  try {
    channelInfo = await verifyAuthorizedChannel(tokens.accessToken, {
      channelId: config.youtube.authorizedChannelId || undefined,
      channelHandle: config.youtube.authorizedChannelHandle || undefined
    });
  } catch (err) {
    const message = err instanceof YouTubeClientError ? err.message : 'channel verification failed';
    return NextResponse.json(
      { ok: false, reason: 'authorized_channel_mismatch', detail: message },
      { status: 403 }
    );
  }

  // Step 3: encrypt the refresh token at rest.
  let encrypted;
  try {
    encrypted = encryptSecret(tokens.refreshToken);
  } catch (err) {
    const message = err instanceof CryptoVaultError ? err.message : 'encryption failed';
    return NextResponse.json(
      { ok: false, reason: 'encryption_failed', detail: message },
      { status: 500 }
    );
  }

  // Step 4: persist a single, immutable owner channel binding. Multi-tenant
  // deployments should replace the operator lookup with a signed user session.
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'database_unavailable',
        detail: 'Database not initialized in this environment. Apply prisma migrate deploy and set DATABASE_URL.'
      },
      { status: 503 }
    );
  }

  try {
    const user = await prisma.user.upsert({
      where: { email: OPERATOR_EMAIL },
      update: {},
      create: {
        email: OPERATOR_EMAIL,
        passwordHash: 'oauth-only-operator',
        subscriptionTier: 'studio'
      }
    });

    const ownerChannels = await prisma.channel.findMany({
      where: { userId: user.id, oauthConnected: true },
      select: { id: true, youtubeChannelId: true }
    });
    const conflicting = ownerChannels.find((channel) => channel.youtubeChannelId && channel.youtubeChannelId !== channelInfo.id);
    if (conflicting) {
      return NextResponse.json(
        {
          ok: false,
          reason: 'authorized_channel_already_locked',
          detail: 'This studio is already bound to a different YouTube channel. Clear the existing binding through an audited operator action before reconnecting.'
        },
        { status: 409 }
      );
    }

    const existing = await prisma.channel.findFirst({
      where: { userId: user.id, youtubeChannelId: channelInfo.id }
    });
    const channelData = {
      userId: user.id,
      youtubeChannelId: channelInfo.id,
      name: channelInfo.title,
      niche: existing?.niche ?? 'general',
      regionFocus: channelInfo.country ?? existing?.regionFocus ?? 'US',
      language: channelInfo.defaultLanguage ?? existing?.language ?? 'en',
      oauthConnected: true,
      oauthRefreshTokenCipher: encrypted.cipher,
      oauthRefreshTokenIv: encrypted.iv,
      oauthRefreshTokenAuthTag: encrypted.authTag,
      oauthScope: tokens.scope,
      oauthTokenUpdatedAt: new Date()
    };

    const channel = existing
      ? await prisma.channel.update({ where: { id: existing.id }, data: channelData })
      : await prisma.channel.create({ data: channelData });

    const redirectUrl = `${config.appUrl}/uploads?connected=${encodeURIComponent(channel.id)}`;
    return NextResponse.redirect(redirectUrl, { status: 302 });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        reason: 'persistence_failed',
        detail: err instanceof Error ? err.message : 'unknown database error'
      },
      { status: 500 }
    );
  }
}
