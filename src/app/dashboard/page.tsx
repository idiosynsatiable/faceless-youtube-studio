import AppShell from '@/components/AppShell';
import TrendRadarPanel from '@/components/TrendRadarPanel';
import IdeaQueue from '@/components/IdeaQueue';
import MonetizationPlanner from '@/components/MonetizationPlanner';
import AnalyticsDashboard from '@/components/AnalyticsDashboard';
import UploadPackagePanel from '@/components/UploadPackagePanel';

const OVERVIEW = [
  { label: 'Opportunity lens', value: 'Signals first', note: 'Market movement before production' },
  { label: 'Release posture', value: 'Operator-led', note: 'Explicit authorization, always' },
  { label: 'Growth standard', value: 'Organic', note: 'No manufactured engagement' }
];

export default function DashboardPage() {
  return (
    <AppShell>
      <section className="card-dark p-7 sm:p-8">
        <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(460px,0.95fr)] xl:items-end">
          <div>
            <p className="eyebrow !text-accent-400">Creator command center</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">Your channel, seen as a system.</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-porcelain-100 sm:text-base">Read the signals, choose the next creative bet, and keep the business, release, and audience considerations in the same room.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {OVERVIEW.map((item) => (
              <div key={item.label} className="rounded-xl border border-white/15 bg-white/5 p-4">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-accent-400">{item.label}</p>
                <p className="mt-3 font-display text-xl font-bold text-porcelain-50">{item.value}</p>
                <p className="mt-2 text-xs leading-5 text-porcelain-100">{item.note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <TrendRadarPanel />
      <IdeaQueue />
      <div className="grid gap-4 xl:grid-cols-2">
        <MonetizationPlanner />
        <UploadPackagePanel />
      </div>
      <AnalyticsDashboard />
    </AppShell>
  );
}
