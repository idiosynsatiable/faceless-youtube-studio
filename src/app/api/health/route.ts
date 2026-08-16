import { NextResponse } from 'next/server';
import { config, productionConfigIssues } from '@/lib/config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const issues = productionConfigIssues();
  const ready = issues.length === 0;
  const publishReady = config.youtube.enabled && Boolean(config.youtube.authorizedChannelId);

  return NextResponse.json(
    {
      ok: ready,
      status: ready ? 'ready' : 'not_ready',
      service: 'faceless-youtube-studio',
      version: '1.0.0',
      integrations: {
        database: config.databaseUrl ? 'configured' : 'missing',
        queue: config.redisUrl ? 'configured' : 'missing',
        stripe: config.stripe.enabled ? 'configured' : 'disabled_safe_mode',
        youtube: config.youtube.enabled ? 'configured' : 'disabled_safe_mode',
        publishing: publishReady ? 'owner_channel_verified' : 'pending_owner_authorization',
        ai: config.ai.enabled ? 'configured' : 'rule_based_only'
      },
      ...(process.env.NODE_ENV === 'production' ? { issues } : {}),
      timestamp: new Date().toISOString()
    },
    { status: ready ? 200 : 503 }
  );
}
