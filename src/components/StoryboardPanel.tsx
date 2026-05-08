import { generateStoryboard } from '@/lib/storyboard-engine';

const SAMPLE_SCRIPT =
  'Most people think index funds are boring. They are not. Index funds quietly hold thousands of companies for a fraction of the cost of active funds. The expense ratio matters more than you think. Total market funds spread risk across an entire economy. Sector funds concentrate it. The smartest first move is often the simplest one.';

export default function StoryboardPanel() {
  const storyboard = generateStoryboard({
    title: 'Index funds explained',
    scenesTarget: 8,
    scriptText: SAMPLE_SCRIPT
  });
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Storyboard</h2>
      <p className="text-xs text-ink-300">{storyboard.totalScenes} scenes · ~{Math.round(storyboard.estimatedSeconds / 60)} min</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {storyboard.scenes.map((scene) => (
          <div key={scene.index} className="rounded-lg border border-ink-800 p-3">
            <p className="text-xs text-ink-300">Scene {scene.index} · {scene.timestampStart}–{scene.timestampEnd}</p>
            <p className="mt-1 text-sm font-medium">{scene.assetType}</p>
            <p className="mt-1 text-xs text-ink-300">{scene.narration}</p>
            <p className="mt-1 text-xs text-ink-300">License: {scene.assetLicenseRequirement}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
