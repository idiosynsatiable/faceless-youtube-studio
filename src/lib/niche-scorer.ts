// Niche scoring engine. Uses the formula defined in the product spec.

import type { NicheInput } from './validators';

export interface NicheScoreOutput {
  niche: string;
  score: number;
  label: 'Exceptional' | 'Strong' | 'Promising' | 'Risky' | 'Avoid';
  breakdown: {
    competitionPenalty: number;
    monetizationPenalty: number;
    urgencyPenalty: number;
    retentionPenalty: number;
    advertiserSafetyPenalty: number;
    evergreenBonus: number;
    highIntentBonus: number;
    affiliateFitBonus: number;
    seriesPotentialBonus: number;
    internationalScalabilityBonus: number;
  };
  recommendation: string;
}

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function label(score: number): NicheScoreOutput['label'] {
  if (score >= 95) return 'Exceptional';
  if (score >= 85) return 'Strong';
  if (score >= 70) return 'Promising';
  if (score >= 50) return 'Risky';
  return 'Avoid';
}

export function scoreNiche(input: NicheInput): NicheScoreOutput {
  const competitionPenalty = Math.round(Math.max(0, input.competition - 50) * 0.4);
  const monetizationPenalty = Math.round(Math.max(0, 60 - input.monetization) * 0.3);
  const urgencyPenalty = Math.round(Math.max(0, 50 - input.audienceUrgency) * 0.2);
  const retentionPenalty = Math.round(Math.max(0, 60 - input.retentionPotential) * 0.25);
  const advertiserSafetyPenalty = Math.round(Math.max(0, 70 - input.advertiserSafety) * 0.4);

  const evergreenBonus = input.evergreen ? 8 : 0;
  const highIntentBonus = input.highIntent ? 6 : 0;
  const affiliateFitBonus = input.affiliateFit ? 5 : 0;
  const seriesPotentialBonus = input.seriesPotential ? 5 : 0;
  const internationalScalabilityBonus = input.internationalScalability ? 4 : 0;

  const raw =
    100 -
    competitionPenalty -
    monetizationPenalty -
    urgencyPenalty -
    retentionPenalty -
    advertiserSafetyPenalty +
    evergreenBonus +
    highIntentBonus +
    affiliateFitBonus +
    seriesPotentialBonus +
    internationalScalabilityBonus;

  const score = clamp(raw);
  const lab = label(score);

  let recommendation = '';
  switch (lab) {
    case 'Exceptional':
      recommendation = 'Commit a 90-day series. Build a content moat early.';
      break;
    case 'Strong':
      recommendation = 'Launch a 30-day pilot with consistent packaging.';
      break;
    case 'Promising':
      recommendation = 'Test 3 hero videos before doubling down.';
      break;
    case 'Risky':
      recommendation = 'Narrow the niche or pair with a stronger sub-topic before publishing.';
      break;
    default:
      recommendation = 'Avoid. Move to a niche with better monetization, retention, or advertiser safety.';
  }

  return {
    niche: input.niche,
    score,
    label: lab,
    breakdown: {
      competitionPenalty,
      monetizationPenalty,
      urgencyPenalty,
      retentionPenalty,
      advertiserSafetyPenalty,
      evergreenBonus,
      highIntentBonus,
      affiliateFitBonus,
      seriesPotentialBonus,
      internationalScalabilityBonus
    },
    recommendation
  };
}
