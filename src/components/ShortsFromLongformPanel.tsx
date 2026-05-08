import { extractClips } from '@/lib/shorts-cutter';
import { generateShorts, type ShortsFormat } from '@/lib/shorts-engine';

const SAMPLE_LONG = 'Most people think index funds are boring. They are not. Total market funds spread risk across thousands of companies for a fraction of the cost of active funds. The expense ratio matters more than you think. Myth: only stock pickers beat the market. Fact: most active managers lose to a low-cost index fund over decades. Before you try anything fancy, the simplest portfolio often wins. Compare two real options: a total market fund and a sector fund. Step one is automating contributions. Step two is staying boring on purpose.';

const VARIANTS: ShortsFormat[] = ['quick_hook_15s', 'mini_explainer_30s', 'high_retention_60s'];

export default function ShortsFromLongformPanel() {
  const clips = extractClips({
    sourceVideoTitle: 'Index funds explained',
    scriptText: SAMPLE_LONG,
    audience: 'finance beginners',
    maxClips: 4
  });
  return (
    <div className="space-y-4">
      <div className="card">
        <h2 className="text-lg font-semibold">Long-form input</h2>
        <p className="mt-2 text-sm text-ink-200">{SAMPLE_LONG}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {clips.map((clip) => {
          const variants = VARIANTS.map((format) => generateShorts({
            niche: 'personal finance',
            audience: 'finance beginners',
            topic: clip.clipTitle,
            longFormTitle: clip.sourceVideoTitle,
            longFormSummary: SAMPLE_LONG.slice(0, 400),
            formats: [format],
            count: 1,
            hasAffiliateLinks: true,
            topicFlags: ['financial']
          })[0]);
          return (
            <div key={clip.clipTitle} className="card">
              <p className="text-xs text-ink-300">Reason: {clip.reasonSelected} · est. retention {clip.expectedRetentionScore}</p>
              <h3 className="mt-1 text-base font-semibold">{clip.clipTitle}</h3>
              <p className="mt-1 text-xs text-ink-300">Estimated time: {Math.floor(clip.startTimeEstimate)}s - {Math.floor(clip.endTimeEstimate)}s</p>
              <p className="mt-2 text-sm text-ink-200">Hook: {clip.clipHook}</p>
              <ul className="mt-3 space-y-2 text-sm">
                {variants.map((v) => (
                  <li key={v.estimatedDurationSeconds} className="rounded-lg border border-ink-800 p-2">
                    <p className="text-xs text-ink-300">{v.estimatedDurationSeconds}s variant</p>
                    <p className="font-semibold">{v.shortTitle}</p>
                    <p className="text-xs text-ink-300">{v.captionPlan.shortLines.join(' · ')}</p>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}
