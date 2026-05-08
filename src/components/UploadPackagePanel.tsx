import { config } from '@/lib/config';
import { preparePackage } from '@/lib/youtube-upload';

export default function UploadPackagePanel() {
  const pkg = preparePackage({
    title: 'Index funds explained',
    description: 'Calm beginner guide. Disclosures in description.',
    tags: ['index funds', 'investing basics'],
    category: '27',
    privacyStatus: 'private'
  });
  return (
    <div className="card space-y-4">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Upload package</h2>
        <span className={`tag ${config.youtube.enabled ? 'border-signal-500 text-signal-400' : ''}`}>
          {config.youtube.enabled ? 'YouTube connected' : 'Disabled-safe mode'}
        </span>
      </div>
      <p className="text-sm">Filename: <span className="font-mono">{pkg.filename}</span></p>
      <p className="text-sm">Privacy: {pkg.privacyStatus}</p>
      <p className="text-sm">Category: {pkg.category}</p>
      {pkg.warnings.length > 0 ? (
        <ul className="text-xs text-accent-400">
          {pkg.warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      ) : null}
      <p className="text-xs text-ink-300">Publishing requires explicit user authorization. We never publish without your click.</p>
    </div>
  );
}
