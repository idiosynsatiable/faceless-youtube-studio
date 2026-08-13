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
  args: SafeArg[];
  outputPath: string;
}

const NORMALIZED_EXT = '.normalized.mp4';

function visualInputs(ctx: BuildContext) {
  return ctx.inputs.filter((input) => input.role === 'broll' || input.role === 'thumbnail_still');
}

export function buildNormalizeArgs(ctx: BuildContext): StageArgs[] {
  return visualInputs(ctx).map((input, idx) => {
    const out = path.join(ctx.workDir, `visual_${idx}${NORMALIZED_EXT}`);
    const commonTail: SafeArg[] = [
      safeArg('-c:v', 'flag'), safeArg('libx264'),
      safeArg('-an', 'flag'),
      safeArg('-pix_fmt', 'flag'), safeArg('yuv420p'),
      safeArg('-r', 'flag'), safeArg('30'),
      safeArg('-preset', 'flag'), safeArg('medium'),
      safeArg('-crf', 'flag'), safeArg('20'),
      safeArg(out)
    ];
    const args: SafeArg[] = input.role === 'thumbnail_still'
      ? [
          safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
          safeArg('-loop', 'flag'), safeArg('1'),
          safeArg('-i', 'flag'), safeArg(input.path),
          safeArg('-t', 'flag'), safeArg('5'),
          safeArg('-vf', 'flag'), safeArg('scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'),
          ...commonTail
        ]
      : [
          safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
          safeArg('-i', 'flag'), safeArg(input.path),
          safeArg('-vf', 'flag'), safeArg('scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2'),
          ...commonTail
        ];
    return { stage: 'normalize', inputIndex: idx, args, outputPath: out };
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

export function buildAudioMuxArgs(ctx: BuildContext, timelinePath: string, audioPath: string): StageArgs {
  const out = path.join(ctx.workDir, `${ctx.baseFilename}.with_audio.mp4`);
  const args: SafeArg[] = [
    safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
    safeArg('-i', 'flag'), safeArg(timelinePath),
    safeArg('-i', 'flag'), safeArg(audioPath),
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
      stage: 'thumbnail', exportProfile: profile.name, outputPath: out,
      args: [
        safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
        safeArg('-i', 'flag'), safeArg(sourcePath), safeArg('-frames:v', 'flag'), safeArg('1'),
        safeArg('-vf', 'flag'), safeArg(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`),
        safeArg(out)
      ]
    };
  }
  const stage: StageArgs['stage'] = profile.aspect === '9:16' ? 'export_short' : 'export_master';
  return {
    stage, exportProfile: profile.name, outputPath: out,
    args: [
      safeArg('-y', 'flag'), safeArg('-loglevel', 'flag'), safeArg('error'),
      safeArg('-i', 'flag'), safeArg(sourcePath),
      safeArg('-vf', 'flag'), safeArg(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`),
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
  const normalizeStages = buildNormalizeArgs(ctx);
  if (normalizeStages.length === 0) {
    throw new UnsafeArgumentError('at least one visual input is required', ctx.baseFilename);
  }
  const concatListPath = path.join(ctx.workDir, 'concat-list.txt');
  const concatListContent = buildConcatListContent(normalizeStages.map((s) => s.outputPath));
  const concatStage = buildConcatArgs(ctx, concatListPath);
  const audioInput = ctx.inputs.find((input) => input.role === 'narration') ?? ctx.inputs.find((input) => input.role === 'music');
  const audioStage = audioInput ? buildAudioMuxArgs(ctx, concatStage.outputPath, audioInput.path) : undefined;
  const overlayStage = buildOverlayArgs(ctx, audioStage?.outputPath ?? concatStage.outputPath, srtPath);
  const exportStages = plan.exportProfiles.map((profile) => buildExportArgs(ctx, overlayStage.outputPath, profile));
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
