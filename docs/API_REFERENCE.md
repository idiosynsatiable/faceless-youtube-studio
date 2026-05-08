# API reference

All routes return JSON. POST routes accept JSON bodies validated with Zod. Errors return `{ error: string, details?: object }` with the appropriate HTTP status.

## GET /api/health

Returns `{ ok, service, version, integrations, timestamp }`.

## GET /api/trends

Returns `{ sources: TrendSourceMeta[] }`.

## POST /api/trends

Body: `{ topic, region, language, source, audienceHint? }`.
Returns `{ trend: TrendOutput }`.

## POST /api/niches/score

Body: `{ niche, region, language, competition, monetization, audienceUrgency, retentionPotential, advertiserSafety, evergreen, highIntent, affiliateFit, seriesPotential, internationalScalability }`.
Returns `{ niche: NicheScoreOutput }`.

## POST /api/demographics/analyze

Body: `{ topic, niche, region, language, monetizationGoal }`.
Returns `{ demographics: DemographicAnalysis }`.

## POST /api/ideas/generate

Body: `{ niche, audience, region, language, monetizationGoal, count, topics? }`.
Returns `{ ideas: VideoIdea[] }`.

## GET /api/ideas

Query: `niche`, `audience`, `region`, `language`, `monetizationGoal`, `count`.
Returns `{ ideas: VideoIdea[] }`.

## POST /api/scripts/generate

Body: `{ title, hook?, audience, format, tone, durationMinutes, keyPoints, sources, flags }`.
Returns `{ script: VideoScript }`.

## POST /api/storyboards/generate

Body: `{ title, scenesTarget, scriptText, scriptId? }`.
Returns `{ storyboard: Storyboard }`.

## POST /api/voiceover

Body: `{ text, tone }`.
Returns `{ voiceover: VoiceoverPlan }`.

## POST /api/video-plan/generate

Body: `{ title, durationMinutes, shortsCount, storyboardScenes, style }`.
Returns `{ plan: AssemblyPlan }`.

## POST /api/metadata/generate

Body: `{ title, niche, audience, keywords, hasAffiliateLinks, hasSponsor, topicFlags }`.
Returns `{ metadata: MetadataPackage }`.

## POST /api/compliance/check

Body: `{ scriptText, metadata: { title, description, tags }, flags: { hasAffiliateLinks, hasSponsor, aiGeneratedContent, thirdPartyFootage } }`.
Returns `{ compliance: ComplianceReport }`.

## POST /api/monetization/plan

Body: `{ niche, audience, region, monetizationGoal, channelSizeTier }`.
Returns `{ monetization: MonetizationPlan }`.

## POST /api/calendar/generate

Body: `{ channelName, niche, longFormPerWeek, shortsPerWeek, startDate, weeks }`.
Returns `{ calendar: { channelName, niche, weeks, entries } }`.

## POST /api/exports/generate

Body: `{ title, niche, audience, scriptText, storyboardJson?, metadataJson?, complianceJson?, monetizationJson?, calendarJson?, formats }`.
Returns `{ export: ExportBundle }`.

## GET /api/youtube/oauth

Disabled-safe: 503 when not configured. Otherwise returns `{ authorizeUrl, state }`.

## GET /api/youtube/callback

Disabled-safe: 503 when not configured. Otherwise returns `{ ok: true, state, nextStep }`.

## GET /api/youtube/channels

Disabled-safe: 503 when not configured. Otherwise returns `{ ok: true, channels: [...] }`.

## GET /api/youtube/analytics

Disabled-safe: 503 when not configured. Otherwise returns `{ ok: true, fields }` describing live data the route serves.

## POST /api/uploads/prepare

Body: `{ title, description, tags, category, privacyStatus, scheduledAt?, playlistId?, thumbnailKey? }`.
Returns `{ ok: true, package: UploadPackage }`.

## POST /api/uploads/publish

Body: `{ videoProjectId, authorization: 'user_confirmed', privacyStatus, scheduledAt? }`.
Returns 401 if authorization is missing. Returns 503 if YouTube OAuth is disabled.
On success: `{ ok: true, status, package }`.

## POST /api/billing/checkout

Body: `{ tier, successUrl, cancelUrl }`.
Returns 503 if Stripe is disabled. On success: `{ ok: true, url }`.

## POST /api/billing/webhook

Verifies Stripe signature with HMAC SHA-256 + constant-time comparison. Returns 503 if Stripe is disabled. Returns 400 if signature fails. On success: `{ ok: true, received: true, event }`.

## POST /api/shorts/generate

Body: `{ niche, audience, region?, language?, topic?, longFormTitle?, longFormSummary?, monetizationGoal?, formats?, count?, hasAffiliateLinks?, hasSponsor?, aiGeneratedContent?, topicFlags? }`.
Returns `{ shorts: ShortsConcept[] }` with title, hook, beats, visual plan, captions, hashtags, description, pinned comment, CTA, disclaimers, risk flags, and upload priority score.

## POST /api/shorts/from-longform

Body: `{ sourceVideoTitle, audience, niche, scriptText, segments?, maxClips?, monetizationGoal?, hasAffiliateLinks?, hasSponsor?, aiGeneratedContent?, topicFlags? }`.
Returns `{ source, clips, packages: [{ clip, variants: [15s, 30s, 60s] }] }`.

## POST /api/shorts/calendar

Body: `{ niche, audience, region?, channelStage, productionCapacity, longFormPerWeek?, audienceFatigueSignal?, startDate?, weeks?, topicClusters? }`.
Returns `{ calendar: { cadence, daily, weekly, warnings } }` with explicit refusal of spam-level cadence.

## POST /api/shorts/funnel

Body: `{ shortTitle, niche, audience, longFormTitle?, longFormPlaylist?, hasAffiliateLinks?, hasSponsor?, monetizationGoal?, channelName?, topicFlags? }`.
Returns `{ funnel }` with related long-form, pinned comment, description CTA, playlist, end-screen strategy, monetization path, ctaType, and disclaimers.

## POST /api/shorts/metadata

Body: `{ shortTitle, niche, audience, longFormTitle?, hasAffiliateLinks?, hasSponsor?, topicFlags?, format }`.
Returns `{ metadata: { title, description, hashtags, pinnedComment, cta, disclosure, disclaimers } }`.

## POST /api/shorts/analytics

Body: `{ shortTitle, topicCluster?, views, averageViewDurationSeconds, durationSeconds, viewedVsSwipedRate?, likes, comments, shares, subscribersGained, longFormClicks?, trafficSource? }`.
Returns `{ analytics: { summary, makeMoreLikeThis, convertToLongForm, pauseTopicCluster, reviseHook, reviseCaption, improvePacing, improveVisualMotion, improveCta, recommendedNextShorts, rationale, policyNotes } }`.

## POST /api/exports/generate (extended)

Accepts `bundleType`: `video` (default), `shorts`, or `combined`. The combined bundle includes both the long-form package and the Shorts package (15s, 30s, 60s scripts, calendar, funnel, monetization notes, compliance notes).
