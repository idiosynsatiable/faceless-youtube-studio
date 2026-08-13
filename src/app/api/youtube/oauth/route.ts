import { NextResponse } from 'next/server';
import { buildAuthorizeUrl, createOAuthState, disabledOAuthResponse } from '@/lib/youtube-oauth';

export const runtime = 'nodejs';

export async function GET() {
  const state = createOAuthState();
  const url = buildAuthorizeUrl(state);
  if (!url) {
    return NextResponse.json(disabledOAuthResponse, { status: 503 });
  }
  return NextResponse.redirect(url, { status: 302 });
}
