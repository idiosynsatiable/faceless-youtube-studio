import { generateThumbnailsAndTitles } from '@/lib/thumbnail-engine';

export default function ThumbnailBriefCard({ title = 'Index funds explained', audience = 'finance beginners' }: { title?: string; audience?: string }) {
  const out = generateThumbnailsAndTitles(title, audience);
  return (
    <div className="card">
      <h2 className="text-lg font-semibold">Thumbnail brief</h2>
      <p className="text-xs text-ink-300">No-clickbait check: {out.noClickbaitCheck.passed ? 'passed' : 'failed'}</p>
      <ul className="mt-4 space-y-2">
        {out.thumbnails.map((t) => (
          <li key={t.index} className="rounded-lg border border-ink-800 p-3 text-sm">
            <p className="font-semibold">Concept {t.index}</p>
            <p className="text-ink-200">{t.description}</p>
            <p className="mt-1 text-xs text-ink-300">Composition: {t.composition} · Color: {t.color}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
