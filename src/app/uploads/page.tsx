import AppShell from '@/components/AppShell';
import UploadPackagePanel from '@/components/UploadPackagePanel';
import { config } from '@/lib/config';

export default function UploadsPage() {
  return (
    <AppShell>
      <h1 className="text-3xl font-semibold">Uploads</h1>
      <p className="text-sm text-ink-300">Connect a YouTube account through OAuth, then prepare and authorize each upload manually. No automatic publish, no scraping, no quota abuse.</p>
      <div className="card flex items-center justify-between">
        <div>
          <p className="text-base font-semibold">YouTube account</p>
          <p className="text-xs text-ink-300">{config.youtube.enabled ? 'Integration ready. Use the OAuth flow to connect a specific channel.' : 'Integration disabled-safe. Configure YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET to enable.'}</p>
        </div>
        <a href="/api/youtube/oauth" className="btn-primary">Connect</a>
      </div>
      <UploadPackagePanel />
    </AppShell>
  );
}
