import { planMonetization } from '@/lib/monetization-engine';

export default function MonetizationPlanner() {
  const plan = planMonetization({
    niche: 'personal finance',
    audience: 'finance beginners',
    region: 'US',
    monetizationGoal: 'affiliate',
    channelSizeTier: 'small'
  });
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Monetization plan</h2>
      <div className="grid gap-2 text-sm md:grid-cols-2">
        <p>Primary path: <span className="font-semibold">{plan.primaryPath}</span></p>
        <p>Secondary path: <span className="font-semibold">{plan.secondaryPath}</span></p>
        <p>Readiness score: <span className="font-semibold text-signal-500">{plan.revenueReadinessScore}</span></p>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Top revenue streams</p>
        <ul className="mt-2 space-y-1 text-sm">
          {plan.revenueStreams.slice(0, 5).map((s) => (
            <li key={s.name} className="flex justify-between border-b border-ink-800 py-1">
              <span>{s.name}</span>
              <span className="text-ink-300">fit {s.fitScore} · {s.effort}</span>
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">First 10 sponsor targets</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink-200">
          {plan.firstTenSponsorTargets.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">First 10 affiliate categories</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-xs text-ink-200">
          {plan.firstTenAffiliateCategories.map((s) => <li key={s}>{s}</li>)}
        </ol>
      </div>
    </div>
  );
}
