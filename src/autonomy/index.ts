import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from '@/lib/config';
import { getPrisma } from '@/lib/db';
import { decryptSecret } from '@/lib/crypto-vault';
import { requestJson } from '@/lib/openai-json';
import {
  evaluateOpportunity,
  finalEditorialGate,
  normalizeTopic,
  uniqueHttpSources,
  type LiveTrendCandidate,
  type LiveTrendSource,
  type ResearchDossier
} from '@/lib/autonomy-policy';
import { scoreTrend, type TrendOutput } from '@/lib/trend-radar';
import { generateIdeas, type VideoIdea } from '@/lib/idea-engine';
import { generatePremiumPackage, type PremiumPackage } from '@/lib/premium-package';
import { runCompliance, type ComplianceReport } from '@/lib/compliance-engine';
import { generateStoryboard } from '@/lib/storyboard-engine';
import { refreshAccessToken, verifyTargetChannel } from '@/lib/youtube-client';
import { fetchMostPopularVideos, type PopularVideoSignal } from '@/lib/youtube-trends';
import { getQueueProducer } from '@/lib/queue-producer';
import { initializeRedisQueueProducer, shutdownRedisQueueProducer } from '@/queue/redis-bootstrap';
import { writeGeneratedVisuals } from '@/worker/generated-visuals';
import { writeNarrationAssets } from '@/worker/narration-assets';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const RECENT_TOPIC_DAYS = 21;
const OPERATOR_EMAIL = process.env.OPERATOR_EMAIL ?? 'operator@faceless-studio.local';
const INPUT_ROOT = path.resolve((process.env.WORKER_INPUT_ALLOWLIST ?? '/var/lib/faceless-studio/inputs').split(',')[0] || '/var/lib/faceless-studio/inputs');

interface CandidatePayload {
  candidates?: Array<Record<string, unknown>>;
}

interface DossierPayload {
  summary?: unknown;
  keyFacts?: unknown;
  claims?: Array<Record<string, unknown>>;
  sourceUrls?: unknown;
  uncertainty?: unknown;
  riskFlags?: unknown;
  confidence?: unknown;
}

export interface AutonomyTickResult {
  status: 'disabled' | 'skipped' | 'queued';
  reason?: string;
  topic?: string;
  projectId?: string;
  uploadJobId?: string;
  opportunityScore?: number;
}

function log(message: string): void {
  process.stdout.write(`${new Date().toISOString()} [autonomy] ${message}\n`);
}

function clampScore(value: unknown, fallback = 50): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function stringList(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
    .map((item) => item.trim())
    .slice(0, max);
}

function source(value: unknown): LiveTrendSource {
  const allowed: LiveTrendSource[] = ['news', 'youtube_suggestions', 'google_trends', 'reddit', 'tiktok', 'x', 'manual'];
  return typeof value === 'string' && allowed.includes(value as LiveTrendSource)
    ? value as LiveTrendSource
    : 'youtube_suggestions';
}

function sanitizeCandidate(raw: Record<string, unknown>): LiveTrendCandidate | null {
  const topic = typeof raw.topic === 'string' ? raw.topic.trim().slice(0, 160) : '';
  const whyNow = typeof raw.whyNow === 'string' ? raw.whyNow.trim().slice(0, 1000) : '';
  if (topic.length < 2 || !whyNow) return null;
  return {
    topic,
    source: source(raw.source),
    whyNow,
    sourceUrls: uniqueHttpSources(stringList(raw.sourceUrls, 12)),
    confidence: clampScore(raw.confidence, 60),
    velocity: clampScore(raw.velocity, 60),
    novelty: clampScore(raw.novelty, 55),
    channelFit: clampScore(raw.channelFit, 60),
    keywords: stringList(raw.keywords, 20),
    discoveredAt: new Date().toISOString()
  };
}

