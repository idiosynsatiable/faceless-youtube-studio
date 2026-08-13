// FFmpeg argument builder. Produces argv arrays only; commands are executed with shell:false.

import path from 'node:path';
import type { AssemblyPlan, ExportProfile } from '@/lib/video-assembler';

export type SafeArg = string;

export class UnsafeArgumentError extends Error {
  constructor(message: string, public readonly value: string) {
    super(message);
    this.name = 'UnsafeArgumentError';
  }
}

const SHELL_METACHARS = /[;|&`$<>\\\n\r"']/;
const FLAG_INJECTION_PREFIX = /^-/;
const FFMPEG_FLAG_ALLOWLIST = new Set<string>([
  '-y', '-i', '-f', '-c:v', '-c:a', '-c:s', '-r', '-b:v', '-b:a', '-vf', '-af',
  '-filter_complex', '-map', '-ss', '-t', '-to', '-aspect', '-pix_fmt', '-preset', '-crf',
  '-movflags', '-frames:v', '-frames:a', '-vsync', '-async', '-shortest', '-loop', '-codec:v',
  '-codec:a', '-strict', '-safe', '-protocol_whitelist', '-loglevel', '-progress', '-nostats',
  '-an', '-vn'
]);

export function safeArg(value: string, kind: 'flag' | 'value' = 'value'): SafeArg {
  if (typeof value !== 'string') throw new UnsafeArgumentError('non-string argument', String(value));
  if (value.length === 0) throw new UnsafeArgumentError('empty argument', value);
  if (SHELL_METACHARS.test(value)) {
    throw new UnsafeArgumentError(`shell metacharacter in argument: ${JSON.stringify(value)}`, value);
  }
  if (kind === 'flag') {
    if (!FFMPEG_FLAG_ALLOWLIST.has(value)) throw new UnsafeArgumentError(`flag not in allowlist: ${value}`, value);
  } else if (FLAG_INJECTION_PREFIX.test(value)) {
    throw new UnsafeArgumentError(`value starts with hyphen and could be parsed as flag: ${value}`, value);
  }
  return value;
}

export function safeArgs(values: { value: string; kind?: 'flag' | 'value' }[]): SafeArg[] {
  return values.map((v) => safeArg(v.value, v.kind ?? 'value'));
}

export interface BuildContext {
  inputs: { path: string; role: string }[];
  workDir: string;
  outputDir: string;
  baseFilename: string;
}

export interface StageArgs {
  stage: 'normalize' | 'concat' | 'audio_mux' | 'overlay' | 'export_master' | 'export_short' | 'thumbnail';
  inputIndex?: number;
  exportProfile?: string;
  profile?: ExportProfile;
  args: SafeArg[];
  outputPath: string;
}

const NORMALIZED_EXT = '.normalized.mp4';

function visualInputs(ctx: BuildContext) {
  return ctx.inputs.filter((input) => input.role === 'broll' || input.role === 'thumbnail_still');
}

function scaleFilter(width: number, height: number): string {
  return `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;
}

export function buildNormalizeArgs(ctx: BuildContext, plan: AssemblyPlan): StageArgs[] {
  const visuals = visualInputs(ctx);
  if (visuals.length === 0) return [];

  return plan.timeline.map((scene, sceneIdx) => {
    const input = visuals[sceneIdx % visuals.length];
    const out = path.join(ctx.workDir, `scene_${sceneIdx}${NORMALIZED_EXT}`);
    const duration = String(Math.max(1, scene.durationSeconds));
    const baseScale = scaleFilter(1920, 1080);
    const videoFilter = input.role === 'thumbnail_still'
      ? baseScale
      : `${baseScale},tpad=stop_mode=clone:stop_duration=${duration}`;
    const args: SafeArg[] = [
      safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
      ...(input.role === 'thumbnail_still' ? [safeArg('-loop', 'flag'), safeArg('1')] : []),
      safeArg('-i', 'flag'), safeArg(input.path),
      safeArg('-t', 'flag'), safeArg(duration),
      safeArg('-vf', 'flag'), safeArg(videoFilter),
      safeArg('-c:v', 'flag'), safeArg('libx264'),
      safeArg('-an', 'flag'),
      safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'),
      safeArg('-r', 'flag'), safeArg('30'),
      safeArg('-preset', 'flag'), safeArg('medium'),
      safeArg('-crf', 'flag'), safeArg('20'),
      safeArg(out)
    ];
    return { stage: 'normalize', inputIndex: sceneIdx, args, outputPath: out };
  });
}

export function buildConcatListContent(normalizedPaths: string[]): string {
  return normalizedPaths.map((p) => `file '${p.replace(/'/g, "'\\''")}'`).join('\n') + '\n';
}

