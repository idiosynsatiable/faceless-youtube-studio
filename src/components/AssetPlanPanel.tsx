import { generateStoryboard } from '@/lib/storyboard-engine';
import { planAssets } from '@/lib/asset-planner';

const SAMPLE =
  'Index funds spread risk across thousands of companies. Expense ratios compound silently. Total market funds win the long run. Active funds rarely beat their index over decades. The simplest portfolio often wins.';

export default function AssetPlanPanel() {
  const storyboard = generateStoryboard({ title: 'Index funds explained', scenesTarget: 6, scriptText: SAMPLE });
  const plan = planAssets(storyboard, 'personal finance');
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Asset plan</h2>
      <p className="text-xs text-ink-300">{plan.total} assets · documented license required for each</p>
      <ul className="mt-4 space-y-2 text-sm">
        {plan.items.slice(0, 6).map((a) => (
          <li key={a.sceneIndex} className="rounded-lg border border-ink-800 p-3">
            <p className="font-semibold">Scene {a.sceneIndex} — {a.assetType}</p>
            <p className="text-xs text-ink-300">{a.searchQuery}</p>
            <p className="text-xs text-ink-300">License: {a.licenseRequirement}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