function sanitizeDossier(raw: DossierPayload): ResearchDossier {
  const claims = Array.isArray(raw.claims)
    ? raw.claims.flatMap((claim) => {
        const text = typeof claim.claim === 'string' ? claim.claim.trim() : '';
        const sourceUrl = typeof claim.sourceUrl === 'string' ? uniqueHttpSources([claim.sourceUrl])[0] : undefined;
        if (!text || !sourceUrl) return [];
        return [{
          claim: text,
          sourceUrl,
          sourceTitle: typeof claim.sourceTitle === 'string' ? claim.sourceTitle.trim() : undefined,
          primarySource: claim.primarySource === true
        }];
      }).slice(0, 20)
    : [];
  const sourceUrls = uniqueHttpSources([
    ...stringList(raw.sourceUrls, 20),
    ...claims.map((claim) => claim.sourceUrl)
  ]);
  return {
    summary: typeof raw.summary === 'string' ? raw.summary.trim() : '',
    keyFacts: stringList(raw.keyFacts, 20),
    claims,
    sourceUrls,
    uncertainty: stringList(raw.uncertainty, 12),
    riskFlags: stringList(raw.riskFlags, 12),
    confidence: clampScore(raw.confidence, 0),
    researchedAt: new Date().toISOString()
  };
}

async function discoverCandidates(signals: PopularVideoSignal[], niche: string, region: string, language: string): Promise<LiveTrendCandidate[]> {
  const compactSignals = signals.slice(0, 20).map((video) => ({
    title: video.title,
    channel: video.channelTitle,
    categoryId: video.categoryId,
    publishedAt: video.publishedAt,
    views: video.viewCount,
    likes: video.likeCount,
    comments: video.commentCount,
    url: video.url
  }));
  const prompt = `You are the trend-intelligence layer for an autonomous, policy-safe faceless YouTube channel. Channel niche: ${niche}. Region: ${region}. Language: ${language}.

YouTube's official mostPopular feed currently contains these signals: ${JSON.stringify(compactSignals)}.

Use web search to validate what is actually rising now and return 3 to 6 topic-level opportunities, not copies of individual videos. Favor explanatory, technology, science, culture, creator-economy, engineering, software, product, history, and high-curiosity informational angles that can be covered with original generated visuals. Exclude political persuasion, elections, breaking tragedy, graphic crime, medical or financial advice, sexual content, regulated goods, minors-focused controversy, celebrity rumor, fabricated urgency, and any concept that depends on reusing copyrighted clips. Every candidate needs at least two independent HTTP source URLs when possible. Do not invent statistics or citations.

Return ONLY JSON: {"candidates":[{"topic":"...","source":"news|youtube_suggestions|google_trends|reddit|tiktok|x|manual","whyNow":"...","sourceUrls":["https://..."],"confidence":0,"velocity":0,"novelty":0,"channelFit":0,"keywords":["..."]}]}.`;
  const payload = await requestJson<CandidatePayload>(prompt, { webSearch: true });
  return (payload.candidates ?? []).map(sanitizeCandidate).filter((item): item is LiveTrendCandidate => item !== null);
}

async function researchCandidate(candidate: LiveTrendCandidate): Promise<ResearchDossier> {
  const prompt = `Research this YouTube topic for a factual autonomous production: ${candidate.topic}. Why it appears timely: ${candidate.whyNow}. Initial sources: ${JSON.stringify(candidate.sourceUrls)}.

Use web search. Build a compact evidence dossier using independent reputable sources, preferring primary sources for material claims. Do not fabricate facts, quotes, dates, metrics, links, or consensus. Explicitly record uncertainty. Avoid medical, financial, legal, political-persuasion, graphic, or rumor framing even if search results contain it. The dossier needs enough evidence for a truthful 7-10 minute explainer and at least ${config.autonomy.minSourceCount} valid HTTP sources.

Return ONLY JSON: {"summary":"...","keyFacts":["..."],"claims":[{"claim":"...","sourceUrl":"https://...","sourceTitle":"...","primarySource":true}],"sourceUrls":["https://..."],"uncertainty":["..."],"riskFlags":["..."],"confidence":0}.`;
  return sanitizeDossier(await requestJson<DossierPayload>(prompt, { webSearch: true }));
}

async function recentTopics(prisma: NonNullable<ReturnType<typeof getPrisma>>, userId: string): Promise<Set<string>> {
  const since = new Date(Date.now() - RECENT_TOPIC_DAYS * DAY_MS);
  const records = await prisma.trendTopic.findMany({
    where: { userId, createdAt: { gte: since } },
    select: { topic: true }
  });
  return new Set(records.map((item) => normalizeTopic(item.topic)).filter(Boolean));
}