export function buildConcatArgs(ctx: BuildContext, listFilePath: string): StageArgs {
  const out = path.join(ctx.workDir, `${ctx.baseFilename}.timeline.mp4`);
  const args: SafeArg[] = [
    safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
    safeArg('-f', 'flag'), safeArg('concat'), safeArg('-safe', 'flag'), safeArg('0'),
    safeArg('-i', 'flag'), safeArg(listFilePath),
    safeArg('-c:v', 'flag'), safeArg('libx264'), safeArg('-an', 'flag'),
    safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'), safeArg('-r', 'flag'), safeArg('30'),
    safeArg('-preset', 'flag'), safeArg('medium'), safeArg('-crf', 'flag'), safeArg('20'),
    safeArg('-movflags', 'flag'), safeArg('+faststart'), safeArg(out)
  ];
  return { stage: 'concat', args, outputPath: out };
}

export function buildAudioMuxArgs(
  ctx: BuildContext,
  timelinePath: string,
  narrationPath?: string,
  musicPath?: string
): StageArgs | undefined {
  if (!narrationPath && !musicPath) return undefined;

  const out = path.join(ctx.workDir, `${ctx.baseFilename}.with_audio.mp4`);
  if (narrationPath && musicPath) {
    const args: SafeArg[] = [
      safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
      safeArg('-i', 'flag'), safeArg(timelinePath),
      safeArg('-i', 'flag'), safeArg(narrationPath),
      safeArg('-i', 'flag'), safeArg(musicPath),
      safeArg('-filter_complex', 'flag'), safeArg('[1:a][2:a]amix=inputs=2:duration=longest:weights=1 0.25[aout]'),
      safeArg('-map', 'flag'), safeArg('0:v:0'),
      safeArg('-map', 'flag'), safeArg('[aout]'),
      safeArg('-c:v', 'flag'), safeArg('copy'),
      safeArg('-c:a', 'flag'), safeArg('aac'),
      safeArg('-b:a', 'flag'), safeArg('192k'),
      safeArg('-shortest', 'flag'), safeArg(out)
    ];
    return { stage: 'audio_mux', args, outputPath: out };
  }

  const audioPath = narrationPath ?? musicPath!;
  const args: SafeArg[] = [
    safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
    safeArg('-i', 'flag'), safeArg(timelinePath),
    safeArg('-i', 'flag'), safeArg(audioPath),
    safeArg('-map', 'flag'), safeArg('0:v:0'),
    safeArg('-map', 'flag'), safeArg('1:a:0'),
    safeArg('-c:v', 'flag'), safeArg('copy'),
    safeArg('-c:a', 'flag'), safeArg('aac'),
    safeArg('-b:a', 'flag'), safeArg('192k'),
    safeArg('-shortest', 'flag'), safeArg(out)
  ];
  return { stage: 'audio_mux', args, outputPath: out };
}

export function buildOverlayArgs(ctx: BuildContext, mediaPath: string, srtPath: string): StageArgs {
  const out = path.join(ctx.workDir, `${ctx.baseFilename}.with_captions.mp4`);
  const args: SafeArg[] = [
    safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
    safeArg('-i', 'flag'), safeArg(mediaPath),
    safeArg('-vf', 'flag'), safeArg(`subtitles=${srtPath}`),
    safeArg('-c:v', 'flag'), safeArg('libx264'),
    safeArg('-c:a', 'flag'), safeArg('copy'),
    safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'),
    safeArg('-preset', 'flag'), safeArg('medium'), safeArg('-crf', 'flag'), safeArg('20'),
    safeArg(out)
  ];
  return { stage: 'overlay', args, outputPath: out };
}

export function buildExportArgs(ctx: BuildContext, sourcePath: string, profile: ExportProfile): StageArgs {
  const safeProfile = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const isThumbnail = profile.fps === 0 && profile.bitrateKbps === 0;
  const out = path.join(ctx.outputDir, `${ctx.baseFilename}.${safeProfile}${isThumbnail ? '.jpg' : '.mp4'}`);
  if (isThumbnail) {
    return {
      stage: 'thumbnail', exportProfile: profile.name, profile, outputPath: out,
      args: [
        safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
        safeArg('-i', 'flag'), safeArg(sourcePath), safeArg('-frames:v', 'flag'), safeArg('1'),
        safeArg('-vf', 'flag'), safeArg(scaleFilter(profile.width, profile.height)),
        safeArg(out)
      ]
    };
  }
  const stage: StageArgs['stage'] = profile.aspect === '9:16' ? 'export_short' : 'export_master';
  return {
    stage, exportProfile: profile.name, profile, outputPath: out,
    args: [
      safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
      safeArg('-i', 'flag'), safeArg(sourcePath),
      safeArg('-vf', 'flag'), safeArg(scaleFilter(profile.width, profile.height)),
      safeArg('-c:v', 'flag'), safeArg('libx264'), safeArg('-c:a', 'flag'), safeArg('aac'),
      safeArg('-r', 'flag'), safeArg(String(profile.fps)),
      safeArg('-b:v', 'flag'), safeArg(`${profile.bitrateKbps}k`),
      safeArg('-b:a', 'flag'), safeArg(`${profile.audioKbps}k`),
      safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'),
      safeArg('-preset', 'flag'), safeArg('medium'), safeArg('-crf', 'flag'), safeArg('20'),
      safeArg('-movflags', 'flag'), safeArg('+faststart'), safeArg(out)
    ]
  };
}

