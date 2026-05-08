import { planShortsCalendar } from '@/lib/shorts-calendar';

export default function ShortsCalendarPanel() {
  const cal = planShortsCalendar({
    niche: 'personal finance',
    audience: 'finance beginners',
    region: 'US',
    channelStage: 'growing',
    productionCapacity: 'medium',
    longFormPerWeek: 1,
    audienceFatigueSignal: 'low',
    weeks: 2
  });
  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Cadence recommendation</h2>
        <div className="mt-3 grid gap-2 text-sm md:grid-cols-2">
          <p>Per day: <span className="font-semibold text-signal-500">{cal.cadence.recommendedShortsPerDay}</span></p>
          <p>Per week: <span className="font-semibold text-signal-500">{cal.cadence.recommendedShortsPerWeek}</span></p>
          <p>Long-form support ratio: {(cal.cadence.longFormSupportRatio * 100).toFixed(0)}%</p>
          <p>Standalone ratio: {(cal.cadence.standaloneRatio * 100).toFixed(0)}%</p>
          <p>Backlog target: {cal.cadence.backlogTarget}</p>
          <p>Publish windows: {cal.cadence.idealPublishWindowsLocalTime.join(', ')}</p>
        </div>
        <p className="mt-3 text-xs text-accent-400">{cal.cadence.qualityWarning}</p>
        <p className="mt-1 text-xs text-accent-400">{cal.cadence.saturationWarning}</p>
        <p className="mt-3 text-xs text-ink-300">{cal.cadence.policyNote}</p>
      </div>
      <div className="card">
        <h2 className="text-lg font-semibold">Daily plan</h2>
        <ul className="mt-3 space-y-1 text-sm">
          {cal.daily.slice(0, 14).map((d, i) => (
            <li key={`${d.date}-${i}`} className="rounded-lg border border-ink-800 px-3 py-2">
              <span className="font-mono text-xs text-ink-300">{d.date} {d.publishWindow}</span> — <span className="font-semibold">{d.type}</span> — {d.title}
            </li>
          ))}
        </ul>
      </div>
      {cal.warnings.length > 0 ? (
        <div className="card">
          <h2 className="text-lg font-semibold">Warnings</h2>
          <ul className="mt-2 list-disc pl-6 text-xs text-accent-400">
            {cal.warnings.map((w) => <li key={w}>{w}</li>)}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
