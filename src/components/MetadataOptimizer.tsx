import { generateMetadata } from '@/lib/metadata-engine';

export default function MetadataOptimizer() {
  const meta = generateMetadata({
    title: 'Index funds explained for first-time investors',
    niche: 'personal finance',
    audience: 'finance beginners',
    keywords: ['index fund basics', 'first investment', 'low cost investing'],
    hasAffiliateLinks: true,
    hasSponsor: false,
    topicFlags: ['financial']
  });
  return (
    <div className="card space-y-4">
      <h2 className="text-lg font-semibold">Metadata package</h2>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Title options</p>
        <ul className="mt-2 list-inside list-disc text-sm text-ink-200">
          {meta.titleOptions.slice(0, 5).map((t) => (
            <li key={t.index}>{t.text}</li>
          ))}
        </ul>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Description</p>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-ink-800 p-3 text-xs text-ink-200">{meta.description}</pre>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Tags</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {meta.tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Pinned comment</p>
        <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-ink-800 p-3 text-xs text-ink-200">{meta.pinnedComment}</pre>
      </div>
    </div>
  );
}
