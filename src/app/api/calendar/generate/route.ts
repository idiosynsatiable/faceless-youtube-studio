import { NextResponse } from 'next/server';
import { calendarInput } from '@/lib/validators';

export const runtime = 'nodejs';

interface CalendarEntry {
  date: string;
  type: 'long_form' | 'short' | 'community_post' | 'newsletter';
  title: string;
  notes: string;
}

function pad(n: number) {
  return n.toString().padStart(2, '0');
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = calendarInput.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'invalid_input', details: parsed.error.flatten() }, { status: 400 });
  const entries: CalendarEntry[] = [];
  const days = parsed.data.weeks * 7;
  let longFormPosted = 0;
  let shortsPosted = 0;
  for (let i = 0; i < days; i++) {
    const date = addDays(parsed.data.startDate, i);
    const dayOfWeek = new Date(date + 'T12:00:00Z').getUTCDay();
    if (parsed.data.longFormPerWeek > 0 && (dayOfWeek === 2 || (parsed.data.longFormPerWeek > 1 && dayOfWeek === 5))) {
      entries.push({
        date,
        type: 'long_form',
        title: `${parsed.data.niche} long-form #${++longFormPosted}`,
        notes: 'Hero video for the week, feeds Shorts cuts and newsletter'
      });
    }
    if (parsed.data.shortsPerWeek > 0 && (dayOfWeek === 1 || dayOfWeek === 3 || dayOfWeek === 6)) {
      entries.push({
        date,
        type: 'short',
        title: `${parsed.data.niche} Short #${++shortsPosted}`,
        notes: 'Cut from latest long-form, points to it in CTA'
      });
    }
    if (dayOfWeek === 4) {
      entries.push({
        date,
        type: 'community_post',
        title: `Community poll: next ${parsed.data.niche} topic`,
        notes: 'Drive ideation and pre-validate next long-form'
      });
    }
    if (dayOfWeek === 0) {
      entries.push({
        date,
        type: 'newsletter',
        title: `${parsed.data.channelName} weekly recap`,
        notes: 'Recap of long-form, lead magnet reminder, single CTA'
      });
    }
  }
  return NextResponse.json({
    calendar: {
      channelName: parsed.data.channelName,
      niche: parsed.data.niche,
      weeks: parsed.data.weeks,
      entries
    }
  });
}
