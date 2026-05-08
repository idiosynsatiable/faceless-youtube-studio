// Video assembly planner. Documents the FFmpeg pipeline architecture.
// IMPORTANT: This module never executes shell commands directly from user input.
// It produces a serialized, validated plan that a worker process can execute.

import type { VideoPlanInput } from './validators';
import { safeFilename } from './security';

export interface ExportProfile {
  name: string;
  width: number;
  height: number;
  aspect: string;
  bitrateKbps: number;
  fps: number;
  audioKbps: number;
}

export const EXPORT_PROFILES: ExportProfile[] = [
  { name: 'YouTube long-form 16:9', width: 1920, height: 1080, aspect: '16:9', bitrateKbps: 12000, fps: 30, audioKbps: 192 },
  { name: 'YouTube Shorts 9:16', width: 1080, height: 1920, aspect: '9:16', bitrateKbps: 8000, fps: 30, audioKbps: 192 },
  { name: 'TikTok / Reels 9:16', width: 1080, height: 1920, aspect: '9:16', bitrateKbps: 6000, fps: 30, audioKbps: 192 },
  { name: 'Square 1:1 preview', width: 1080, height: 1080, aspect: '1:1', bitrateKbps: 6000, fps: 30, audioKbps: 192 },
  { name: 'Thumbnail still', width: 1280, height: 720, aspect: '16:9', bitrateKbps: 0, fps: 0, audioKbps: 0 }
];

export interface AssemblyPlan {
  outputBaseFilename: string;
  timeline: { sceneIndex: number; durationSeconds: number; transition: string }[];
  pacing: 'cinematic' | 'cinematic-clean' | 'punchy' | 'documentary';
  bRollPlacement: string[];
  captions: string;
  zooms: string[];
  cuts: string;
  musicNotes: string;
  sfxNotes: string;
  colorStyle: string;
  exportProfiles: ExportProfile[];
  shortClips: { source: string; durationSeconds: number; profile: string }[];
  ffmpegPipeline: string[];
  safetyNotes: string[];
}

export function planVideoAssembly(input: VideoPlanInput): AssemblyPlan {
  const sceneSeconds = Math.max(8, Math.round((input.durationMinutes * 60) / input.storyboardScenes));
  const timeline = Array.from({ length: input.storyboardScenes }, (_, i) => ({
    sceneIndex: i + 1,
    durationSeconds: sceneSeconds,
    transition: i === input.storyboardScenes - 1 ? 'fade out' : 'cut on motion'
  }));
  const profile = (input.style as AssemblyPlan['pacing']) ?? 'cinematic-clean';
  const filename = safeFilename(input.title, 'video-package');
  return {
    outputBaseFilename: filename,
    timeline,
    pacing: profile,
    bRollPlacement: [
      'Place B-roll at every visual concept change',
      'Cover any quote or statistic with on-screen citation card',
      'Hold close-up only when narration calls attention to a specific element'
    ],
    captions: 'Burned-in captions for accessibility and silent watch contexts. Always also publish a separate SRT.',
    zooms: ['Subtle 1.02x push-ins on key beats', 'Hold static during data visualizations'],
    cuts: 'Cut on motion or audio beat to keep pacing tight without jarring the viewer',
    musicNotes: 'Use royalty-free music with retained license. Match tempo to pacing. Duck under narration by 12 dB.',
    sfxNotes: 'Sparse whooshes on transitions only. No reaction stingers.',
    colorStyle: 'Editorial neutral grade with consistent contrast across scenes',
    exportProfiles: EXPORT_PROFILES,
    shortClips: Array.from({ length: input.shortsCount }, (_, i) => ({
      source: `scene_${i + 1}`,
      durationSeconds: 45,
      profile: 'YouTube Shorts 9:16'
    })),
    ffmpegPipeline: [
      'Stage 1: validate input asset paths against allowlist',
      'Stage 2: normalize all assets to a common codec (h264 + aac) and target framerate',
      'Stage 3: assemble timeline with concat demuxer using a generated, sanitized list file',
      'Stage 4: overlay captions and lower-thirds using a generated subtitle file',
      'Stage 5: export master at 1080p, then export Shorts and previews from master',
      'Stage 6: write outputs to /var/lib/faceless-studio/exports/<userId>/<projectId>/<safeFilename>'
    ],
    safetyNotes: [
      'Never pass raw user-provided strings to a shell',
      'Always sanitize file paths and arguments using an allowlist',
      'Run FFmpeg in a container with no network and read-only inputs',
      'Discard any uploaded asset that fails virus scan or codec check'
    ]
  };
}
