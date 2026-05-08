// Subscriber growth engine. Lists organic, policy-safe strategies only.
// Explicitly excludes any fake engagement or bot tactic.

export interface GrowthPlan {
  organicStrategies: string[];
  weeklyRituals: string[];
  forbiddenTactics: string[];
  shortsToLongFunnel: string[];
  collaborationOutreach: string[];
  contentCalendarPrinciples: string[];
}

export const FORBIDDEN_GROWTH_TACTICS: string[] = [
  'Buying subscribers',
  'Buying likes',
  'Buying views',
  'Buying comments',
  'Bot networks',
  'Engagement pods',
  'Spam DMs to viewers',
  'Misleading thumbnails',
  'Impersonation',
  'Comment spam',
  'View manipulation',
  'Subscribe-for-subscribe schemes'
];

export function buildGrowthPlan(): GrowthPlan {
  return {
    organicStrategies: [
      'Series design with consistent packaging',
      'Strong hooks tied to a clear viewer promise',
      'Thumbnail consistency across episodes',
      'Niche promise visible in channel banner and trailer',
      'End-screen routes to next video and lead magnet',
      'Pinned comment CTA that adds value before linking',
      'Community posts that reinforce the niche promise',
      'Shorts-to-long-form funnel anchored to current series',
      'Newsletter capture with a useful free resource',
      'Playlist architecture that guides binge sessions',
      'Polls in community tab to learn the audience',
      'Editing for retention (cuts on motion, recap cards)',
      'Comment response workflow within first 48 hours',
      'Real collaboration outreach to adjacent creators',
      'Repurposing the long-form into multi-platform clips with disclosure',
      'Iterating based on real analytics'
    ],
    weeklyRituals: [
      'Plan next 4 videos in the queue',
      'Review last published video retention curve',
      'Reply to top comments and pin highest-value reply',
      'Cut 2 Shorts from the latest long-form',
      'Send 1 newsletter recap',
      'Reach out to 2 collaborators'
    ],
    forbiddenTactics: FORBIDDEN_GROWTH_TACTICS,
    shortsToLongFunnel: [
      'Tease one clear point in the Short',
      'Use a verbal hook for the long-form',
      'Pin the Short in the community tab',
      'Add the long-form to the relevant playlist'
    ],
    collaborationOutreach: [
      'Identify creators in adjacent topics with similar audience size',
      'Offer a clearly defined value exchange (a guest segment, a research swap, a topic crossover)',
      'Propose specific dates and topic angles',
      'Document deliverables and disclosure language'
    ],
    contentCalendarPrinciples: [
      'Same-day, same-time posting cadence',
      'Predictable series with recognizable thumbnails',
      'Mix of evergreen and timely topics',
      'Quarterly topical reviews to retire weak performers'
    ]
  };
}
