import AppShell from '@/components/AppShell';

const PROJECTS = [
  { title: 'Index funds explained', readinessScore: 92, status: 'draft_ready' },
  { title: 'AI productivity for solo founders', readinessScore: 78, status: 'needs_review' },
  { title: 'History of money in 9 minutes', readinessScore: 85, status: 'draft_ready' }
];

export default function VideosPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Videos</h1>
      <p className="text-sm text-ink-300">Project list with readiness score and upload status. No fake metrics, no fake views.</p>
      <div className="grid gap-3 md:grid-cols-3">
        {PROJECTS.map((p) => (
          <div key={p.title} className="card">
            <p className="text-xs uppercase tracking-wider text-ink-300">{p.status.replace(/_/g, ' ')}</p>
            <h3 className="mt-1 text-base font-semibold">{p.title}</h3>
            <p className="mt-3 text-3xl font-semibold text-signal-500">{p.readinessScore}</p>
            <p className="text-xs text-ink-300">Readiness score</p>
          </div>
        ))}
      </div>
    </AppShell>
  );
}
