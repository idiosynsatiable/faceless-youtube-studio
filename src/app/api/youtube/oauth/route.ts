import { NextResponse } from 'next/server';
import { randomBytes } from 'node:crypto';
import { buildAuthorizeUrl, disabledOAuthResponse } from '@/lib/youtube-oauth';

export const runtime = 'nodejs';

export async function GET() {
  const state = randomBytes(16).toString('hex');
  const url = buildAuthorizeUrl(state);
  if (!url) {
    return NextResponse.json(disabledOAuthResponse, { status: 503 });
  }
  return NextResponse.json({ ok: true, authorizeUrl: url, state });
}
