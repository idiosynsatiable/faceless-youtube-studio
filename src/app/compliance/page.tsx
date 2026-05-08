import AppShell from '@/components/AppShell';
import ComplianceChecklist from '@/components/ComplianceChecklist';

export default function CompliancePage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Compliance</h1>
      <p className="text-sm text-ink-300">Disclaimers, policy checks, and risk list for every project.</p>
      <ComplianceChecklist />
    </AppShell>
  );
}
