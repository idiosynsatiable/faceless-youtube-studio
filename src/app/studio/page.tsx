import AppShell from '@/components/AppShell';
import VideoMaker from '@/components/VideoMaker';

export default function StudioPage() {
  return (
    <AppShell>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
        <div>
          <p className="eyebrow">Production atelier</p>
          <h1 className="page-title">Faceless Video Maker</h1>
          <p className="page-description">Build elegant, downloadable releases from your own footage, stills, narration, and captions. Rendering takes place in an isolated FFmpeg worker and never requires a connected YouTube account.</p>
        </div>
        <aside className="metric">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-600">Release protocol</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-50">Private by default.</p>
          <p className="mt-2 text-xs leading-5 text-ink-300">Draft, render, inspect, and explicitly authorize every release on your terms.</p>
        </aside>
      </section>
      <VideoMaker />
    </AppShell>
  );
}
