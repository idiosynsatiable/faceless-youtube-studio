interface Props {
  topic: string;
  trendScore: number;
  nicheScore: number;
  audienceFit: number;
}

export default function OpportunityScoreCard({ topic, trendScore, nicheScore, audienceFit }: Props) {
  const score = Math.round(trendScore * 0.4 + nicheScore * 0.4 + audienceFit * 0.2);
  const verdict = score >= 78 ? 'green light' : score >= 50 ? 'cautious' : 'avoid';
  return (
    <div className="card">
      <p className="text-xs uppercase tracking-wider text-ink-300">Opportunity score</p>
      <h3 className="mt-2 text-lg font-semibold">{topic}</h3>
      <p className="mt-4 text-4xl font-semibold text-signal-500">{score}</p>
      <p className="mt-2 text-sm text-ink-200">Verdict: {verdict}</p>
      <ul className="mt-4 space-y-1 text-xs text-ink-300">
        <li>Trend score {trendScore}</li>
        <li>Niche score {nicheScore}</li>
        <li>Audience fit {audienceFit}</li>
      </ul>
    </div>
  );
}