async function cadenceBlocker(prisma: NonNullable<ReturnType<typeof getPrisma>>, userId: string): Promise<string | null> {
  const now = Date.now();
  const dayStart = new Date(now - DAY_MS);
  const count = await prisma.uploadJob.count({ where: { userId, createdAt: { gte: dayStart } } });
  if (count >= config.autonomy.maxUploadsPerDay) {
    return `daily upload cap reached (${count}/${config.autonomy.maxUploadsPerDay})`;
  }
  const last = await prisma.uploadJob.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } });
  if (last && now - last.createdAt.getTime() < config.autonomy.minHoursBetweenUploads * HOUR_MS) {
    return `minimum spacing window is still active (${config.autonomy.minHoursBetweenUploads}h)`;
  }
  return null;
}

function deterministicFor(candidate: LiveTrendCandidate, region: string, language: string, audienceHint: string): TrendOutput {
  return scoreTrend({
    topic: candidate.topic,
    region,
    language,
    source: candidate.source,
    audienceHint
  });
}

async function persistProduction(args: {
  prisma: NonNullable<ReturnType<typeof getPrisma>>;
  userId: string;
  channelId: string;
  candidate: LiveTrendCandidate;
  deterministic: TrendOutput;
  idea: VideoIdea;
  premium: PremiumPackage;
  dossier: ResearchDossier;
  compliance: ComplianceReport;
  opportunityScore: number;
}) {
  const { prisma } = args;
  const trend = await prisma.trendTopic.create({
    data: {
      userId: args.userId,
      topic: args.candidate.topic,
      region: args.deterministic.region,
      language: args.deterministic.language,
      source: args.candidate.source,
      trendScore: args.deterministic.trendScore,
      monetizationScore: args.deterministic.monetizationScore,
      competitionScore: args.deterministic.competitionScore,
      advertiserSafetyScore: args.deterministic.advertiserSafetyScore
    }
  });
  const idea = await prisma.videoIdea.create({
    data: {
      userId: args.userId,
      channelId: args.channelId,
      topicId: trend.id,
      title: args.premium.title,
      hook: args.premium.hook,
      audience: args.idea.audience,
      format: args.idea.format,
      score: args.opportunityScore,
      monetizationAngle: args.idea.monetizationAngle,
      status: 'selected_autonomously'
    }
  });
  const storyboard = generateStoryboard({
    title: args.premium.title,
    scenesTarget: Math.max(8, Math.min(24, args.premium.visualPrompts.length * 2)),
    scriptText: args.premium.script
  });
  const project = await prisma.videoProject.create({
    data: {
      userId: args.userId,
      channelId: args.channelId,
      ideaId: idea.id,
      title: args.premium.title,
      scriptJson: {
        hook: args.premium.hook,
        text: args.premium.script,
        sources: args.dossier.sourceUrls,
        research: args.dossier
      },
      storyboardJson: storyboard,
      metadataJson: {
        title: args.premium.title,
        description: args.premium.description,
        tags: args.premium.tags,
        keywords: args.premium.keywords,
        categoryRecommendation: '27 Education',
        thumbnailPrompt: args.premium.thumbnailPrompt,
        sourceUrls: args.dossier.sourceUrls,
        production: {
          durationMinutes: args.premium.durationMinutes,
          shortsCount: args.premium.shortsCount
        },
        autonomy: {
          mode: 'owner_autopilot',
          targetHandle: config.autonomy.targetHandle,
          opportunityScore: args.opportunityScore,
          discoveredAt: args.candidate.discoveredAt,
          whyNow: args.candidate.whyNow
        }
      },
      complianceJson: args.compliance,
      monetizationJson: {
        primary: 'youtube_ads',
        secondary: 'contextual_sponsor_or_affiliate_only_when_relevant',
        noFakeEngagement: true
      },
      readinessScore: Math.max(0, Math.min(100, args.opportunityScore)),
      uploadStatus: 'generating_assets'
    }
  });
  return project;
}

