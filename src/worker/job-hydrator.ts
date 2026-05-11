// Hydrates an UploadJobRequest popped from the queue into a full AssemblyJob
// the runner can consume.
//
// Steps:
// 1. Look up the VideoProject by ID and confirm ownership.
// 2. Generate the AssemblyPlan from the project's title and storyboard.
// 3. Discover input assets on disk under WORKER_INPUT_ALLOWLIST/<userId>/<projectId>/.
// 4. Infer each asset's logical role from its file extension.
//
// The worker calls this once per job, then passes the resulting AssemblyJob
// to runAssemblyJob.

import fs from 'node:fs/promises';
import path from 'node:path';
import type { UploadJobRequest } from '@/lib/queue-producer';
import { planVideoAssembly } from '@/lib/video-assembler';
import { safeFilename } from '@/lib/security';
import type { AssemblyJob, AssetInput, WorkerConfig } from './types';

export interface HydratorDeps {
  prisma: {
    videoProject: {
      findUnique(args: { where: { id: string } }): Promise<{
        id: string;
        userId: string;
        title: string;
        storyboardJson: unknown;
      } | null>;
    };
  };
  config: WorkerConfig;
  fsImpl?: {
    readdir(dir: string): Promise<string[]>;
    stat(path: string): Promise<{ size: number; isFile(): boolean }>;
  };
}

export type HydrationFailure =
  | { ok: false; reason: 'project_not_found'; videoProjectId: string }
  | { ok: false; reason: 'no_inputs'; lookedAt: string }
  | { ok: false; reason: 'inputs_dir_unreadable'; detail: string };

export type HydrationResult = { ok: true; job: AssemblyJob } | HydrationFailure;

const DEFAULT_FS = {
  readdir: (dir: string) => fs.readdir(dir),
  stat: async (p: string) => {
    const s = await fs.stat(p);
    return { size: s.size, isFile: () => s.isFile() };
  }
};

function inferRole(filename: string): AssetInput['role'] {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  switch (ext) {
    case 'wav':
    case 'mp3':
    case 'm4a':
    case 'aac':
    case 'flac':
      return 'narration';
    case 'mp4':
    case 'mov':
    case 'webm':
    case 'mkv':
      return 'broll';
    case 'srt':
    case 'vtt':
      return 'caption_track';
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'webp':
      return 'thumbnail_still';
    default:
      return 'broll';
  }
}

function inputsRootFor(config: WorkerConfig): string {
  return config.inputsAllowlist[0] ?? '/var/lib/faceless-studio/inputs';
}

function storyboardSceneCount(json: unknown): number {
  if (json && typeof json === 'object') {
    const total = (json as { totalScenes?: unknown }).totalScenes;
    if (typeof total === 'number' && total > 0) return total;
    const scenes = (json as { scenes?: unknown[] }).scenes;
    if (Array.isArray(scenes) && scenes.length > 0) return scenes.length;
  }
  return 8;
}

export async function hydrateUploadRequest(
  request: UploadJobRequest,
  deps: HydratorDeps
): Promise<HydrationResult> {
  const project = await deps.prisma.videoProject.findUnique({ where: { id: request.videoProjectId } });
  if (!project) {
    return { ok: false, reason: 'project_not_found', videoProjectId: request.videoProjectId };
  }

  const root = inputsRootFor(deps.config);
  const projectDir = path.join(root, project.userId, project.id);
  const fsImpl = deps.fsImpl ?? DEFAULT_FS;

  let entries: string[];
  try {
    entries = await fsImpl.readdir(projectDir);
  } catch (err) {
    return {
      ok: false,
      reason: 'inputs_dir_unreadable',
      detail: err instanceof Error ? err.message : `cannot read ${projectDir}`
    };
  }

  const inputs: AssetInput[] = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const abs = path.join(projectDir, name);
    let stat;
    try {
      stat = await fsImpl.stat(abs);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size === 0) continue;
    inputs.push({ path: abs, role: inferRole(name), license: 'operator-attested' });
  }

  if (inputs.length === 0) {
    return { ok: false, reason: 'no_inputs', lookedAt: projectDir };
  }

  const scenesTarget = storyboardSceneCount(project.storyboardJson);
  const plan = planVideoAssembly({
    title: project.title,
    durationMinutes: 8,
    shortsCount: 3,
    storyboardScenes: scenesTarget,
    style: 'cinematic-clean'
  });

  const job: AssemblyJob = {
    id: request.id,
    scope: {
      userId: project.userId,
      projectId: project.id,
      baseFilename: safeFilename(project.title, 'video-package')
    },
    plan,
    inputs,
    enqueuedAt: request.enqueuedAt
  };

  return { ok: true, job };
}
