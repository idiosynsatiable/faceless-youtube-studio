// Disclaimer engine. Returns the standard disclaimer texts triggered by content flags.

export type DisclaimerKey =
  | 'general'
  | 'financial'
  | 'affiliate'
  | 'sponsorship'
  | 'ai_content'
  | 'medical'
  | 'legal'
  | 'investment_risk'
  | 'entertainment_opinion'
  | 'copyright_caution'
  | 'platform_policy'
  | 'data_accuracy'
  | 'no_guaranteed_results';

export const DISCLAIMERS: Record<DisclaimerKey, string> = {
  general: 'This video is for educational and informational purposes only.',
  financial:
    'This content is not financial advice. Always do your own research and consider speaking with a qualified professional before making financial decisions.',
  affiliate:
    'Some links may be affiliate links, which means the channel may earn a commission at no extra cost to the viewer.',
  sponsorship: 'This video contains a paid sponsorship that has been clearly disclosed in the video and description.',
  ai_content:
    'Some production elements may be assisted by AI tools, then reviewed and edited before publishing.',
  medical:
    'This content is not medical advice. Consult a qualified healthcare professional for personal medical guidance.',
  legal: 'This content is not legal advice. Consult a qualified attorney for legal questions.',
  investment_risk:
    'All investments involve risk, including the possible loss of principal. Past performance does not guarantee future results.',
  entertainment_opinion:
    'Views shared in this video reflect the creator and are intended as commentary and analysis.',
  copyright_caution:
    'Third-party assets used in this video are licensed or used under documented permission. Fair-use claims are not guaranteed and have been reviewed.',
  platform_policy: 'This video follows YouTube community guidelines and advertiser-friendly content rules.',
  data_accuracy:
    'Numbers and references shown in this video were checked at time of recording. Verify against primary sources before relying on them.',
  no_guaranteed_results:
    'Results are not guaranteed. Outcomes depend on individual effort, market conditions, timing, and other factors.'
};

export interface DisclaimerEngineInput {
  flags: {
    hasAffiliateLinks: boolean;
    hasSponsor: boolean;
    aiGeneratedContent: boolean;
    thirdPartyFootage: boolean;
  };
  topicFlags: string[];
}

export interface DisclaimerEngineOutput {
  required: { key: DisclaimerKey; text: string }[];
  rationale: { key: DisclaimerKey; reason: string }[];
}

export function runDisclaimerEngine(input: DisclaimerEngineInput): DisclaimerEngineOutput {
  const set = new Set<DisclaimerKey>();
  const rationale: { key: DisclaimerKey; reason: string }[] = [];

  set.add('general');
  rationale.push({ key: 'general', reason: 'Educational content always requires a general disclaimer' });

  set.add('no_guaranteed_results');
  rationale.push({ key: 'no_guaranteed_results', reason: 'Avoid implying guaranteed outcomes for the viewer' });

  set.add('data_accuracy');
  rationale.push({ key: 'data_accuracy', reason: 'Statistics may change after recording' });

  if (input.topicFlags.includes('financial')) {
    set.add('financial');
    rationale.push({ key: 'financial', reason: 'Topic touches money, investing, taxes, side hustles, or income' });
    set.add('investment_risk');
    rationale.push({ key: 'investment_risk', reason: 'Investment topics require risk disclosure' });
  }
  if (input.topicFlags.includes('medical')) {
    set.add('medical');
    rationale.push({ key: 'medical', reason: 'Topic touches medical, health, or mental health' });
  }
  if (input.topicFlags.includes('legal')) {
    set.add('legal');
    rationale.push({ key: 'legal', reason: 'Topic touches legal information' });
  }
  if (input.flags.hasAffiliateLinks) {
    set.add('affiliate');
    rationale.push({ key: 'affiliate', reason: 'Description includes affiliate links' });
  }
  if (input.flags.hasSponsor) {
    set.add('sponsorship');
    rationale.push({ key: 'sponsorship', reason: 'Video includes paid sponsorship' });
  }
  if (input.flags.aiGeneratedContent) {
    set.add('ai_content');
    rationale.push({ key: 'ai_content', reason: 'AI tools assist production' });
  }
  if (input.flags.thirdPartyFootage) {
    set.add('copyright_caution');
    rationale.push({ key: 'copyright_caution', reason: 'Third-party footage is included' });
  }
  if (input.topicFlags.includes('opinion')) {
    set.add('entertainment_opinion');
    rationale.push({ key: 'entertainment_opinion', reason: 'Opinion or commentary topic' });
  }
  set.add('platform_policy');
  rationale.push({ key: 'platform_policy', reason: 'Always reaffirm platform policy alignment' });

  const required = Array.from(set).map((k) => ({ key: k, text: DISCLAIMERS[k] }));
  return { required, rationale };
}
