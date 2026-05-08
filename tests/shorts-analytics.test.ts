import { describe, expect, it } from 'vitest';
import { analyzeShorts } from '@/lib/shorts-analytics';

describe('shorts analytics', () => {
  it('flags strong performers for expansion', () => {
    const r = analyzeShorts({
      shortTitle: 'Index funds: myth vs fact',
      topicCluster: 'index funds basics',
      views: 50000,
      averageViewDurationSeconds: 26,
      durationSeconds: 30,
      likes: 3500,
      comments: 250,
      shares: 300,
      subscribersGained: 600,
      longFormClicks: 2500
    });
    expect(r.makeMoreLikeThis).toBe(true);
    expect(r.convertToLongForm).toBe(true);
    expect(r.summary).toMatch(/strong performer/);
  });

  it('recommends pausing weak clusters', () => {
    const r = analyzeShorts({
      shortTitle: 'Sector funds rant',
      topicCluster: 'sector funds rant',
      views: 1000,
      averageViewDurationSeconds: 5,
      durationSeconds: 30,
      likes: 5,
      comments: 0,
      shares: 0,
      subscribersGained: 0
    });
    expect(r.pauseTopicCluster).toBe(true);
    expect(r.makeMoreLikeThis).toBe(false);
  });

  it('always lists policy notes that exclude fake engagement', () => {
    const r = analyzeShorts({
      shortTitle: 'Test',
      views: 100,
      averageViewDurationSeconds: 15,
      durationSeconds: 30,
      likes: 5,
      comments: 0,
      shares: 0,
      subscribersGained: 0
    });
    expect(r.policyNotes.join(' ').toLowerCase()).toContain('no buying subscribers');
    expect(r.policyNotes.join(' ').toLowerCase()).toContain('no bot');
  });
});
