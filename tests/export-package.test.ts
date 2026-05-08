import { describe, expect, it } from 'vitest';
import { buildExportBundle } from '@/lib/export-package';

describe('export package', () => {
  it('returns Markdown and JSON files with safe filenames', () => {
    const bundle = buildExportBundle({
      title: 'Index funds explained for first-time investors!',
      niche: 'personal finance',
      audience: 'finance beginners',
      scriptText: 'Sample script text. Long enough to satisfy the validator.',
      formats: ['markdown', 'json']
    });
    expect(bundle.files).toHaveLength(2);
    const md = bundle.files.find((f) => f.type === 'markdown');
    const json = bundle.files.find((f) => f.type === 'json');
    expect(md?.filename.endsWith('.md')).toBe(true);
    expect(json?.filename.endsWith('.json')).toBe(true);
    expect(md?.filename).not.toMatch(/[^a-z0-9._-]/);
    expect(md?.content.startsWith('# Faceless YouTube Studio package')).toBe(true);
    expect(JSON.parse(json!.content)).toBeDefined();
  });
});
