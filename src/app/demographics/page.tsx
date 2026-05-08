import AppShell from '@/components/AppShell';
import DemographicMap from '@/components/DemographicMap';

export default function DemographicsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Demographics</h1>
      <p className="text-sm text-ink-300">Map every topic to the right audience segment, US fit, international fit, preferred tone, video length, and monetization fit.</p>
      <DemographicMap />
    </AppShell>
  );
}
