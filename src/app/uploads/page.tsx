import AppShell from '@/components/AppShell';
import UploadPackagePanel from '@/components/UploadPackagePanel';
import { config } from '@/lib/config';

export default function UploadsPage() {
  const authorizedChannel = config.youtube.authorizedChannelHandle
    ? `@${config.youtube.authorizedChannelHandle}`
    : config.youtube.authorizedChannelId || 'not configured';
  const ready = config.youtube.enabled && Boolean(config.youtube.authorizedChannelHandle || config.youtube.authorizedChannelId);

  return (
    <AppShell>
      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_300px] xl:items-end">
        <div>
          <p className="eyebrow">Release desk</p>
          <h1 className="page-title">YouTube Publishing</h1>
          <p className="page-description">Connect the owner-approved channel once, then prepare every release in the studio. Publishing remains explicit and per-video—nothing is sent to YouTube without a confirmed operator action.</p>
        </div>
        <aside className="metric border-signal-500/30 bg-signal-400/10">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-accent-600">Authorized destination</p>
          <p className="mt-2 font-display text-2xl font-bold text-ink-50">{authorizedChannel}</p>
          <p className="mt-2 text-xs leading-5 text-ink-300">The worker verifies the refreshed credential against this channel before every upload.</p>
        </aside>
      </section>

      <section className="card flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="eyebrow">Owner connection</p>
          <h2 className="mt-2 text-xl font-bold text-ink-50">{ready ? 'Ready to authorize the correct channel.' : 'Complete the secure OAuth configuration first.'}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-ink-300">
            {ready
              ? `OAuth will refuse to persist credentials unless they resolve to ${authorizedChannel}. The immutable YouTube channel ID is then checked again immediately before every upload.`
              : 'Set YOUTUBE_CLIENT_ID, YOUTUBE_CLIENT_SECRET, and an owner channel handle or ID in the deployment environment. Rendering remains available while publishing is safely disabled.'}
          </p>
        </div>
        {ready ? (
          <a href="/api/youtube/oauth" className="btn-primary shrink-0">Connect {authorizedChannel} <span aria-hidden>→</span></a>
        ) : (
          <span className="btn-secondary cursor-not-allowed opacity-60">OAuth not configured</span>
        )}
      </section>

      <UploadPackagePanel />
    </AppShell>
  );
}
