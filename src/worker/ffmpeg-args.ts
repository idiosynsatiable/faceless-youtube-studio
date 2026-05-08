// FFmpeg argument builder. Produces argv arrays — never shell strings.
// Every output array is intended to be passed to child_process.spawn(cmd, args, { shell: false }).
//
// Implementation maps directly to the 6-stage pipeline documented in
// src/lib/video-assembler.ts. Each stage is a pure function of the validated
// inputs + the AssemblyPlan. No I/O happens here.

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
  '-y',
  '-i',
  '-f',
  '-c:v',
  '-c:a',
  '-c:s',
  '-r',
  '-b:v',
  '-b:a',
  '-vf',
  '-af',
  '-filter_complex',
  '-map',
  '-ss',
  '-t',
  '-to',
  '-aspect',
  '-pix_fmt',
  '-preset',
  '-crf',
  '-movflags',
  '-frames:v',
  '-frames:a',
  '-vsync',
  '-async',
  '-shortest',
  '-loop',
  '-codec:v',
  '-codec:a',
  '-strict',
  '-safe',
  '-protocol_whitelist',
  '-loglevel',
  '-progress',
  '-nostats',
  '-an',
  '-vn'
]);

/**
 * Safe-ify a single argument. Throws UnsafeArgumentError if the value contains
 * shell metacharacters. Flag-style values (starting with -) must be in the
 * allowlist; unknown flags are refused so user-supplied data can never inject
 * a new ffmpeg flag.
 */
export function safeArg(value: string, kind: 'flag' | 'value' = 'value'): SafeArg {
  if (typeof value !== 'string') throw new UnsafeArgumentError('non-string argument', String(value));
  if (value.length === 0) throw new UnsafeArgumentError('empty argument', value);
  if (SHELL_METACHARS.test(value)) {
    throw new UnsafeArgumentError(`shell metacharacter in argument: ${JSON.stringify(value)}`, value);
  }
  if (kind === 'flag') {
    if (!FFMPEG_FLAG_ALLOWLIST.has(value)) {
      throw new UnsafeArgumentError(`flag not in allowlist: ${value}`, value);
    }
  } else {
    if (FLAG_INJECTION_PREFIX.test(value)) {
      // Refuse any value that starts with a hyphen unless explicitly allowed.
      // Numbers like -1.0 would be passed via a key=value form, not a bare arg.
      throw new UnsafeArgumentError(`value starts with hyphen and could be parsed as flag: ${value}`, value);
    }
  }
  return value;
}

export function safeArgs(values: { value: string; kind?: 'flag' | 'value' }[]): SafeArg[] {
  return values.map((v) => safeArg(v.value, v.kind ?? 'value'));
}

export interface BuildContext {
  inputs: { path: string; role: string }[];
  /** Absolute work directory that already exists and is writable. */
  workDir: string;
  /** Absolute output base for the project. */
  outputDir: string;
  baseFilename: string;
}

export interface StageArgs {
  stage: 'normalize' | 'concat' | 'overlay' | 'export_master' | 'export_short' | 'thumbnail';
  inputIndex?: number;
  exportProfile?: string;
  args: SafeArg[];
  outputPath: string;
}

const NORMALIZED_EXT = '.normalized.mp4';

export function buildNormalizeArgs(ctx: BuildContext): StageArgs[] {
  return ctx.inputs.map((input, idx) => {
    const inSafe = safeArg(input.path);
    const out = path.join(ctx.workDir, `input_${idx}${NORMALIZED_EXT}`);
    const outSafe = safeArg(out);
    const args: SafeArg[] = [
      safeArg('-y', 'flag'),
      safeArg('-loglevel', 'flag'),
      safeArg('error'),
      safeArg('-i', 'flag'),
      inSafe,
      safeArg('-c:v', 'flag'),
      safeArg('libx264'),
      safeArg('-c:a', 'flag'),
      safeArg('aac'),
      safeArg('-pix_fmt', 'flag'),
      safeArg('yuv420p'),
      safeArg('-r', 'flag'),
      safeArg('30'),
      safeArg('-preset', 'flag'),
      safeArg('medium'),
      safeArg('-crf', 'flag'),
      safeArg('20'),
      outSafe
    ];
    return { stage: 'normalize', inputIndex: idx, args, outputPath: out };
  });
}

