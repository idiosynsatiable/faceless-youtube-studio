import { describe, expect, it, vi } from 'vitest';
import { hydrateUploadRequest } from '@/worker/job-hydrator';
import type { UploadJobRequest } from '@/lib/queue-producer';
import type { WorkerConfig } from '@/worker/types';

const baseConfig: WorkerConfig = {
  inputsAllowlist: ['/srv/inputs'],
  outputsRoot: '/srv/exports',
  ffmpegBinary: '/usr/bin/ffmpeg',
  jobTimeoutMs: 60_000,
  concurrency: 1
};

const baseRequest: UploadJobRequest = {
  id: 'req-1',
  videoProjectId: 'proj-1',
  privacyStatus: 'private',
  enqueuedAt: new Date().toISOString(),
  authorization: 'user_confirmed'
};

type Project = { id: string; userId: string; title: string; storyboardJson: unknown; metadataJson: unknown };

function fakePrisma(project: Project | null) {
  return { videoProject: { findUnique: vi.fn(async () => project) } };
}

function project(overrides: Partial<Project> = {}): Project {
  return { id: 'proj-1', userId: 'user-1', title: 'Demo', storyboardJson: { totalScenes: 6 }, metadataJson: {}, ...overrides };
}

function fakeFs(entries: Record<string, { size: number; isFile: boolean }>) {
  return {
    readdir: vi.fn(async () => Object.keys(entries)),
    stat: vi.fn(async (p: string) => {
      const name = p.split('/').pop() ?? '';
      const e = entries[name];
      if (!e) throw new Error(`no such file ${p}`);
      return { size: e.size, isFile: () => e.isFile };
    })
  };
}

describe('worker job hydrator', () => {
  it('returns project_not_found when the project id does not exist', async () => {
    const result = await hydrateUploadRequest(baseRequest, { prisma: fakePrisma(null), config: baseConfig, fsImpl: fakeFs({}) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('project_not_found');
  });

  it('returns no_inputs when the project directory has no files', async () => {
    const result = await hydrateUploadRequest(baseRequest, { prisma: fakePrisma(project()), config: baseConfig, fsImpl: fakeFs({}) });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('no_inputs');
  });

  it('returns inputs_dir_unreadable when readdir throws', async () => {
    const result = await hydrateUploadRequest(baseRequest, {
      prisma: fakePrisma(project({ storyboardJson: null })),
      config: baseConfig,
      fsImpl: { readdir: vi.fn(async () => { throw new Error('EACCES'); }), stat: vi.fn() }
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe('inputs_dir_unreadable');
  });

  it('builds an AssemblyJob with role-inferred inputs and metadata-driven production settings', async () => {
    const result = await hydrateUploadRequest(baseRequest, {
      prisma: fakePrisma(project({
        title: 'Index funds explained!',
        metadataJson: { production: { durationMinutes: 9, shortsCount: 2 } }
      })),
      config: baseConfig,
      fsImpl: fakeFs({
        'narration.wav': { size: 1024, isFile: true },
        'generated-01.png': { size: 2048, isFile: true },
        'captions.srt': { size: 256, isFile: true },
        '.hidden': { size: 1, isFile: true }
      })
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.job.scope.userId).toBe('user-1');
    expect(result.job.scope.projectId).toBe('proj-1');
    expect(result.job.scope.baseFilename).toMatch(/^[a-z0-9._-]+$/);
    expect(result.job.inputs.map((i) => i.role).sort()).toEqual(['caption_track', 'narration', 'thumbnail_still']);
    expect(result.job.inputs.find((i) => i.path.endsWith('generated-01.png'))?.license).toBe('original-generated-asset');
    expect(result.job.plan.shortClips).toHaveLength(2);
    expect(result.job.plan.exportProfiles.length).toBeGreaterThan(0);
  });
});
