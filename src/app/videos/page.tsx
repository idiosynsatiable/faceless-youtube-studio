import AppShell from '@/components/AppShell';
import RenderHistory from '@/components/RenderHistory';

export default function VideosPage() {
  return (
    <AppShell>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
        <div>
          <p className="eyebrow">Export library</p>
          <h1 className="page-title">Rendered Releases</h1>
          <p className="page-description">A private catalogue of completed renders from this browser, each kept close to its source project and ready for secure download from the worker export volume.</p>
        </div>
        <aside className="metric">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-600">Library standard</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-50">Traceable exports.</p>
          <p className="mt-2 text-xs leading-5 text-ink-300">Only completed, recorded artifacts are available for retrieval—never arbitrary filesystem paths.</p>
        </aside>
      </section>
      <RenderHistory />
    </AppShell>
  );
}
