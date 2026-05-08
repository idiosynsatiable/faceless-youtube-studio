import AppShell from '@/components/AppShell';
import TrendRadarPanel from '@/components/TrendRadarPanel';
import IdeaQueue from '@/components/IdeaQueue';
import MonetizationPlanner from '@/components/MonetizationPlanner';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import UploadPackagePanel from '@/components/UploadPackagePanel';

export default function DashboardPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Dashboard</h1>
      <p className="text-sm text-ink-300">Active channels, top trends, video queue, monetization readiness, upload queue, analytics highlights.</p>
      <TrendRadarPanel />
      <IdeaQueue />
      <div className="grid gap-4 md:grid-cols-2">
        <MonetizationPlanner />
        <UploadPackagePanel />
      </div>
      <AnalyticsDashboard />
    </AppShell>
  );
}