async function createAssets(userId: string, projectId: string, premium: PremiumPackage): Promise<void> {
  const dir = path.join(INPUT_ROOT, userId, projectId);
  await fs.mkdir(dir, { recursive: true });
  await writeNarrationAssets(dir, premium.script, premium.durationMinutes);
  await writeGeneratedVisuals(dir, premium.visualPrompts);
}

export async function runAutonomyTick(): Promise<AutonomyTickResult> {
  if (!config.autonomy.enabled) return { status: 'disabled', reason: 'AUTONOMY_ENABLED is false' };
  if (!config.ai.enabled) return { status: 'skipped', reason: 'OPENAI_API_KEY is not configured' };
  if (!config.youtube.enabled) return { status: 'skipped', reason: 'YouTube OAuth client is not configured' };
  if (!process.env.REDIS_URL) return { status: 'skipped', reason: 'REDIS_URL is not configured' };

  const prisma = getPrisma();
  if (!prisma) return { status: 'skipped', reason: 'DATABASE_URL is not configured' };
  const user = await prisma.user.findUnique({ where: { email: OPERATOR_EMAIL } });
  if (!user) return { status: 'skipped', reason: `operator user ${OPERATOR_EMAIL} has not completed YouTube OAuth` };
  const channel = await prisma.channel.findFirst({
    where: { userId: user.id, oauthConnected: true },
    orderBy: { updatedAt: 'desc' }
  });
  if (!channel?.oauthRefreshTokenCipher || !channel.oauthRefreshTokenIv || !channel.oauthRefreshTokenAuthTag) {
    return { status: 'skipped', reason: 'no connected YouTube channel with an encrypted refresh token' };
  }

  const cadence = await cadenceBlocker(prisma, user.id);
  if (cadence) return { status: 'skipped', reason: cadence };

  const refreshToken = decryptSecret({
    cipher: channel.oauthRefreshTokenCipher,
    iv: channel.oauthRefreshTokenIv,
    authTag: channel.oauthRefreshTokenAuthTag
  });
  const refreshed = await refreshAccessToken(refreshToken);
  const channelLock = await verifyTargetChannel(
    refreshed.accessToken,
    config.autonomy.targetHandle,
    config.autonomy.targetChannelId
  );
  if (!channelLock.ok) return { status: 'skipped', reason: `target channel lock failed: ${channelLock.reason}` };

  const region = /^[A-Za-z]{2}$/.test(channel.regionFocus) ? channel.regionFocus.toUpperCase() : 'US';
  const language = channel.language || 'en';
  const popular = await fetchMostPopularVideos(refreshed.accessToken, region, 25);
  if (popular.length === 0) return { status: 'skipped', reason: 'YouTube mostPopular returned no trend signals' };

  const candidates = await discoverCandidates(popular, channel.niche || 'general informational', region, language);
  if (candidates.length === 0) return { status: 'skipped', reason: 'trend discovery returned no usable candidates' };
  const seen = await recentTopics(prisma, user.id);
  const ranked = candidates
    .map((candidate) => {
      const deterministic = deterministicFor(candidate, region, language, channel.niche || 'general audience');
      const opportunity = evaluateOpportunity(candidate, deterministic, {
        minScore: config.autonomy.minOpportunityScore,
        minSources: config.autonomy.minSourceCount,
        minConfidence: config.autonomy.minConfidence
      });
      return { candidate, deterministic, opportunity, duplicate: seen.has(normalizeTopic(candidate.topic)) };
    })
    .filter((item) => item.opportunity.eligible && !item.duplicate)
    .sort((a, b) => b.opportunity.opportunityScore - a.opportunity.opportunityScore);
  const selected = ranked[0];
  if (!selected) return { status: 'skipped', reason: 'no discovered topic passed opportunity, source, safety, and duplicate gates' };

  const dossier = await researchCandidate(selected.candidate);
  const ideas = generateIdeas({
    niche: channel.niche || 'general informational',
    audience: selected.deterministic.audienceSegment,
    region,
    language,
    monetizationGoal: 'balanced',
    count: 1,
    topics: [selected.candidate.topic]
  });
  const idea = ideas[0];
  if (!idea) return { status: 'skipped', reason: 'deterministic idea engine returned no seed' };

  const premium = await generatePremiumPackage({
    topic: selected.candidate.topic,
    dossier,
    deterministicSeed: {
      title: idea.title,
      hook: idea.hook,
      format: idea.format,
      retentionStrategy: idea.retentionStrategy,
      thumbnailConcept: idea.thumbnailConcept
    },
    shortsCount: config.autonomy.shortsPerVideo
  });
  const compliance = runCompliance({
    scriptText: premium.script,
    metadata: { title: premium.title, description: premium.description, tags: premium.tags },
    flags: { hasAffiliateLinks: false, hasSponsor: false, aiGeneratedContent: true, thirdPartyFootage: false }
  });
  const gate = finalEditorialGate({
    opportunity: selected.opportunity,
    dossier,
    compliance,
    isDuplicate: false,
    channelMatches: channelLock.ok,
    minSources: config.autonomy.minSourceCount,
    minConfidence: config.autonomy.minConfidence
  });
  if (!gate.allowed) return { status: 'skipped', reason: `final editorial gate blocked production: ${gate.blockers.join('; ')}` };

  const project = await persistProduction({
    prisma,
    userId: user.id,
    channelId: channel.id,
    candidate: selected.candidate,
    deterministic: selected.deterministic,
    idea,
    premium,
    dossier,
    compliance,
    opportunityScore: selected.opportunity.opportunityScore
  });

  try {
    await createAssets(user.id, project.id, premium);
    const upload = await prisma.uploadJob.create({
      data: {
        userId: user.id,
        videoProjectId: project.id,
        privacyStatus: config.autonomy.publishMode,
        status: 'queued'
      }
    });
    await getQueueProducer().enqueue({
      kind: 'upload',
      id: upload.id,
      videoProjectId: project.id,
      userId: user.id,
      privacyStatus: config.autonomy.publishMode,
      enqueuedAt: new Date().toISOString(),
      authorization: 'owner_autopilot'
    });
    await prisma.videoProject.update({ where: { id: project.id }, data: { uploadStatus: 'queued_for_publish' } });
    return {
      status: 'queued',
      topic: selected.candidate.topic,
      projectId: project.id,
      uploadJobId: upload.id,
      opportunityScore: selected.opportunity.opportunityScore
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.videoProject.update({ where: { id: project.id }, data: { uploadStatus: 'autonomy_failed' } }).catch(() => undefined);
    throw new Error(`asset generation or queueing failed for project ${project.id}: ${message}`);
  }
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export async function runAutonomyLoop(): Promise<void> {
  const bootstrap = await initializeRedisQueueProducer();
  if (!bootstrap.ok && bootstrap.reason !== 'no_redis_url') {
    log(`Redis queue bootstrap failed (${bootstrap.reason}): ${bootstrap.message ?? ''}`);
  }
  const signal = { aborted: false };
  for (const name of ['SIGTERM', 'SIGINT']) {
    process.on(name, () => {
      signal.aborted = true;
      log(`received ${name}; finishing current tick and stopping`);
    });
  }
  log(`controller started enabled=${config.autonomy.enabled} interval=${config.autonomy.intervalMinutes}m publishMode=${config.autonomy.publishMode} target=${config.autonomy.targetHandle}`);
  while (!signal.aborted) {
    try {
      const result = await runAutonomyTick();
      log(`${result.status}${result.reason ? `: ${result.reason}` : ''}${result.topic ? ` topic=${result.topic}` : ''}${result.projectId ? ` project=${result.projectId}` : ''}`);
    } catch (err) {
      log(`tick failed: ${err instanceof Error ? err.stack ?? err.message : String(err)}`);
    }
    if (!signal.aborted) await sleep(config.autonomy.intervalMinutes * 60_000);
  }
  await shutdownRedisQueueProducer();
  log('controller stopped');
}

const invokedAs = process.argv[1] ? path.resolve(process.argv[1]) : '';
const thisModule = path.resolve(fileURLToPath(import.meta.url));
if (invokedAs && invokedAs === thisModule) {
  runAutonomyLoop().catch((err) => {
    process.stderr.write(`[autonomy] fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
    process.exit(1);
  });
}
