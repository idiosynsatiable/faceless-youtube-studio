// Shared types for the FFmpeg + upload worker.

import type { AssemblyPlan } from '@/lib/video-assembler';

export interface AssetInput {
  /** Path the worker reads from. Must resolve inside the inputs allowlist. */
  path: string;
  /** Logical role within the timeline. */
  role: 'narration' | 'broll' | 'music' | 'sfx' | 'caption_track' | 'thumbnail_still';
  /** Documented license for this asset, copied from the storyboard. */
  license: string;
}

export interface JobScope {
  userId: string;
  projectId: string;
  /** Filename stem the assembler chose. Must already be safe. */
  baseFilename: string;
}

export interface AssemblyJob {
  id: string;
  scope: JobScope;
  plan: AssemblyPlan;
  inputs: AssetInput[];
  /** ISO timestamp this job was enqueued. Used for backoff and TTL decisions. */
  enqueuedAt: string;
  /** Optional subtitle text the worker burns in via subtitles filter. */
  subtitlesText?: string;
}

export type JobOutcomeStatus = 'completed' | 'failed' | 'rejected';

export interface JobOutcome {
  jobId: string;
  status: JobOutcomeStatus;
  outputs: { profile: string; absolutePath: string; width: number; height: number; durationSeconds: number }[];
  log: string[];
  errorMessage?: string;
  errorCategory?:
    | 'invalid_input_path'
    | 'unsafe_argument'
    | 'ffmpeg_failed'
    | 'output_path_not_writable'
    | 'unknown';
}

export interface WorkerConfig {
  /** Absolute prefix the worker is allowed to read inputs from. */
  inputsAllowlist: string[];
  /** Absolute prefix the worker writes outputs into. */
  outputsRoot: string;
  /** Absolute path to the ffmpeg binary, e.g. /usr/bin/ffmpeg. */
  ffmpegBinary: string;
  /** Optional ffprobe binary, used for input validation. */
  ffprobeBinary?: string;
  /** Maximum job runtime before the worker aborts the spawn. */
  jobTimeoutMs: number;
  /** Concurrency: how many jobs the worker processes in parallel. */
  concurrency: number;
}
