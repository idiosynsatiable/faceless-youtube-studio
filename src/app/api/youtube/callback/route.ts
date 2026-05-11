import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getPrisma } from '@/lib/db';
import {
  exchangeAuthorizationCode,
  getMyChannel,
  YouTubeClientError
} from '@/lib/youtube-client';
import { encryptSecret, CryptoVaultError } from '@/lib/crypto-vault';

export const runtime = 'nodejs';

const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? 'operator@faceless-studio.local';

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
  if (error) {
    return NextResponse.json({ ok: false, reason: 'oauth_error', detail: error }, { status: 400 });
  }
  if (!code || !state) {
    return NextResponse.json({ ok: false, reason: 'missing_parameters' }, { status: 400 });
  }

  // Step 1: exchange authorization code for tokens.
  let tokens;
  try {
    tokens = await exchangeAuthorizationCode(code);
  } catch (err) {
    const message = err instanceof YouTubeClientError ? err.message : 'token exchange failed';
    const body = err instanceof YouTubeClientError ? err.body : undefined;
    return NextResponse.json(
      { ok: false, reason: 'token_exchange_failed', detail: message, providerBody: body },
      { status: 502 }
    );
  }

  // Step 2: identify which YouTube channel the operator just authorized.
  let channelInfo;
  try {
    channelInfo = await getMyChannel(tokens.accessToken);
  } catch (err) {
    const message = err instanceof YouTubeClientError ? err.message : 'channel lookup failed';
    return NextResponse.json(
      { ok: false, reason: 'channel_lookup_failed', detail: message },
      { status: 502 }
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

  // Step 4: persist. Single-tenant default — find-or-create one operator user
  // and link the channel. Multi-tenant deployments should replace this section
  // with a real session lookup that maps the OAuth `state` parameter back to
  // a logged-in user.
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
