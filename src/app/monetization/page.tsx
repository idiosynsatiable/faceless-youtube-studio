import AppShell from '@/components/AppShell';
import MonetizationPlanner from '@/components/MonetizationPlanner';
import SubscriberGrowthPanel from '@/components/SubscriberGrowthPanel';

export default function MonetizationPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Monetization</h1>
      <p className="text-sm text-ink-300">Revenue plan, affiliate plan, sponsor plan, and product ladder — all aligned with FTC and YouTube guidance.</p>
      <MonetizationPlanner />
      <SubscriberGrowthPanel />
    </AppShell>
  );
}
