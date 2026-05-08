import { scoreNiche } from '@/lib/niche-scorer';

const NICHES = [
  { niche: 'Personal finance for first jobs', competition: 75, monetization: 85, audienceUrgency: 65, retentionPotential: 70, advertiserSafety: 80, evergreen: true, highIntent: true, affiliateFit: true, seriesPotential: true, internationalScalability: true, region: 'US', language: 'en' },
  { niche: 'AI productivity workflows', competition: 80, monetization: 70, audienceUrgency: 60, retentionPotential: 75, advertiserSafety: 75, evergreen: false, highIntent: true, affiliateFit: true, seriesPotential: true, internationalScalability: true, region: 'US', language: 'en' },
  { niche: 'History of money explained', competition: 50, monetization: 55, audienceUrgency: 40, retentionPotential: 80, advertiserSafety: 90, evergreen: true, highIntent: false, affiliateFit: false, seriesPotential: true, internationalScalability: true, region: 'US', language: 'en' }
];

export default function NicheMatrix() {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {NICHES.map((n) => {
        const score = scoreNiche(n);
        return (
          <div key={n.niche} className="card">
            <p className="text-xs uppercase tracking-wider text-ink-300">{score.label}</p>
            <h3 className="mt-1 text-base font-semibold">{n.niche}</h3>
            <p className="mt-2 text-3xl font-semibold text-signal-500">{score.score}</p>
            <p className="mt-3 text-xs text-ink-300">{score.recommendation}</p>
          </div>
        );
      })}
    </div>
  );
}
