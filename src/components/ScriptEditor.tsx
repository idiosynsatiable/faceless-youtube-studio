import { generateScript } from '@/lib/script-engine';

export default function ScriptEditor() {
  const script = generateScript({
    title: 'Index funds explained for first-time investors',
    audience: 'finance beginners',
    format: 'beginner guide',
    tone: 'calm educational',
    durationMinutes: 9,
    keyPoints: [
      'What an index fund actually is',
      'Total market vs sector funds',
      'Expense ratios that quietly compound'
    ],
    sources: [],
    flags: []
  });
  return (
    <div className="card space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Hook</p>
        <p className="mt-1 text-sm">{script.hook}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Intro</p>
        <p className="mt-1 text-sm text-ink-200">{script.intro.narration}</p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Body sections</p>
        <ul className="mt-2 space-y-2">
          {script.body.map((s) => (
            <li key={s.heading} className="rounded-lg border border-ink-800 p-3">
              <p className="text-sm font-semibold">{s.heading}</p>
              <p className="mt-1 text-xs text-ink-300">{s.narration}</p>
              {s.disclaimerInsert ? <p className="mt-1 text-xs text-accent-400">{s.disclaimerInsert}</p> : null}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Disclaimer placements</p>
        <ul className="mt-1 list-inside list-disc text-xs text-ink-300">
          {script.disclaimerPlacements.map((d) => (
            <li key={d}>{d}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
