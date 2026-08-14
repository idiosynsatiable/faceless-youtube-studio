import { describe, expect, it } from 'vitest';
import { planAutonomousShortUploads } from '@/worker/shorts-publisher';

const outputs = [
  { profile: 'YouTube long-form 16:9', absolutePath: '/out/master.mp4' },
  { profile: 'YouTube Shorts 9:16', absolutePath: '/out/short-1.mp4' },
  { profile: 'YouTube Shorts 9:16', absolutePath: '/out/short-2.mp4' }
];

describe('autonomous Shorts publishing plan', () => {
  it('schedules public Shorts as private uploads with spaced publishAt values', () => {
    const plan = planAutonomousShortUploads({
      outputs,
      baseTitle: 'A useful explainer',
      baseDescription: 'Context and sources.',
      tags: ['technology'],
      parentPrivacyStatus: 'public',
      maxShorts: 2,
      spacingHours: 6,
      now: new Date('2026-08-14T12:00:00Z')
    });
    expect(plan).toHaveLength(2);
    expect(plan[0]).toMatchObject({
      filePath: '/out/short-1.mp4',
      privacyStatus: 'private',
      scheduledAt: '2026-08-14T18:00:00.000Z'
    });
    expect(plan[1].scheduledAt).toBe('2026-08-15T00:00:00.000Z');
    expect(plan[0].title).toContain('#Shorts');
    expect(plan[0].tags).toContain('Shorts');
  });

  it('keeps private parent runs private without a publishAt', () => {
    const plan = planAutonomousShortUploads({
      outputs,
      baseTitle: 'Private validation run',
      baseDescription: '',
      tags: [],
      parentPrivacyStatus: 'private',
      maxShorts: 1,
      spacingHours: 6
    });
    expect(plan).toHaveLength(1);
    expect(plan[0].privacyStatus).toBe('private');
    expect(plan[0].scheduledAt).toBeUndefined();
  });
});
