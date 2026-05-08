import { describe, expect, it } from 'vitest';
import { generateStoryboard } from '@/lib/storyboard-engine';

describe('storyboard engine', () => {
  it('returns the requested number of scenes with timestamps and asset license requirements', () => {
    const storyboard = generateStoryboard({
      title: 'Index funds explained',
      scenesTarget: 6,
      scriptText:
        'Index funds spread risk across thousands of companies. Expense ratios compound silently. Total market funds win the long run. Active funds rarely beat their index over decades.'
    });
    expect(storyboard.totalScenes).toBe(6);
    expect(storyboard.scenes).toHaveLength(6);
    for (const scene of storyboard.scenes) {
      expect(scene.timestampStart).toMatch(/\d\d:\d\d/);
      expect(scene.timestampEnd).toMatch(/\d\d:\d\d/);
      expect(scene.assetLicenseRequirement.length).toBeGreaterThan(0);
    }
    expect(storyboard.assetSummary.length).toBeGreaterThan(0);
    expect(storyboard.licenseChecklist.length).toBeGreaterThan(0);
  });
});
