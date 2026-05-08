// Thumbnail and title engine. Generates honest, non-clickbait packaging.

export interface ThumbnailConcept {
  index: number;
  description: string;
  keyword: string;
  composition: string;
  color: string;
  textOverlay: string;
}

export interface TitleOption {
  index: number;
  text: string;
  curiosityGap: string;
  searchIntentMatch: string;
  audienceFit: string;
  riskRating: 'low' | 'medium';
  noClickbaitNote: string;
}

export interface ThumbnailEngineOutput {
  titles: TitleOption[];
  thumbnails: ThumbnailConcept[];
  noClickbaitCheck: { passed: boolean; failures: string[] };
}

const TITLE_TEMPLATES: ((subject: string) => string)[] = [
  (s) => `${s} explained in 8 minutes`,
  (s) => `${s}: the framework most videos skip`,
  (s) => `${s}: what the data really says`,
  (s) => `Beginners' guide to ${s}`,
  (s) => `${s}: 3 case studies, one playbook`,
  (s) => `${s}: myth vs fact (settled)`,
  (s) => `${s}: the mistake almost everyone makes`,
  (s) => `${s}: a calm step-by-step walkthrough`,
  (s) => `${s}: the underrated approach that works`,
  (s) => `${s}: the simplest version of the story`
];

const RISKY_PHRASES = [
  'guaranteed',
  'free money',
  'overnight',
  'shocking truth',
  'banned',
  'they don\'t want you to know',
  'doctors hate this',
  'one weird trick',
  'destroyed'
];

function ensureNoClickbait(title: string): string {
  let t = title;
  RISKY_PHRASES.forEach((p) => {
    const re = new RegExp(p, 'gi');
    t = t.replace(re, '');
  });
  return t.replace(/\s+/g, ' ').trim();
}

export function generateThumbnailsAndTitles(subject: string, audience: string): ThumbnailEngineOutput {
  const titles = TITLE_TEMPLATES.map((tpl, i) => {
    const raw = tpl(subject);
    const safe = ensureNoClickbait(raw);
    const final = safe.length > 0 ? safe : `${subject}: a clear walkthrough`;
    return {
      index: i + 1,
      text: final,
      curiosityGap: `Promise the unexpected angle about ${subject} without exaggeration`,
      searchIntentMatch: i % 2 === 0 ? 'informational' : 'commercial',
      audienceFit: audience,
      riskRating: 'low' as const,
      noClickbaitNote: 'Title must match the actual content delivered in the video'
    };
  });

  const thumbnails: ThumbnailConcept[] = [
    {
      index: 1,
      description: 'Single bold subject silhouette with one strong on-screen number',
      keyword: subject,
      composition: 'rule-of-thirds, subject left, number right',
      color: 'editorial neutral with one accent color',
      textOverlay: `${subject.slice(0, 22)}`
    },
    {
      index: 2,
      description: 'Side-by-side comparison frame with vs label',
      keyword: subject,
      composition: 'split frame 50/50',
      color: 'cool/warm contrast',
      textOverlay: 'vs.'
    },
    {
      index: 3,
      description: 'Data visualization preview - one bar chart or line chart',
      keyword: subject,
      composition: 'centered chart, clear axis label',
      color: 'one accent on neutral background',
      textOverlay: `${subject.slice(0, 18)}`
    },
    {
      index: 4,
      description: 'Mistake-to-avoid frame with bold strikethrough',
      keyword: subject,
      composition: 'subject offset right, big crossed-out word left',
      color: 'red strike on neutral',
      textOverlay: 'Avoid this'
    },
    {
      index: 5,
      description: 'Editorial documentary still with quiet typography',
      keyword: subject,
      composition: 'clean wide shot of subject, generous negative space',
      color: 'neutral, low saturation',
      textOverlay: `${subject.slice(0, 18)}`
    }
  ];

  const failures: string[] = [];
  titles.forEach((t) => {
    if (RISKY_PHRASES.some((p) => t.text.toLowerCase().includes(p))) {
      failures.push(`Risky phrase remained in title: ${t.text}`);
    }
  });
  return {
    titles,
    thumbnails,
    noClickbaitCheck: { passed: failures.length === 0, failures }
  };
}
