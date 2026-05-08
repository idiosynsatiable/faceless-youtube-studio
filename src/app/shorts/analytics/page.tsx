import AppShell from '@/components/AppShell';
import ShortsAnalyticsPanel from '@/components/ShortsAnalyticsPanel';

export default function ShortsAnalyticsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Shorts analytics</h1>
      <p className="text-sm text-ink-300">Reads only the snapshot you provide. Recommends concrete next moves with no fake-engagement shortcuts.</p>
      <ShortsAnalyticsPanel />
    </AppShell>
  );
}
