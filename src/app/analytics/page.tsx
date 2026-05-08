import AppShell from '@/components/AppShell';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';

export default function AnalyticsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Analytics</h1>
      <p className="text-sm text-ink-300">Performance tracking and recommendations. We never fabricate metrics. The page only shows real data fetched through the YouTube Analytics API or imported manually.</p>
      <AnalyticsDashboard />
      <div className="card">
        <h2 className="text-lg font-semibold">Recommendations engine</h2>
        <p className="text-xs text-ink-300">Once snapshots arrive, the analytics-feedback module returns: what worked, what lost retention, best hook type, best title style, best thumbnail pattern, best audience segment, next-video recommendation, series recommendation, monetization recommendation.</p>
      </div>
    </AppShell>
  );
}
