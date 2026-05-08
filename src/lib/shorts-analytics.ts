// Shorts analytics. Reads only the snapshot the user provides, never fabricates data.
// Returns concrete next moves that respect platform policy (no fake engagement).

export interface ShortsAnalyticsSnapshot {
  shortTitle: string;
  topicCluster?: string;
  views: number;
  averageViewDurationSeconds: number;
  durationSeconds: number;
  viewedVsSwipedRate?: number;
  likes: number;
  comments: number;
  shares: number;
  subscribersGained: number;
  longFormClicks?: number;
  trafficSource?: string;
}

export interface ShortsAnalyticsRecommendation {
  summary: string;
  makeMoreLikeThis: boolean;
  convertToLongForm: boolean;
  pauseTopicCluster: boolean;
  reviseHook: boolean;
  reviseCaption: boolean;
  improvePacing: boolean;
  improveVisualMotion: boolean;
  improveCta: boolean;
  recommendedNextShorts: string[];
  rationale: string[];
  policyNotes: string[];
}

const POLICY_NOTES: string[] = [
  'No buying subscribers, likes, or views',
  'No engagement pods or sub-for-sub schemes',
  'No bot comments',
  'No incentivized fake engagement',
  'No deceptive metadata or copy',
  'Verify any spike against a credible cause before doubling down'
];

export function analyzeShorts(snapshot: ShortsAnalyticsSnapshot): ShortsAnalyticsRecommendation {
  const viewRatio = snapshot.durationSeconds > 0 ? snapshot.averageViewDurationSeconds / snapshot.durationSeconds : 0;
  const swipedAwayRate = snapshot.viewedVsSwipedRate ?? Math.max(0, 1 - viewRatio);
  const longClickRate = snapshot.views > 0 ? (snapshot.longFormClicks ?? 0) / snapshot.views : 0;
  const subRate = snapshot.views > 0 ? snapshot.subscribersGained / snapshot.views : 0;
  const engagementRate = snapshot.views > 0 ? (snapshot.likes + snapshot.comments + snapshot.shares) / snapshot.views : 0;

  const rationale: string[] = [];
  rationale.push(`Average view duration ratio: ${(viewRatio * 100).toFixed(1)}%`);
  rationale.push(`Swiped-away rate (estimated if not provided): ${(swipedAwayRate * 100).toFixed(1)}%`);
  rationale.push(`Long-form click-through: ${(longClickRate * 100).toFixed(2)}%`);
  rationale.push(`Subscriber rate: ${(subRate * 100).toFixed(2)}%`);
  rationale.push(`Engagement rate: ${(engagementRate * 100).toFixed(2)}%`);

  const reviseHook = viewRatio < 0.6 || swipedAwayRate > 0.55;
  const reviseCaption = viewRatio < 0.5;
  const improvePacing = viewRatio < 0.65;
  const improveVisualMotion = viewRatio < 0.55;
  const improveCta = longClickRate < 0.02 || subRate < 0.005;
  const makeMoreLikeThis = viewRatio >= 0.7 && engagementRate >= 0.05;
  const convertToLongForm = makeMoreLikeThis && (longClickRate >= 0.03 || subRate >= 0.01);
  const pauseTopicCluster = viewRatio < 0.4 && engagementRate < 0.02;

  const recommendedNext: string[] = [];
  if (makeMoreLikeThis) recommendedNext.push(`Produce 2 more Shorts in the same beat as "${snapshot.shortTitle}"`);
  if (convertToLongForm) recommendedNext.push(`Draft a long-form expansion of "${snapshot.shortTitle}"`);
  if (reviseHook) recommendedNext.push('Test 2 alternative hooks (numerical and curiosity-led) for the next Short');
  if (improveVisualMotion) recommendedNext.push('Cut the first frame faster and add one more cut-on-motion in the first 5 seconds');
  if (improveCta) recommendedNext.push('Tighten end CTA to a single instruction tied to the long-form anchor');
  if (pauseTopicCluster && snapshot.topicCluster) {
    recommendedNext.push(`Pause cluster "${snapshot.topicCluster}" for 7 days; rotate angles or sub-niche`);
  }

  const summaryParts: string[] = [];
  if (makeMoreLikeThis) summaryParts.push('strong performer');
  else if (pauseTopicCluster) summaryParts.push('weak performer - rotate cluster');
  else summaryParts.push('mixed - iterate hook and pacing');
  if (convertToLongForm) summaryParts.push('expand to long-form');

  return {
    summary: summaryParts.join('; '),
    makeMoreLikeThis,
    convertToLongForm,
    pauseTopicCluster,
    reviseHook,
    reviseCaption,
    improvePacing,
    improveVisualMotion,
    improveCta,
    recommendedNextShorts: recommendedNext,
    rationale,
    policyNotes: POLICY_NOTES
  };
}
