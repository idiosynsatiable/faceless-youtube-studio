// Zod schemas shared by API routes.

import { z } from 'zod';

export const trendInput = z.object({
  topic: z.string().min(2).max(160),
  region: z.string().min(1).max(40).default('US'),
  language: z.string().min(2).max(20).default('en'),
  source: z.enum([
    'youtube_suggestions',
    'google_trends',
    'reddit',
    'tiktok',
    'x',
    'news',
    'csv_import',
    'manual'
  ]).default('manual'),
  audienceHint: z.string().max(120).optional()
});
export type TrendInput = z.infer<typeof trendInput>;

export const nicheInput = z.object({
  niche: z.string().min(2).max(120),
  region: z.string().default('US'),
  language: z.string().default('en'),
  competition: z.number().min(0).max(100).default(60),
  monetization: z.number().min(0).max(100).default(60),
  audienceUrgency: z.number().min(0).max(100).default(50),
  retentionPotential: z.number().min(0).max(100).default(60),
  advertiserSafety: z.number().min(0).max(100).default(70),
  evergreen: z.boolean().default(false),
  highIntent: z.boolean().default(false),
  affiliateFit: z.boolean().default(false),
  seriesPotential: z.boolean().default(false),
  internationalScalability: z.boolean().default(false)
});
export type NicheInput = z.infer<typeof nicheInput>;

export const demographicInput = z.object({
  topic: z.string().min(2),
  niche: z.string().min(2),
  region: z.string().default('US'),
  language: z.string().default('en'),
  monetizationGoal: z.string().default('balanced')
});
export type DemographicInput = z.infer<typeof demographicInput>;

export const ideaInput = z.object({
  niche: z.string().min(2),
  audience: z.string().min(2),
  region: z.string().default('US'),
  language: z.string().default('en'),
  monetizationGoal: z.string().default('balanced'),
  count: z.number().int().min(1).max(20).default(10),
  topics: z.array(z.string()).max(20).optional()
});
export type IdeaInput = z.infer<typeof ideaInput>;

export const scriptInput = z.object({
  title: z.string().min(2).max(160),
  hook: z.string().optional(),
  audience: z.string().min(2),
  format: z.string().min(2),
  tone: z.string().default('documentary'),
  durationMinutes: z.number().min(1).max(60).default(8),
  keyPoints: z.array(z.string()).max(20).default([]),
  sources: z.array(z.string()).max(20).default([]),
  flags: z.array(z.string()).max(20).default([])
});
export type ScriptInput = z.infer<typeof scriptInput>;

export const storyboardInput = z.object({
  scriptId: z.string().optional(),
  title: z.string().min(2),
  scenesTarget: z.number().int().min(3).max(40).default(10),
  scriptText: z.string().min(20)
});
export type StoryboardInput = z.infer<typeof storyboardInput>;

export const videoPlanInput = z.object({
  title: z.string().min(2),
  durationMinutes: z.number().min(1).max(60).default(8),
  shortsCount: z.number().int().min(0).max(10).default(3),
  storyboardScenes: z.number().int().min(3).max(40).default(10),
  style: z.string().default('cinematic-clean')
});
export type VideoPlanInput = z.infer<typeof videoPlanInput>;

export const metadataInput = z.object({
  title: z.string().min(2),
  niche: z.string().min(2),
  audience: z.string().min(2),
  keywords: z.array(z.string()).max(40).default([]),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  topicFlags: z.array(z.string()).default([])
});
export type MetadataInput = z.infer<typeof metadataInput>;

export const complianceInput = z.object({
  scriptText: z.string().min(10),
  metadata: z.object({
    title: z.string(),
    description: z.string().default(''),
    tags: z.array(z.string()).default([])
  }),
  flags: z.object({
    hasAffiliateLinks: z.boolean().default(false),
    hasSponsor: z.boolean().default(false),
    aiGeneratedContent: z.boolean().default(true),
    thirdPartyFootage: z.boolean().default(false)
  }).default({
    hasAffiliateLinks: false,
    hasSponsor: false,
    aiGeneratedContent: true,
    thirdPartyFootage: false
  })
});
export type ComplianceInput = z.infer<typeof complianceInput>;

