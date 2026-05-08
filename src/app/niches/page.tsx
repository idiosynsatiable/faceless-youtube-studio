import AppShell from '@/components/AppShell';
import NicheMatrix from '@/components/NicheMatrix';

export default function NichesPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Niches</h1>
      <p className="text-sm text-ink-300">Score channel niches with a transparent formula combining competition, monetization, urgency, retention, advertiser safety, evergreen value, and scalability.</p>
      <NicheMatrix />
    </AppShell>
  );
}
