import { scoreTrend } from '@/lib/trend-radar';

const SAMPLE = [
  { topic: 'How tax brackets actually work', region: 'US', language: 'en', source: 'manual' as const },
  { topic: 'Best low-cost index funds explained', region: 'US', language: 'en', source: 'youtube_suggestions' as const },
  { topic: 'Side hustle ideas for college students', region: 'US', language: 'en', source: 'reddit' as const }
];

export default function TrendRadarPanel() {
  const trends = SAMPLE.map((s) => scoreTrend(s));
  return (
    <section className="card">
      <div className="flex items-baseline justify-between">
        <h2 className="text-xl font-semibold">Live Trend Radar (sample)</h2>
        <span className="text-xs text-ink-300">Engine score, not metric scraping</span>
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {trends.map((t) => (
          <div key={t.topic} className="rounded-xl border border-ink-800 p-4">
            <p className="text-sm font-semibold text-ink-50">{t.topic}</p>
            <p className="mt-1 text-xs text-ink-300">{t.region} · {t.audienceSegment} · {t.searchIntent} intent</p>
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div>Trend <span className="font-semibold text-signal-500">{t.trendScore}</span></div>
              <div>Monetize <span className="font-semibold">{t.monetizationScore}</span></div>
              <div>Comp <span className="font-semibold">{t.competitionScore}</span></div>
              <div>Safety <span className="font-semibold">{t.advertiserSafetyScore}</span></div>
            </div>
            <p className="mt-3 text-xs text-ink-300">{t.recommendedPublishTiming}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
