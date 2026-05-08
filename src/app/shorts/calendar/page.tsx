import AppShell from '@/components/AppShell';
import ShortsCalendarPanel from '@/components/ShortsCalendarPanel';

export default function ShortsCalendarPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Shorts calendar</h1>
      <p className="text-sm text-ink-300">Sustainable cadence with topic-cluster rotation, publish-window guidance, and explicit refusal of duplicate or spam uploads.</p>
      <ShortsCalendarPanel />
    </AppShell>
  );
}
