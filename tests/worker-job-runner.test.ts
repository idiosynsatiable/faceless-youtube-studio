import { describe, expect, it, vi } from 'vitest';
import { runAssemblyJob } from '@/worker/job-runner';
import { planVideoAssembly } from '@/lib/video-assembler';
import type { AssemblyJob, WorkerConfig } from '@/worker/types';
import type { SpawnFn } from '@/worker/spawn';

const config: WorkerConfig = {
  inputsAllowlist: ['/srv/inputs'],
  outputsRoot: '/srv/exports',
  ffmpegBinary: '/usr/bin/ffmpeg',
  jobTimeoutMs: 60_000,
  concurrency: 1
};

const plan = planVideoAssembly({
  title: 'Index funds explained',
  durationMinutes: 8,
  shortsCount: 2,
  storyboardScenes: 6,
  style: 'cinematic-clean'
});

function buildJob(overrides: Partial<AssemblyJob> = {}): AssemblyJob {
  return {
    id: 'job-1',
    scope: { userId: 'user1', projectId: 'proj1', baseFilename: 'index-funds-explained' },
    plan,
    inputs: [
      { path: '/srv/inputs/user1/proj1/scene1.mp4', role: 'broll', license: 'creator-owned' },
      { path: '/srv/inputs/user1/proj1/narration.wav', role: 'narration', license: 'creator-owned' }
    ],
    enqueuedAt: new Date().toISOString(),
    ...overrides
  };
}

function noopFs() {
  return {
    mkdir: vi.fn(async () => {}),
    writeFile: vi.fn(async () => {})
  };
}

describe('worker job runner', () => {
  it('rejects inputs outside the allowlist before spawning anything', async () => {
    const job = buildJob({
      inputs: [{ path: '/etc/passwd', role: 'broll', license: 'creator-owned' }]
    });
    const spawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }));
    const fsImpl = noopFs();
    const outcome = await runAssemblyJob(job, { config, spawn: spawnFn, fsImpl });
    expect(outcome.status).toBe('rejected');
    expect(outcome.errorCategory).toBe('invalid_input_path');
    expect(spawnFn).not.toHaveBeenCalled();
  });

  it('runs every stage with a successful spawn and reports outputs per export profile', async () => {
    const job = buildJob();
    const spawnFn: SpawnFn = vi.fn(async () => ({ code: 0, stdout: '', stderr: '' }));
    const fsImpl = noopFs();
    const outcome = await runAssemblyJob(job, { config, spawn: spawnFn, fsImpl });
    expect(outcome.status).toBe('completed');
    // Stages: 2 normalize + 1 concat + 1 overlay + N export profiles.
    const expectedSpawnCount = 2 + 1 + 1 + plan.exportProfiles.length;
    expect(spawnFn).toHaveBeenCalledTimes(expectedSpawnCount);
    expect(outcome.outputs.length).toBe(plan.exportProfiles.length);
  });

  it('propagates a non-zero ffmpeg exit code as a failed outcome', async () => {
    const job = buildJob();
    let calls = 0;
    const spawnFn: SpawnFn = vi.fn(async () => {
      calls += 1;
      if (calls === 1) return { code: 0, stdout: '', stderr: '' };
      return { code: 137, stdout: '', stderr: 'SIGKILL on stage 2' };
    });
    const fsImpl = noopFs();
    const outcome = await runAssemblyJob(job, { config, spawn: spawnFn, fsImpl });
    expect(outcome.status).toBe('failed');
    expect(outcome.errorCategory).toBe('ffmpeg_failed');
    expect(outcome.errorMessage).toContain('exited with code 137');
  });

  it('all spawned arguments are arrays of plain strings (no shell metachars)', async () => {
    const job = buildJob();
    const captured: string[][] = [];
    const spawnFn: SpawnFn = vi.fn(async (cmd, args) => {
      expect(cmd).toBe('/usr/bin/ffmpeg');
      captured.push(args);
      return { code: 0, stdout: '', stderr: '' };
    });
    const fsImpl = noopFs();
    await runAssemblyJob(job, { config, spawn: spawnFn, fsImpl });
    const SHELL = [';', '|', '&', '`', '$', '<', '>', '"'];
    for (const args of captured) {
      for (const a of args) {
        for (const ch of SHELL) {
          expect(a.includes(ch)).toBe(false);
        }
      }
    }
  });
});
