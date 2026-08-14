// Hydrates an UploadJobRequest popped from the queue into a full AssemblyJob.

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
        metadataJson: unknown;
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
  const lower = filename.toLowerCase();
  if (/\.(srt|vtt)$/.test(lower)) return 'caption_track';
  if (/\.(mp4|mov|webm|mkv)$/.test(lower)) return 'broll';
  if (/\.(jpg|jpeg|png|webp)$/.test(lower)) return 'thumbnail_still';
  if (/\.(wav|mp3|m4a|aac|flac)$/.test(lower)) return /(music|score|bed)/.test(lower) ? 'music' : 'narration';
  return 'broll';
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

function productionSettings(json: unknown): { durationMinutes: number; shortsCount: number } {
  if (!json || typeof json !== 'object') return { durationMinutes: 8, shortsCount: 3 };
  const settings = (json as { production?: { durationMinutes?: unknown; shortsCount?: unknown } }).production;
  const duration = Number(settings?.durationMinutes ?? 8);
  const shorts = Number(settings?.shortsCount ?? 3);
  return {
    durationMinutes: Number.isFinite(duration) ? Math.max(1, Math.min(60, duration)) : 8,
    shortsCount: Number.isFinite(shorts) ? Math.max(0, Math.min(10, Math.round(shorts))) : 3
  };
}

export async function hydrateUploadRequest(request: UploadJobRequest, deps: HydratorDeps): Promise<HydrationResult> {
  const project = await deps.prisma.videoProject.findUnique({ where: { id: request.videoProjectId } });
  if (!project) return { ok: false, reason: 'project_not_found', videoProjectId: request.videoProjectId };

  const root = inputsRootFor(deps.config);
  const projectDir = path.join(root, project.userId, project.id);
  const fsImpl = deps.fsImpl ?? DEFAULT_FS;
  let entries: string[];
  try {
    entries = await fsImpl.readdir(projectDir);
  } catch (err) {
    return { ok: false, reason: 'inputs_dir_unreadable', detail: err instanceof Error ? err.message : `cannot read ${projectDir}` };
  }

  const inputs: AssetInput[] = [];
  for (const name of entries) {
    if (name.startsWith('.')) continue;
    const abs = path.join(projectDir, name);
    try {
      const stat = await fsImpl.stat(abs);
      if (!stat.isFile() || stat.size === 0) continue;
      inputs.push({ path: abs, role: inferRole(name), license: name.startsWith('generated-') ? 'original-generated-asset' : 'operator-attested' });
    } catch {
      // Ignore files that disappear between directory scan and stat.
    }
  }
  if (inputs.length === 0) return { ok: false, reason: 'no_inputs', lookedAt: projectDir };

  const settings = productionSettings(project.metadataJson);
  const plan = planVideoAssembly({
    title: project.title,
    durationMinutes: settings.durationMinutes,
    shortsCount: settings.shortsCount,
    storyboardScenes: storyboardSceneCount(project.storyboardJson),
    style: 'cinematic-clean'
  });

  return {
    ok: true,
    job: {
      id: request.id,
      scope: { userId: project.userId, projectId: project.id, baseFilename: safeFilename(project.title, 'video-package') },
      plan,
      inputs,
      enqueuedAt: request.enqueuedAt
    }
  };
}
