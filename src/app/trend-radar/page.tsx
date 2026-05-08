import AppShell from '@/components/AppShell';
import TrendRadarPanel from '@/components/TrendRadarPanel';
import OpportunityScoreCard from '@/components/OpportunityScoreCard';
import { TREND_SOURCES } from '@/lib/trend-sources';

export default function TrendRadarPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Trend Radar</h1>
      <p className="text-sm text-ink-300">Identify rising US and international topics. Sources are documented and lawful — official APIs, manual imports, or creator input.</p>
      <TrendRadarPanel />
      <div className="grid gap-4 md:grid-cols-3">
        <OpportunityScoreCard topic="Index funds explained" trendScore={78} nicheScore={86} audienceFit={88} />
        <OpportunityScoreCard topic="AI productivity workflows" trendScore={82} nicheScore={74} audienceFit={75} />
        <OpportunityScoreCard topic="History of money" trendScore={62} nicheScore={70} audienceFit={70} />
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold">Allowed trend sources</h2>
        <ul className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          {TREND_SOURCES.map((s) => (
            <li key={s.id} className="rounded-lg border border-ink-800 p-3">
              <p className="font-semibold">{s.label}</p>
              <p className="text-xs text-ink-300">{s.legalNote}</p>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  );
}
