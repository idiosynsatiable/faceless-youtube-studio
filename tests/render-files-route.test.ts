import { describe, expect, it } from 'vitest';
import { completedOutputPath } from '@/lib/render-artifacts';
import type { JobOutcome } from '@/worker/types';

const root = '/var/lib/faceless-studio/exports';

function completedOutcome(): JobOutcome {
  return {
    jobId: 'render-12345678',
    status: 'completed',
    outputs: [
      {
        profile: 'YouTube long-form 16:9',
        absolutePath: `${root}/workspace-1/project-1/my-video-master.mp4`,
        width: 1920,
        height: 1080,
        durationSeconds: 120
      }
    ],
    log: []
  };
}

describe('completedOutputPath', () => {
  it('returns the path only when it is a recorded completed export', () => {
    expect(completedOutputPath(
      completedOutcome(),
      root,
      'workspace-1/project-1/my-video-master.mp4'
    )).toBe(`${root}/workspace-1/project-1/my-video-master.mp4`);
  });

  it('rejects a valid in-root path that is not part of the completed job output', () => {
    expect(completedOutputPath(
      completedOutcome(),
      root,
      'workspace-1/project-1/another-video.mp4'
    )).toBeNull();
  });

  it('rejects traversal, worker scratch files, and non-completed outcomes', () => {
    const outcome = completedOutcome();
    expect(completedOutputPath(outcome, root, '../inputs/secret.mp4')).toBeNull();
    expect(completedOutputPath({
      ...outcome,
      outputs: [{
        ...outcome.outputs[0],
        absolutePath: `${root}/_work/workspace-1/project-1/render-12345678/temp.mp4`
      }]
    }, root, '_work/workspace-1/project-1/render-12345678/temp.mp4')).toBeNull();
    expect(completedOutputPath({ ...outcome, status: 'rejected' }, root, 'workspace-1/project-1/my-video-master.mp4')).toBeNull();
  });
});
