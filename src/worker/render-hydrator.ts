// Hydrates a render-only request directly from the shared asset volume.

import fs from 'node:fs/promises';
import path from 'node:path';
import type { RenderJobRequest } from '@/lib/queue-producer';
import { planVideoAssembly } from '@/lib/video-assembler';
import { safeFilename } from '@/lib/security';
import type { AssemblyJob, AssetInput, WorkerConfig } from './types';

export interface RenderHydratorDeps {
  config: WorkerConfig;
  fsImpl?: {
    readdir(dir: string): Promise<string[]>;
    stat(path: string): Promise<{ size: number; isFile(): boolean }>;
  };
}

export type RenderHydrationResult =
  | { ok: true; job: AssemblyJob }
  | { ok: false; reason: 'no_inputs' | 'no_visual_inputs' | 'inputs_dir_unreadable'; detail: string };

const DEFAULT_FS = {
  readdir: (dir: string) => fs.readdir(dir),
  stat: async (p: string) => {
    const s = await fs.stat(p);
    return { size: s.size, isFile: () => s.isFile() };
  }
};

function inferRole(filename: string): AssetInput['role'] {
  const lower = filename.toLowerCase();
  if (/\.(mp4|mov|webm|mkv)$/.test(lower)) return 'broll';
  if (/\.(jpg|jpeg|png|webp)$/.test(lower)) return 'thumbnail_still';
  if (/\.(srt|vtt)$/.test(lower)) return 'caption_track';
  if (/\.(mp3|wav|m4a|aac|flac)$/.test(lower)) {
    return /(music|score|bed)/.test(lower) ? 'music' : 'narration';
  }
  return 'broll';
}

export async function hydrateRenderRequest(
  request: RenderJobRequest,
  deps: RenderHydratorDeps
): Promise<RenderHydrationResult> {
  const root = deps.config.inputsAllowlist[0] ?? '/var/lib/faceless-studio/inputs';
  const projectDir = path.join(root, request.userId, request.projectId);
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
    const absolutePath = path.join(projectDir, name);
    try {
      const stat = await fsImpl.stat(absolutePath);
      if (!stat.isFile() || stat.size <= 0) continue;
      inputs.push({ path: absolutePath, role: inferRole(name), license: 'operator-attested' });
    } catch {
      // Ignore files that disappear between directory scan and stat.
    }
  }

  if (inputs.length === 0) {
    return { ok: false, reason: 'no_inputs', detail: `no uploaded assets in ${projectDir}` };
  }
  if (!inputs.some((input) => input.role === 'broll' || input.role === 'thumbnail_still')) {
    return {
      ok: false,
      reason: 'no_visual_inputs',
      detail: 'Upload at least one video or still image before rendering.'
    };
  }

  const plan = planVideoAssembly({
    title: request.title,
    durationMinutes: request.durationMinutes,
    shortsCount: request.shortsCount,
    storyboardScenes: request.storyboardScenes,
    style: request.style
  });

  return {
    ok: true,
    job: {
      id: request.id,
      scope: {
        userId: request.userId,
        projectId: request.projectId,
        baseFilename: safeFilename(request.title, 'video-package')
      },
      plan,
      inputs,
      enqueuedAt: request.enqueuedAt
    }
  };
}
