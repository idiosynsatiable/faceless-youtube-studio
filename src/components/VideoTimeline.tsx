import { planVideoAssembly } from '@/lib/video-assembler';

export default function VideoTimeline() {
  const plan = planVideoAssembly({
    title: 'Index funds explained',
    durationMinutes: 9,
    shortsCount: 3,
    storyboardScenes: 8,
    style: 'cinematic-clean'
  });
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Timeline plan</h2>
      <p className="text-xs text-ink-300">Output base filename: <span className="font-mono">{plan.outputBaseFilename}</span></p>
      <div className="mt-4 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-ink-300">
            <tr>
              <th className="pb-2 pr-4">Scene</th>
              <th className="pb-2 pr-4">Duration</th>
              <th className="pb-2">Transition</th>
            </tr>
          </thead>
          <tbody>
            {plan.timeline.map((t) => (
              <tr key={t.sceneIndex} className="border-t border-ink-800">
                <td className="py-2 pr-4">{t.sceneIndex}</td>
                <td className="py-2 pr-4">{t.durationSeconds}s</td>
                <td className="py-2">{t.transition}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="mt-6">
        <h3 className="text-sm font-semibold">Export profiles</h3>
        <ul className="mt-2 grid gap-2 md:grid-cols-2">
          {plan.exportProfiles.map((p) => (
            <li key={p.name} className="rounded-lg border border-ink-800 p-2 text-xs">
              <span className="font-semibold">{p.name}</span> — {p.width}x{p.height} @ {p.fps}fps · {p.bitrateKbps}kbps
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
