// Metadata engine. Returns YouTube-ready metadata package.

import type { MetadataInput } from './validators';
import { runDisclaimerEngine } from './disclaimer-engine';
import { generateThumbnailsAndTitles } from './thumbnail-engine';

export interface MetadataPackage {
  title: string;
  titleOptions: { index: number; text: string }[];
  shortDescription: string;
  description: string;
  chapters: { timestamp: string; label: string }[];
  tags: string[];
  hashtags: string[];
  pinnedComment: string;
  communityPost: string;
  endScreenCta: string;
  playlistRecommendation: string;
  categoryRecommendation: string;
  language: string;
  regionTargetingNote: string;
  disclosure: string;
  disclaimer: string;
}

function uniq(items: string[]): string[] {
  return Array.from(new Set(items.map((s) => s.trim()).filter(Boolean)));
}

function tagsFor(input: MetadataInput): string[] {
  const base = uniq([
    input.niche,
    `${input.niche} explained`,
    `${input.niche} for beginners`,
    `${input.niche} guide`,
    input.audience,
    `${input.audience} ${input.niche}`,
    ...input.keywords
  ]);
  return base.slice(0, 25);
}

function hashtagsFor(input: MetadataInput): string[] {
  const tags = uniq([
    `#${input.niche.replace(/\s+/g, '')}`,
    `#${input.audience.replace(/\s+/g, '')}`,
    '#explainer'
  ]).slice(0, 3);
  return tags;
}

function categoryFor(niche: string): string {
  const n = niche.toLowerCase();
  if (/finance|money|business/.test(n)) return '25 News & Politics or 27 Education';
  if (/health|fitness/.test(n)) return '26 Howto & Style or 27 Education';
  if (/game|gaming/.test(n)) return '20 Gaming';
  if (/tech|software|ai/.test(n)) return '28 Science & Technology';
  return '27 Education';
}

function chaptersFor(): { timestamp: string; label: string }[] {
  return [
    { timestamp: '00:00', label: 'Introduction' },
    { timestamp: '00:30', label: 'Setup' },
    { timestamp: '02:00', label: 'Framework' },
    { timestamp: '05:00', label: 'Evidence' },
    { timestamp: '07:30', label: 'Action step' },
    { timestamp: '08:30', label: 'Recap and CTA' }
  ];
}

export function generateMetadata(input: MetadataInput): MetadataPackage {
  const tt = generateThumbnailsAndTitles(input.title, input.audience);
  const titleOptions = tt.titles.slice(0, 10).map(({ index, text }) => ({ index, text }));
  const compliance = runDisclaimerEngine({
    flags: {
      hasAffiliateLinks: input.hasAffiliateLinks,
      hasSponsor: input.hasSponsor,
      aiGeneratedContent: true,
      thirdPartyFootage: false
    },
    topicFlags: input.topicFlags
  });
  const disclaimerText = compliance.required.map((d) => d.text).join(' ');
  const disclosureLines: string[] = [];
  if (input.hasAffiliateLinks) disclosureLines.push('Some links may be affiliate links — see pinned comment for details.');
  if (input.hasSponsor) disclosureLines.push('This video includes a paid sponsorship — disclosed in-video and in the description.');
  disclosureLines.push('Some production elements may be assisted by AI tools, then reviewed and edited before publishing.');

  const description = [
    `${input.title}`,
    '',
    `For ${input.audience}: a calm, sourced walkthrough of ${input.niche}.`,
    '',
    'Chapters:',
    ...chaptersFor().map((c) => `${c.timestamp} ${c.label}`),
    '',
    'Disclosures:',
    ...disclosureLines,
    '',
    'Disclaimers:',
    disclaimerText
  ].join('\n');

  const pinnedComment = [
    'Quick context for new viewers:',
    `- We focused on ${input.niche} for ${input.audience}.`,
    input.hasAffiliateLinks ? '- Some description links are affiliate links and the channel may earn a commission at no extra cost to you.' : '',
    input.hasSponsor ? '- This video contains a paid sponsorship.' : '',
    '- Sources we used are listed in the description.',
    '- This is educational content, not personal advice.'
  ].filter(Boolean).join('\n');

  const communityPost = `New video on ${input.niche} for ${input.audience}. Calm, sourced, no clickbait. Comment what you want covered next.`;

  return {
    title: input.title,
    titleOptions,
    shortDescription: `${input.title} — for ${input.audience}.`,
    description,
    chapters: chaptersFor(),
    tags: tagsFor(input),
    hashtags: hashtagsFor(input),
    pinnedComment,
    communityPost,
    endScreenCta: 'Subscribe for the next episode in this series and watch the recommended deep dive.',
    playlistRecommendation: `${input.niche} essentials`,
    categoryRecommendation: categoryFor(input.niche),
    language: 'en',
    regionTargetingNote: 'Primary US, secondary international English-speaking audience',
    disclosure: disclosureLines.join(' '),
    disclaimer: disclaimerText
  };
}
