import AppShell from '@/components/AppShell';
import VideoMaker from '@/components/VideoMaker';

export default function StudioPage() {
  return (
    <AppShell>
      <div>
        <p className="text-xs uppercase tracking-[0.24em] text-signal-500">Production</p>
        <h1 className="mt-2 text-3xl font-semibold">Faceless Video Maker</h1>
        <p className="mt-2 max-w-3xl text-sm text-ink-300">
          Build downloadable videos from your own footage, stills, narration, and captions. Rendering is handled by the isolated FFmpeg worker and does not require a connected YouTube account.
        </p>
      </div>
      <VideoMaker />
    </AppShell>
  );
}
