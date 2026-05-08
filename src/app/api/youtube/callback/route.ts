import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

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
  return NextResponse.json({
    ok: true,
    state,
    nextStep: 'Exchange the authorization code for tokens server-side using the configured YouTube client. Tokens must be encrypted at rest.'
  });
}
