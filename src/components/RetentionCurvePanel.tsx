import { planRetention } from '@/lib/retention-engine';

export default function RetentionCurvePanel({ durationMinutes = 9 }: { durationMinutes?: number }) {
  const beats = planRetention(durationMinutes);
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Retention curve plan</h2>
      <p className="text-xs text-ink-300">{durationMinutes} minute target · ethical retention only</p>
      <ul className="mt-4 space-y-2">
        {beats.map((b) => (
          <li key={b.timestamp} className="flex gap-3 rounded-lg border border-ink-800 p-3 text-sm">
            <span className="font-mono text-ink-300">{b.timestamp}</span>
            <span className="font-semibold">{b.beat}</span>
            <span className="text-ink-300">— {b.goal}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
