import { NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const runtime = 'nodejs';

export async function GET() {
  return NextResponse.json({
    ok: true,
    service: 'faceless-youtube-studio',
    version: '1.0.0',
    integrations: {
      stripe: config.stripe.enabled ? 'configured' : 'disabled_safe_mode',
      youtube: config.youtube.enabled ? 'configured' : 'disabled_safe_mode',
      ai: config.ai.enabled ? 'configured' : 'rule_based_only'
    },
    timestamp: new Date().toISOString()
  });
}