export const monetizationInput = z.object({
  niche: z.string().min(2),
  audience: z.string().min(2),
  region: z.string().default('US'),
  monetizationGoal: z.string().default('balanced'),
  channelSizeTier: z.enum(['pre_monetization', 'small', 'mid', 'established']).default('pre_monetization')
});
export type MonetizationInput = z.infer<typeof monetizationInput>;

export const calendarInput = z.object({
  channelName: z.string().min(2),
  niche: z.string().min(2),
  longFormPerWeek: z.number().int().min(0).max(7).default(2),
  shortsPerWeek: z.number().int().min(0).max(21).default(4),
  startDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  weeks: z.number().int().min(1).max(12).default(4)
});
export type CalendarInput = z.infer<typeof calendarInput>;

export const exportInput = z.object({
  videoProjectId: z.string().optional(),
  title: z.string().min(2),
  niche: z.string().min(2),
  audience: z.string().min(2),
  scriptText: z.string().min(20),
  storyboardJson: z.unknown().optional(),
  metadataJson: z.unknown().optional(),
  complianceJson: z.unknown().optional(),
  monetizationJson: z.unknown().optional(),
  calendarJson: z.unknown().optional(),
  formats: z.array(z.enum(['markdown', 'json'])).default(['markdown', 'json'])
});
export type ExportInput = z.infer<typeof exportInput>;

export const shortsBundleInputSchema = z.object({
  title: z.string().min(2),
  niche: z.string().min(2),
  audience: z.string().min(2),
  longFormTitle: z.string().optional(),
  longFormScript: z.string().optional(),
  longFormStoryboardJson: z.unknown().optional(),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  monetizationGoal: z.enum(['balanced', 'affiliate', 'sponsor', 'product']).default('balanced'),
  topicFlags: z.array(z.string()).max(20).optional(),
  channelStage: z.enum(['new', 'growing', 'established']).default('new'),
  productionCapacity: z.enum(['low', 'medium', 'high']).default('medium'),
  weeks: z.number().int().min(1).max(12).default(4),
  formats: z.array(z.enum(['markdown', 'json'])).default(['markdown', 'json']),
  variantSeconds: z.array(z.union([z.literal(15), z.literal(30), z.literal(60)])).default([15, 30, 60])
});
export type ShortsBundleInputSchema = z.infer<typeof shortsBundleInputSchema>;

export const combinedBundleInput = exportInput.extend({
  shorts: shortsBundleInputSchema.optional(),
  bundleType: z.enum(['video', 'shorts', 'combined']).default('combined')
});
export type CombinedBundleInputSchema = z.infer<typeof combinedBundleInput>;

export const uploadPrepareInput = z.object({
  videoProjectId: z.string().optional(),
  title: z.string().min(2).max(100),
  description: z.string().max(5000).default(''),
  tags: z.array(z.string()).max(40).default([]),
  category: z.string().default('27'),
  privacyStatus: z.enum(['private', 'unlisted', 'public']).default('private'),
  scheduledAt: z.string().optional(),
  playlistId: z.string().optional(),
  thumbnailKey: z.string().optional()
});
export type UploadPrepareInput = z.infer<typeof uploadPrepareInput>;

export const uploadPublishInput = z.object({
  videoProjectId: z.string().min(1),
  authorization: z.literal('user_confirmed'),
  privacyStatus: z.enum(['private', 'unlisted', 'public']).default('private'),
  scheduledAt: z.string().optional()
});
export type UploadPublishInput = z.infer<typeof uploadPublishInput>;

export const billingCheckoutInput = z.object({
  tier: z.enum(['creator', 'studio', 'agency']),
  successUrl: z.string().url(),
  cancelUrl: z.string().url()
});
export type BillingCheckoutInput = z.infer<typeof billingCheckoutInput>;

const shortsFormat = z.enum([
  'quick_hook_15s',
  'mini_explainer_30s',
  'story_arc_45s',
  'high_retention_60s',
  'list_style',
  'myth_vs_fact',
  'three_things_you_missed',
  'before_you_try_this',
  'market_insight',
  'history_timeline',
  'product_comparison',
  'finance_disclaimer_safe',
  'tutorial_micro_step',
  'long_form_teaser',
  'comment_response'
]);

