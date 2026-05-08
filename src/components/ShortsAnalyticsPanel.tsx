import { analyzeShorts } from '@/lib/shorts-analytics';

const SAMPLES = [
  {
    label: 'Top performer',
    snapshot: {
      shortTitle: 'Index funds: myth vs fact',
      topicCluster: 'index funds basics',
      views: 42000,
      averageViewDurationSeconds: 24,
      durationSeconds: 30,
      likes: 2400,
      comments: 180,
      shares: 220,
      subscribersGained: 480,
      longFormClicks: 1800
    }
  },
  {
    label: 'Mid retention',
    snapshot: {
      shortTitle: 'Expense ratios in 60 seconds',
      topicCluster: 'index funds basics',
      views: 12000,
      averageViewDurationSeconds: 28,
      durationSeconds: 60,
      likes: 250,
      comments: 18,
      shares: 12,
      subscribersGained: 35,
      longFormClicks: 90
    }
  },
  {
    label: 'Weak performer',
    snapshot: {
      shortTitle: 'Sector funds rant',
      topicCluster: 'sector funds rant',
      views: 3200,
      averageViewDurationSeconds: 7,
      durationSeconds: 30,
      likes: 12,
      comments: 1,
      shares: 0,
      subscribersGained: 0,
      longFormClicks: 5
    }
  }
];

export default function ShortsAnalyticsPanel() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SAMPLES.map(({ label, snapshot }) => {
        const r = analyzeShorts(snapshot);
        return (
          <div key={snapshot.shortTitle} className="card">
            <p className="text-xs uppercase tracking-wider text-ink-300">{label}</p>
            <h3 className="mt-1 text-base font-semibold">{snapshot.shortTitle}</h3>
            <p className="mt-2 text-sm text-ink-200">Verdict: {r.summary}</p>
            <ul className="mt-3 space-y-1 text-xs text-ink-300">
              {r.rationale.map((x) => <li key={x}>{x}</li>)}
            </ul>
            <ul className="mt-3 space-y-1 text-xs">
              {r.recommendedNextShorts.map((x) => <li key={x} className="rounded-lg border border-ink-800 px-2 py-1">{x}</li>)}
            </ul>
          </div>
        );
      })}
    </div>
  );
}
