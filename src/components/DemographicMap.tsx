import { analyzeDemographics } from '@/lib/demographic-engine';

const SAMPLES = [
  { topic: 'index funds', niche: 'personal finance', region: 'US', language: 'en', monetizationGoal: 'affiliate' },
  { topic: 'productivity habits', niche: 'self-improvement', region: 'US', language: 'en', monetizationGoal: 'product' },
  { topic: 'AI for solo founders', niche: 'tech', region: 'INTL', language: 'en', monetizationGoal: 'sponsor' }
];

export default function DemographicMap() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {SAMPLES.map((s) => {
        const d = analyzeDemographics(s);
        return (
          <div key={s.topic} className="card">
            <p className="text-xs text-ink-300">{s.region} · {s.language}</p>
            <h3 className="mt-1 text-base font-semibold">{s.topic}</h3>
            <p className="mt-3 text-sm text-ink-200">Best audience: <span className="font-semibold">{d.bestAudience}</span></p>
            <p className="text-sm text-ink-200">Secondary: {d.secondaryAudience}</p>
            <p className="mt-3 text-xs text-ink-300">Tone: {d.preferredTone}</p>
            <p className="text-xs text-ink-300">Length: {d.videoLengthMinutes.min}-{d.videoLengthMinutes.max} min</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div>US fit <span className="font-semibold text-signal-500">{d.usFit}</span></div>
              <div>INTL fit <span className="font-semibold text-signal-500">{d.internationalFit}</span></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