export function buildConcatListContent(normalizedPaths: string[]): string {
  return normalizedPaths
    .map((p) => {
      // The concat demuxer's list file accepts a `file '<path>'` form.
      // We escape only the single quote character per ffmpeg docs (it must be
      // doubled). Other special characters are already disallowed by safeArg().
      const escaped = p.replace(/'/g, "'\\''");
      return `file '${escaped}'`;
    })
    .join('\n') + '\n';
}

export function buildConcatArgs(ctx: BuildContext, listFilePath: string): StageArgs {
  const out = path.join(ctx.workDir, `${ctx.baseFilename}.timeline.mp4`);
  const args: SafeArg[] = [
    safeArg('-y', 'flag'),
    safeArg('-loglevel', 'flag'),
    safeArg('error'),
    safeArg('-f', 'flag'),
    safeArg('concat'),
    safeArg('-safe', 'flag'),
    safeArg('0'),
    safeArg('-i', 'flag'),
    safeArg(listFilePath),
    safeArg('-c:v', 'flag'),
    safeArg('libx264'),
    safeArg('-c:a', 'flag'),
    safeArg('aac'),
    safeArg('-pix_fmt', 'flag'),
    safeArg('yuv420p'),
    safeArg('-r', 'flag'),
    safeArg('30'),
    safeArg('-preset', 'flag'),
    safeArg('medium'),
    safeArg('-crf', 'flag'),
    safeArg('20'),
    safeArg('-movflags', 'flag'),
    safeArg('+faststart'),
    safeArg(out)
  ];
  return { stage: 'concat', args, outputPath: out };
}

export function buildOverlayArgs(ctx: BuildContext, timelinePath: string, srtPath: string): StageArgs {
  const out = path.join(ctx.workDir, `${ctx.baseFilename}.with_captions.mp4`);
  // The subtitles filter accepts a path, but we hard-rule out shell-meta chars
  // via safeArg. The srtPath is an absolute path produced by safeJoinUnderRoot.
  const args: SafeArg[] = [
    safeArg('-y', 'flag'),
    safeArg('-loglevel', 'flag'),
    safeArg('error'),
    safeArg('-i', 'flag'),
    safeArg(timelinePath),
    safeArg('-vf', 'flag'),
    safeArg(`subtitles=${srtPath}`),
    safeArg('-c:v', 'flag'),
    safeArg('libx264'),
    safeArg('-c:a', 'flag'),
    safeArg('copy'),
    safeArg('-pix_fmt', 'flag'),
    safeArg('yuv420p'),
    safeArg('-preset', 'flag'),
    safeArg('medium'),
    safeArg('-crf', 'flag'),
    safeArg('20'),
    safeArg(out)
  ];
  return { stage: 'overlay', args, outputPath: out };
}

export function buildExportArgs(
  ctx: BuildContext,
  withCaptionsPath: string,
  profile: ExportProfile
): StageArgs {
  const safeProfile = profile.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const isThumbnail = profile.fps === 0 && profile.bitrateKbps === 0;
  const out = path.join(ctx.outputDir, `${ctx.baseFilename}.${safeProfile}${isThumbnail ? '.jpg' : '.mp4'}`);
  if (isThumbnail) {
    const args: SafeArg[] = [
      safeArg('-y', 'flag'),
      safeArg('-loglevel', 'flag'),
      safeArg('error'),
      safeArg('-i', 'flag'),
      safeArg(withCaptionsPath),
      safeArg('-frames:v', 'flag'),
      safeArg('1'),
      safeArg('-vf', 'flag'),
      safeArg(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`),
      safeArg(out)
    ];
    return { stage: 'thumbnail', exportProfile: profile.name, args, outputPath: out };
  }
  const stage: StageArgs['stage'] = profile.aspect === '9:16' ? 'export_short' : 'export_master';
  const args: SafeArg[] = [
    safeArg('-y', 'flag'),
    safeArg('-loglevel', 'flag'),
    safeArg('error'),
    safeArg('-i', 'flag'),
    safeArg(withCaptionsPath),
    safeArg('-vf', 'flag'),
    safeArg(`scale=${profile.width}:${profile.height}:force_original_aspect_ratio=decrease,pad=${profile.width}:${profile.height}:(ow-iw)/2:(oh-ih)/2`),
    safeArg('-c:v', 'flag'),
    safeArg('libx264'),
    safeArg('-c:a', 'flag'),
    safeArg('aac'),
    safeArg('-r', 'flag'),
    safeArg(String(profile.fps)),
    safeArg('-b:v', 'flag'),
    safeArg(`${profile.bitrateKbps}k`),
    safeArg('-b:a', 'flag'),
    safeArg(`${profile.audioKbps}k`),
    safeArg('-pix_fmt', 'flag'),
    safeArg('yuv420p'),
    safeArg('-preset', 'flag'),
    safeArg('medium'),
    safeArg('-crf', 'flag'),
    safeArg('20'),
    safeArg('-movflags', 'flag'),
    safeArg('+faststart'),
    safeArg(out)
  ];
  return { stage, exportProfile: profile.name, args, outputPath: out };
}

export interface BuiltPipeline {
  workDir: string;
  outputDir: string;
  normalizeStages: StageArgs[];
  concatStage: StageArgs;
  concatListPath: string;
  concatListContent: string;
  overlayStage: StageArgs;
  exportStages: StageArgs[];
  outputs: string[];
}

export function buildPipeline(ctx: BuildContext, plan: AssemblyPlan, srtPath: string): BuiltPipeline {
  const normalizeStages = buildNormalizeArgs(ctx);
  const concatListPath = path.join(ctx.workDir, 'concat-list.txt');
  const concatListContent = buildConcatListContent(normalizeStages.map((s) => s.outputPath));
  const concatStage = buildConcatArgs(ctx, concatListPath);
  const overlayStage = buildOverlayArgs(ctx, concatStage.outputPath, srtPath);
  const exportStages = plan.exportProfiles.map((p) => buildExportArgs(ctx, overlayStage.outputPath, p));
  return {
    workDir: ctx.workDir,
    outputDir: ctx.outputDir,
    normalizeStages,
    concatStage,
    concatListPath,
    concatListContent,
    overlayStage,
    exportStages,
    outputs: exportStages.map((s) => s.outputPath)
  };
}