export function buildShortExportArgs(
  ctx: BuildContext,
  sourcePath: string,
  profile: ExportProfile,
  clipIndex: number,
  startSeconds: number,
  durationSeconds: number
): StageArgs {
  const numberedProfile: ExportProfile = { ...profile, name: `YouTube Short ${clipIndex + 1} 9:16` };
  const out = path.join(ctx.outputDir, `${ctx.baseFilename}.youtube-short-${clipIndex + 1}.mp4`);
  return {
    stage: 'export_short', exportProfile: numberedProfile.name, profile: numberedProfile, outputPath: out,
    args: [
      safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
      safeArg('-ss', 'flag'), safeArg(String(Math.max(0, startSeconds))),
      safeArg('-i', 'flag'), safeArg(sourcePath),
      safeArg('-t', 'flag'), safeArg(String(Math.max(1, durationSeconds))),
      safeArg('-vf', 'flag'), safeArg(scaleFilter(profile.width, profile.height)),
      safeArg('-c:v', 'flag'), safeArg('libx264'), safeArg('-c:a', 'flag'), safeArg('aac'),
      safeArg('-r', 'flag'), safeArg(String(profile.fps)),
      safeArg('-b:v', 'flag'), safeArg(`${profile.bitrateKbps}k`),
      safeArg('-b:a', 'flag'), safeArg(`${profile.audioKbps}k`),
      safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'),
      safeArg('-preset', 'flag'), safeArg('medium'), safeArg('-crf', 'flag'), safeArg('20'),
      safeArg('-movflags', 'flag'), safeArg('+faststart'), safeArg(out)
    ]
  };
}

export interface BuiltPipeline {
  workDir: string;
  outputDir: string;
  normalizeStages: StageArgs[];
  concatStage: StageArgs;
  concatListPath: string;
  concatListContent: string;
  audioStage?: StageArgs;
  overlayStage: StageArgs;
  exportStages: StageArgs[];
  outputs: string[];
}

export function buildPipeline(ctx: BuildContext, plan: AssemblyPlan, srtPath: string): BuiltPipeline {
  const normalizeStages = buildNormalizeArgs(ctx, plan);
  if (normalizeStages.length === 0) {
    throw new UnsafeArgumentError('at least one visual input is required', ctx.baseFilename);
  }
  const concatListPath = path.join(ctx.workDir, 'concat-list.txt');
  const concatListContent = buildConcatListContent(normalizeStages.map((s) => s.outputPath));
  const concatStage = buildConcatArgs(ctx, concatListPath);
  const narrationInput = ctx.inputs.find((input) => input.role === 'narration');
  const musicInput = ctx.inputs.find((input) => input.role === 'music');
  const audioStage = buildAudioMuxArgs(ctx, concatStage.outputPath, narrationInput?.path, musicInput?.path);
  const overlayStage = buildOverlayArgs(ctx, audioStage?.outputPath ?? concatStage.outputPath, srtPath);

  const baseProfiles = plan.exportProfiles.filter((profile) => profile.aspect !== '9:16');
  const exportStages = baseProfiles.map((profile) => buildExportArgs(ctx, overlayStage.outputPath, profile));

  const shortProfile = plan.exportProfiles.find((profile) => profile.name === 'YouTube Shorts 9:16')
    ?? { name: 'YouTube Shorts 9:16', width: 1080, height: 1920, aspect: '9:16', bitrateKbps: 8000, fps: 30, audioKbps: 192 };
  const totalDuration = Math.max(1, plan.timeline.reduce((sum, scene) => sum + scene.durationSeconds, 0));
  const shortCount = plan.shortClips.length;
  for (let i = 0; i < shortCount; i += 1) {
    const clipDuration = Math.min(plan.shortClips[i].durationSeconds, totalDuration);
    const latestStart = Math.max(0, totalDuration - clipDuration);
    const start = shortCount <= 1 ? 0 : Math.round((latestStart * i) / (shortCount - 1));
    exportStages.push(buildShortExportArgs(ctx, overlayStage.outputPath, shortProfile, i, start, clipDuration));
  }

  return {
    workDir: ctx.workDir,
    outputDir: ctx.outputDir,
    normalizeStages,
    concatStage,
    concatListPath,
    concatListContent,
    audioStage,
    overlayStage,
    exportStages,
    outputs: exportStages.map((stage) => stage.outputPath)
  };
}
