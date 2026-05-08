import { runCompliance } from '@/lib/compliance-engine';

const SAMPLE_SCRIPT =
  'In this video we break down index fund basics for beginners, expense ratios, and tax considerations. We also mention an affiliate link to a vetted brokerage in the description.';

export default function ComplianceChecklist() {
  const compliance = runCompliance({
    scriptText: SAMPLE_SCRIPT,
    metadata: { title: 'Index funds explained', description: 'Beginner-friendly guide. Some links in the description may be affiliate links.', tags: ['index funds', 'investing'] },
    flags: { hasAffiliateLinks: true, hasSponsor: false, aiGeneratedContent: true, thirdPartyFootage: false }
  });
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Compliance checklist</h2>
      <p className="text-xs text-ink-300">Topic flags: {compliance.topicFlags.join(', ') || 'none'}</p>
      <ul className="space-y-2">
        {compliance.disclaimers.required.map((d) => (
          <li key={d.key} className="rounded-lg border border-ink-800 p-3 text-sm">
            <p className="font-semibold">{d.key.replace(/_/g, ' ')}</p>
            <p className="mt-1 text-xs text-ink-200">{d.text}</p>
          </li>
        ))}
      </ul>
      {compliance.issues.length > 0 ? (
        <div>
          <p className="text-xs uppercase tracking-wider text-ink-300">Issues</p>
          <ul className="mt-2 space-y-1 text-xs text-accent-400">
            {compliance.issues.map((i, idx) => (
              <li key={idx}>{i.severity}: {i.message}</li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
