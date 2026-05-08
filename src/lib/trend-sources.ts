// Trend source registry. Every source is a documented, lawful input path.
// Source code MUST NOT scrape platforms, bypass terms of service, or use
// hidden automation. Every source is either an official API stub, a
// user-supplied import, or a manual entry path.

export interface TrendSourceMeta {
  id: string;
  label: string;
  legalNote: string;
  requiresUserInput: boolean;
  officialApi: boolean;
}

export const TREND_SOURCES: TrendSourceMeta[] = [
  {
    id: 'youtube_suggestions',
    label: 'YouTube search suggestions',
    legalNote: 'Use official YouTube Data API or user-pasted suggestion lists. Do not scrape suggest endpoints.',
    requiresUserInput: true,
    officialApi: true
  },
  {
    id: 'google_trends',
    label: 'Google Trends export',
    legalNote: 'Manual CSV export from trends.google.com under Google ToS.',
    requiresUserInput: true,
    officialApi: false
  },
  {
    id: 'reddit',
    label: 'Reddit trend review',
    legalNote: 'Use Reddit official API with attribution; respect rate limits and ToS.',
    requiresUserInput: true,
    officialApi: true
  },
  {
    id: 'tiktok',
    label: 'TikTok / Shorts trend note',
    legalNote: 'Manually curated trend notes only. No scraping.',
    requiresUserInput: true,
    officialApi: false
  },
  {
    id: 'x',
    label: 'X / Twitter topic note',
    legalNote: 'Manually curated topic notes or official X API access.',
    requiresUserInput: true,
    officialApi: false
  },
  {
    id: 'news',
    label: 'News topic import',
    legalNote: 'Use licensed news APIs or RSS feeds permitted by publishers.',
    requiresUserInput: true,
    officialApi: false
  },
  {
    id: 'csv_import',
    label: 'CSV import',
    legalNote: 'Creator-uploaded CSV file.',
    requiresUserInput: true,
    officialApi: false
  },
  {
    id: 'manual',
    label: 'Manual creator input',
    legalNote: 'Topics typed by the creator directly.',
    requiresUserInput: true,
    officialApi: false
  }
];

export function getSource(id: string): TrendSourceMeta | undefined {
  return TREND_SOURCES.find((s) => s.id === id);
}
