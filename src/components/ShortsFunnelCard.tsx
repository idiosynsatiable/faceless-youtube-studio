import { planShortsFunnel } from '@/lib/shorts-funnel';

export default function ShortsFunnelCard() {
  const funnel = planShortsFunnel({
    shortTitle: 'Index funds: myth vs fact',
    niche: 'personal finance',
    audience: 'finance beginners',
    longFormTitle: 'Index funds explained for first-time investors',
    hasAffiliateLinks: true,
    monetizationGoal: 'affiliate',
    topicFlags: ['financial']
  });
  return (
    <div className="card space-y-3">
      <h2 className="text-lg font-semibold">Shorts -> long-form funnel</h2>
      <p className="text-sm text-ink-200">Related long-form: {funnel.relatedLongForm}</p>
      <div>
        <p className="text-xs uppercase tracking-wider text-ink-300">Pinned comment</p>
        <pre className="mt-1 whitespace-pre-wrap rounded-lg border border-ink-800 p-3 text-xs text-ink-200">{funnel.pinnedComment}</pre>
      </div>
      <p className="text-sm text-ink-200">Description CTA: {funnel.descriptionCta}</p>
      <p className="text-xs text-ink-300">Playlist: {funnel.playlistRecommendation}</p>
      <p className="text-xs text-ink-300">Monetization path: {funnel.monetizationPath}</p>
      {funnel.affiliateDisclosure ? (
        <p className="text-xs text-ink-300">Affiliate disclosure: {funnel.affiliateDisclosure}</p>
      ) : null}
    </div>
  );
}