export const shortsGenerateInput = z.object({
  niche: z.string().min(2).max(120),
  audience: z.string().min(2).max(120),
  region: z.string().default('US'),
  language: z.string().default('en'),
  topic: z.string().max(160).optional(),
  longFormTitle: z.string().max(160).optional(),
  longFormSummary: z.string().max(2000).optional(),
  monetizationGoal: z.enum(['balanced', 'affiliate', 'sponsor', 'product']).default('balanced'),
  formats: z.array(shortsFormat).max(15).optional(),
  count: z.number().int().min(1).max(15).default(5),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  aiGeneratedContent: z.boolean().default(true),
  topicFlags: z.array(z.string()).max(20).optional()
});
export type ShortsGenerateInput = z.infer<typeof shortsGenerateInput>;

export const shortsFromLongformInput = z.object({
  sourceVideoId: z.string().max(120).optional(),
  sourceVideoTitle: z.string().min(2).max(160),
  audience: z.string().min(2).max(120),
  niche: z.string().min(2).max(120),
  scriptText: z.string().min(60),
  segments: z.array(
    z.object({
      text: z.string().min(2),
      index: z.number().int().min(0).default(0),
      startSeconds: z.number().min(0),
      endSeconds: z.number().min(0)
    })
  ).max(80).optional(),
  maxClips: z.number().int().min(1).max(10).default(5),
  monetizationGoal: z.enum(['balanced', 'affiliate', 'sponsor', 'product']).default('balanced'),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  aiGeneratedContent: z.boolean().default(true),
  topicFlags: z.array(z.string()).max(20).optional()
});
export type ShortsFromLongformInput = z.infer<typeof shortsFromLongformInput>;

export const shortsCalendarInput = z.object({
  niche: z.string().min(2).max(120),
  audience: z.string().min(2).max(120),
  region: z.string().default('US'),
  channelStage: z.enum(['new', 'growing', 'established']).default('new'),
  productionCapacity: z.enum(['low', 'medium', 'high']).default('medium'),
  longFormPerWeek: z.number().int().min(0).max(4).default(1),
  availableShorts: z.number().int().min(0).max(200).optional(),
  audienceFatigueSignal: z.enum(['low', 'medium', 'high']).default('low'),
  startDate: z.string().default(() => new Date().toISOString().slice(0, 10)),
  weeks: z.number().int().min(1).max(12).default(4),
  topicClusters: z.array(z.string()).max(20).optional()
});
export type ShortsCalendarInput = z.infer<typeof shortsCalendarInput>;

export const shortsFunnelInputSchema = z.object({
  shortTitle: z.string().min(2).max(160),
  shortHook: z.string().max(300).optional(),
  niche: z.string().min(2).max(120),
  audience: z.string().min(2).max(120),
  longFormTitle: z.string().max(160).optional(),
  longFormPlaylist: z.string().max(120).optional(),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  monetizationGoal: z.enum(['balanced', 'affiliate', 'sponsor', 'product']).default('balanced'),
  channelName: z.string().max(120).optional(),
  topicFlags: z.array(z.string()).max(20).optional()
});
export type ShortsFunnelInputSchema = z.infer<typeof shortsFunnelInputSchema>;

export const shortsMetadataInput = z.object({
  shortTitle: z.string().min(2).max(160),
  niche: z.string().min(2).max(120),
  audience: z.string().min(2).max(120),
  longFormTitle: z.string().max(160).optional(),
  hasAffiliateLinks: z.boolean().default(false),
  hasSponsor: z.boolean().default(false),
  topicFlags: z.array(z.string()).max(20).optional(),
  format: shortsFormat.default('mini_explainer_30s')
});
export type ShortsMetadataInput = z.infer<typeof shortsMetadataInput>;

export const shortsAnalyticsInput = z.object({
  shortTitle: z.string().min(2).max(160),
  topicCluster: z.string().max(120).optional(),
  views: z.number().int().min(0),
  averageViewDurationSeconds: z.number().min(0).max(120),
  durationSeconds: z.number().min(1).max(120),
  viewedVsSwipedRate: z.number().min(0).max(1).optional(),
  likes: z.number().int().min(0),
  comments: z.number().int().min(0),
  shares: z.number().int().min(0),
  subscribersGained: z.number().int().min(0),
  longFormClicks: z.number().int().min(0).optional(),
  trafficSource: z.string().max(120).optional()
});
export type ShortsAnalyticsInputSchema = z.infer<typeof shortsAnalyticsInput>;
