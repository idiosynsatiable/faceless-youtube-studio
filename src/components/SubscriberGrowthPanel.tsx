import { buildGrowthPlan, FORBIDDEN_GROWTH_TACTICS } from '@/lib/growth-strategy';

export default function SubscriberGrowthPanel() {
  const plan = buildGrowthPlan();
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Subscriber growth — organic only</h2>
      <p className="text-xs text-ink-300">No bots, no engagement pods, no fake comments, no impersonation.</p>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Strategies</p>
        <ul className="mt-2 grid gap-1 text-sm md:grid-cols-2">
          {plan.organicStrategies.map((s) => <li key={s} className="rounded-lg border border-ink-800 px-3 py-1">{s}</li>)}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Forbidden tactics (never used by this product)</p>
        <ul className="mt-2 grid gap-1 text-xs text-ink-300 md:grid-cols-2">
          {FORBIDDEN_GROWTH_TACTICS.map((t) => <li key={t}>• {t}</li>)}
        </ul>
      </div>
    </div>
  );
}
