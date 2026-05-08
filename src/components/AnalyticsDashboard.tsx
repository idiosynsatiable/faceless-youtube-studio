import { analyticsAvailability } from '@/lib/youtube-analytics';

export default function AnalyticsDashboard() {
  const avail = analyticsAvailability();
  return (
    <div className="card space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <span className={`tag ${avail.enabled ? 'border-signal-500 text-signal-400' : ''}`}>
          {avail.enabled ? 'Live' : 'Disabled-safe mode'}
        </span>
      </div>
      <p className="text-sm text-ink-200">{avail.detail}</p>
      <p className="text-xs text-ink-300">No fake metrics are ever shown. When the integration is disabled, this panel only describes what fields will populate after OAuth completes.</p>
    </div>
  );
}
