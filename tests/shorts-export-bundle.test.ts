import { describe, expect, it } from 'vitest';
import { buildShortsBundle, buildCombinedBundle } from '@/lib/export-package';

describe('shorts export bundle', () => {
  it('produces 15s, 30s, and 60s scripts plus markdown and json', () => {
    const bundle = buildShortsBundle({
      title: 'Index funds explained',
      niche: 'personal finance',
      audience: 'finance beginners',
      longFormTitle: 'Index funds explained for first-time investors',
      longFormScript: 'Index funds spread risk. Expense ratios compound. Total market funds win the long run. Active funds rarely beat their index.',
      hasAffiliateLinks: true,
      topicFlags: ['financial']
    });
    expect(bundle.files).toHaveLength(2);
    const md = bundle.files.find((f) => f.type === 'markdown');
    const json = bundle.files.find((f) => f.type === 'json');
    expect(md?.content).toMatch(/15s/);
    expect(md?.content).toMatch(/30s/);
    expect(md?.content).toMatch(/60s/);
    const parsed = JSON.parse(json!.content);
    expect(parsed.variants).toHaveLength(3);
    expect(parsed.calendar).toBeDefined();
    expect(parsed.funnel).toBeDefined();
  });

  it('combined bundle includes both long-form and shorts files', () => {
    const bundle = buildCombinedBundle({
      title: 'Index funds explained',
      niche: 'personal finance',
      audience: 'finance beginners',
      scriptText: 'Index funds spread risk across thousands of companies. Expense ratios compound silently.',
      formats: ['markdown', 'json'],
      shorts: {
        title: 'Index funds explained',
        niche: 'personal finance',
        audience: 'finance beginners',
        longFormTitle: 'Index funds explained',
        longFormScript: 'Index funds spread risk. Expense ratios compound.',
        hasAffiliateLinks: true,
        topicFlags: ['financial'],
        formats: ['markdown', 'json'],
        variantSeconds: [15, 30, 60],
        channelStage: 'new',
        productionCapacity: 'medium',
        weeks: 4
      }
    });
    expect(bundle.files.length).toBeGreaterThanOrEqual(4);
    const filenames = bundle.files.map((f) => f.filename);
    expect(filenames.some((n) => n.includes('shorts-package') || n.includes('shorts'))).toBe(true);
  });
});
