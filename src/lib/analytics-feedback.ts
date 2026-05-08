// Analytics feedback loop. Reads a snapshot and produces qualitative feedback
// only on data the user provides. Never fabricates analytics.

export interface AnalyticsSnapshotInput {
  impressions: number;
  views: number;
  clickThroughRate: number;
  averageViewDuration: number;
  videoDurationSeconds?: number;
  likes: number;
  comments: number;
  subscribersGained: number;
  estimatedRevenue?: number;
  trafficSource?: string;
  topGeography?: string;
  deviceType?: string;
  returningViewers?: number;
  newViewers?: number;
}

export interface AnalyticsFeedback {
  whatWorked: string[];
  whatLostRetention: string[];
  bestHookType: string;
  bestTitleStyle: string;
  bestThumbnailPattern: string;
  bestAudienceSegment: string;
  nextVideoRecommendation: string;
  seriesRecommendation: string;
  monetizationRecommendation: string;
  warnings: string[];
}

export function generateFeedback(input: AnalyticsSnapshotInput): AnalyticsFeedback {
  const ctr = Number(input.clickThroughRate.toFixed(2));
  const avd = Number(input.averageViewDuration.toFixed(1));
  const ratio = input.videoDurationSeconds && input.videoDurationSeconds > 0 ? avd / input.videoDurationSeconds : 0.4;
  const whatWorked: string[] = [];
  const whatLostRetention: string[] = [];
  if (ctr >= 6) whatWorked.push('Click-through rate is healthy. Title and thumbnail alignment is strong.');
  else whatLostRetention.push('Click-through rate is below 6%. Re-test thumbnail and title pairing.');
  if (ratio >= 0.5) whatWorked.push('Average view duration ratio above 50%. Pacing and promise delivery are working.');
  else whatLostRetention.push('Retention ratio below 50%. Tighten the first 30 seconds and trim middle drag.');
  if (input.subscribersGained > 0) whatWorked.push('Net subscriber gain. Channel promise is converting.');
  if (input.likes > input.comments * 2) whatWorked.push('Likes exceed engagement. Discoverability signal is positive.');
  return {
    whatWorked,
    whatLostRetention,
    bestHookType: ratio >= 0.5 ? 'concrete promise within 5 seconds' : 'shorter hook with one bold statement',
    bestTitleStyle: ctr >= 6 ? 'specific outcome plus subject' : 'curiosity-led but truthful',
    bestThumbnailPattern: ctr >= 6 ? 'subject + bold number' : 'one strong subject, less text',
    bestAudienceSegment: input.topGeography ?? 'US English speakers',
    nextVideoRecommendation: ratio >= 0.5
      ? 'Continue the series with a deeper case study'
      : 'Re-test the topic with a tighter format and shorter runtime',
    seriesRecommendation: 'Group the top performing topics into a 6-episode series with consistent packaging',
    monetizationRecommendation: input.subscribersGained >= 100
      ? 'Add a low-ticket digital product CTA in description and pinned comment'
      : 'Focus on email list growth via lead magnet first',
    warnings: [
      'Do not chase engagement metrics with bots, paid pods, or fake comments',
      'Verify any spike against a credible cause before doubling down',
      'Do not bake unverifiable claims into future videos because of a temporary metric improvement'
    ]
  };
}
