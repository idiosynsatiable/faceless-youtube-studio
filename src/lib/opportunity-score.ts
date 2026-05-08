// Combines trend score, niche score, and demographic fit into a single opportunity rating.

import type { TrendOutput } from './trend-radar';
import type { NicheScoreOutput } from './niche-scorer';

export interface OpportunityScoreInput {
  trend: TrendOutput;
  niche: NicheScoreOutput;
  audienceFit: number;
}

export interface OpportunityScoreOutput {
  opportunityScore: number;
  verdict: 'green_light' | 'cautious' | 'avoid';
  rationale: string[];
}

export function opportunityScore(input: OpportunityScoreInput): OpportunityScoreOutput {
  const fit = Math.max(0, Math.min(100, Math.round(input.audienceFit)));
  const score = Math.round(
    input.trend.trendScore * 0.4 + input.niche.score * 0.4 + fit * 0.2
  );
  const rationale: string[] = [];
  rationale.push(`Trend score ${input.trend.trendScore} (${input.trend.searchIntent} intent).`);
  rationale.push(`Niche label ${input.niche.label} at ${input.niche.score}.`);
  rationale.push(`Audience fit ${fit}.`);
  let verdict: OpportunityScoreOutput['verdict'] = 'cautious';
  if (score >= 78 && input.trend.advertiserSafetyScore >= 60) verdict = 'green_light';
  if (score < 50 || input.trend.advertiserSafetyScore < 40) verdict = 'avoid';
  return { opportunityScore: score, verdict, rationale };
}
