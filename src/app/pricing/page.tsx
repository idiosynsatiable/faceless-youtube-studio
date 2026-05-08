import AppShell from '@/components/AppShell';
import PricingTable from '@/components/PricingTable';

export default function PricingPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Pricing</h1>
      <p className="text-sm text-ink-300">Five tiers from free to enterprise. Stripe billing operates in disabled-safe mode until configured.</p>
      <PricingTable />
    </AppShell>
  );
}
