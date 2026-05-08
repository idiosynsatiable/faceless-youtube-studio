import { generateIdeas } from '@/lib/idea-engine';

export default function IdeaQueue() {
  const ideas = generateIdeas({
    niche: 'personal finance',
    audience: 'finance beginners',
    region: 'US',
    language: 'en',
    monetizationGoal: 'affiliate',
    count: 6
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {ideas.map((i) => (
        <div key={i.title} className="card">
          <p className="text-xs text-ink-300">{i.format} · {i.estimatedLengthMinutes} min</p>
          <h3 className="mt-2 text-base font-semibold">{i.title}</h3>
          <p className="mt-2 text-sm text-ink-200">Hook: {i.hook}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {i.disclaimerNeeds.map((d) => (
              <span key={d} className="tag">{d}</span>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-300">Score {i.score} · Risk {i.riskLevel}</p>
        </div>
      ))}
    </div>
  );
}
