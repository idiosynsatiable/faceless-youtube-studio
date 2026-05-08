import { generateShorts } from '@/lib/shorts-engine';

export default function ShortsIdeaQueue() {
  const concepts = generateShorts({
    niche: 'personal finance',
    audience: 'finance beginners',
    formats: ['quick_hook_15s', 'mini_explainer_30s', 'high_retention_60s', 'myth_vs_fact', 'three_things_you_missed'],
    count: 5,
    monetizationGoal: 'affiliate',
    hasAffiliateLinks: true,
    aiGeneratedContent: true,
    topicFlags: ['financial']
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {concepts.map((c) => (
        <div key={c.shortTitle} className="card">
          <p className="text-xs uppercase tracking-wider text-ink-300">{c.format.replace(/_/g, ' ')} · {c.estimatedDurationSeconds}s</p>
          <h3 className="mt-1 text-base font-semibold">{c.shortTitle}</h3>
          <p className="mt-2 text-sm text-ink-200">Hook: {c.hook}</p>
          <p className="mt-2 text-xs text-ink-300">Target: {c.targetAudience}</p>
          <p className="text-xs text-ink-300">Long-form: {c.longFormConnection}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {c.hashtags.map((t) => <span key={t} className="tag">{t}</span>)}
          </div>
          <p className="mt-3 text-xs text-ink-300">Upload priority: <span className="font-semibold text-signal-500">{c.uploadPriorityScore}</span></p>
          {c.riskFlags.length > 0 ? (
            <ul className="mt-2 text-xs text-accent-400">
              {c.riskFlags.map((f) => <li key={f}>• {f}</li>)}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  );
}
