import type { TrendOutput } from './trend-radar';
import type { ComplianceReport } from './compliance-engine';

export type LiveTrendSource = 'news' | 'youtube_suggestions' | 'google_trends' | 'reddit' | 'tiktok' | 'x' | 'manual';

export interface LiveTrendCandidate {
  topic: string;
  source: LiveTrendSource;
  whyNow: string;
  sourceUrls: string[];
  confidence: number;
  velocity: number;
  novelty: number;
  channelFit: number;
  keywords: string[];
  discoveredAt: string;
}

export interface ResearchClaim {
  claim: string;
  sourceUrl: string;
  sourceTitle?: string;
  primarySource?: boolean;
}

export interface ResearchDossier {
  summary: string;
  keyFacts: string[];
  claims: ResearchClaim[];
  sourceUrls: string[];
  uncertainty: string[];
  riskFlags: string[];
  confidence: number;
  researchedAt: string;
}

export interface OpportunityEvaluation {
  opportunityScore: number;
  eligible: boolean;
  blockers: string[];
  components: {
    deterministic: number;
    confidence: number;
    velocity: number;
    novelty: number;
    channelFit: number;
    sourceQuality: number;
  };
}

function clamp(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function normalizeTopic(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

export function uniqueHttpSources(urls: string[]): string[] {
  const out = new Set<string>();
  for (const value of urls) {
    try {
      const url = new URL(value);
      if (url.protocol === 'https:' || url.protocol === 'http:') out.add(url.toString());
    } catch {
      // Invalid citations never count as evidence.
    }
  }
  return Array.from(out);
}

export function evaluateOpportunity(
  candidate: LiveTrendCandidate,
  deterministic: TrendOutput,
  options: { minScore: number; minSources: number; minConfidence: number }
): OpportunityEvaluation {
  const sources = uniqueHttpSources(candidate.sourceUrls);
  const sourceQuality = clamp(Math.min(100, sources.length * 24 + (candidate.source === 'news' ? 12 : 0)));
  const components = {
    deterministic: clamp(deterministic.trendScore),
    confidence: clamp(candidate.confidence),
    velocity: clamp(candidate.velocity),
    novelty: clamp(candidate.novelty),
    channelFit: clamp(candidate.channelFit),
    sourceQuality
  };
  const score = clamp(
    components.deterministic * 0.34 + components.confidence * 0.18 + components.velocity * 0.18 +
    components.novelty * 0.10 + components.channelFit * 0.12 + components.sourceQuality * 0.08
  );
  const blockers: string[] = [];
  if (sources.length < options.minSources) blockers.push(`requires at least ${options.minSources} independent source URLs`);
  if (candidate.confidence < options.minConfidence) blockers.push(`source confidence ${candidate.confidence} is below ${options.minConfidence}`);
  if (deterministic.advertiserSafetyScore < 60) blockers.push('advertiser-safety score is below 60');
  if (score < options.minScore) blockers.push(`opportunity score ${score} is below ${options.minScore}`);
  if (!candidate.whyNow.trim()) blockers.push('missing why-now evidence');
  return { opportunityScore: score, eligible: blockers.length === 0, blockers, components };
}

export function finalEditorialGate(input: {
  opportunity: OpportunityEvaluation;
  dossier: ResearchDossier;
  compliance: ComplianceReport;
  isDuplicate: boolean;
  channelMatches: boolean;
  minSources: number;
  minConfidence: number;
}): { allowed: boolean; blockers: string[] } {
  const blockers = [...input.opportunity.blockers];
  const sources = uniqueHttpSources([...input.dossier.sourceUrls, ...input.dossier.claims.map((claim) => claim.sourceUrl)]);
  if (!input.opportunity.eligible) blockers.push('trend opportunity did not pass ensemble scoring');
  if (sources.length < input.minSources) blockers.push(`research dossier has fewer than ${input.minSources} sources`);
  if (input.dossier.confidence < input.minConfidence) blockers.push('research confidence is below policy threshold');
  if (input.dossier.claims.some((claim) => !uniqueHttpSources([claim.sourceUrl]).length)) blockers.push('research contains an uncited material claim');
  if (!input.compliance.passed || input.compliance.issues.some((issue) => issue.severity === 'high')) blockers.push('compliance gate failed');
  if (input.isDuplicate) blockers.push('topic duplicates a recent production');
  if (!input.channelMatches) blockers.push('authenticated YouTube channel does not match the configured target');
  const unique = Array.from(new Set(blockers));
  return { allowed: unique.length === 0, blockers: unique };
}
