import { NextResponse } from 'next/server';
import { config } from '@/lib/config';
import { getPrisma } from '@/lib/db';

export const runtime = 'nodejs';

export async function GET() {
  if (!config.youtube.enabled) {
    return NextResponse.json(
      { ok: false, reason: 'integration_disabled', detail: 'YouTube OAuth is not configured.' },
      { status: 503 }
    );
  }
  const prisma = getPrisma();
  if (!prisma) {
    return NextResponse.json({ ok: true, channels: [], note: 'Database not initialized in this environment.' });
  }
  try {
    const channels = await prisma.channel.findMany({
      where: { oauthConnected: true },
      select: { id: true, name: true, niche: true, regionFocus: true, language: true, youtubeChannelId: true }
    });
    return NextResponse.json({ ok: true, channels });
  } catch (err) {
    return NextResponse.json({ ok: false, reason: 'database_unavailable', detail: 'Channels table not available.' }, { status: 503 });
  }
}
