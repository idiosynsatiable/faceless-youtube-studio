import AppShell from '@/components/AppShell';
import RenderHistory from '@/components/RenderHistory';

export default function VideosPage() {
  return (
    <AppShell>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-signal-500">Library</p>
        <h1 className="mt-2 text-3xl font-semibold">Rendered videos</h1>
        <p className="mt-2 text-sm text-ink-300">Completed jobs from this browser, with direct download links to the worker export volume.</p>
      </div>
      <RenderHistory />
    </AppShell>
  );
}
