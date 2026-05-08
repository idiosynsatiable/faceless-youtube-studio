// Job runner. Orchestrates the 6-stage pipeline documented in
// src/lib/video-assembler.ts using the safe argument builder + spawn
// abstraction. All I/O paths run through the path allowlist.

import path from 'node:path';
import fs from 'node:fs/promises';

import type { AssemblyJob, JobOutcome, WorkerConfig } from './types';
import { validateInputPath, safeJoinUnderRoot } from './path-allowlist';
import { buildPipeline, UnsafeArgumentError, type StageArgs, type BuiltPipeline } from './ffmpeg-args';
import { realSpawn, type SpawnFn } from './spawn';

export interface JobRunnerOptions {
  config: WorkerConfig;
  spawn?: SpawnFn;
  /** Override for fs operations in tests. Defaults to node:fs/promises. */
  fsImpl?: {
    mkdir: (p: string, opts: { recursive: boolean }) => Promise<void>;
    writeFile: (p: string, data: string) => Promise<void>;
  };
  /** Subtitle text written to the SRT file. If absent we still create an empty file. */
  defaultSubtitlesText?: string;
}

const DEFAULT_FS = {
  mkdir: async (p: string, opts: { recursive: boolean }) => {
    await fs.mkdir(p, opts);
  },
  writeFile: async (p: string, data: string) => {
    await fs.writeFile(p, data, { encoding: 'utf8', flag: 'w' });
  }
};

function workDirFor(config: WorkerConfig, job: AssemblyJob): string {
  return path.join(config.outputsRoot, '_work', job.scope.userId, job.scope.projectId, job.id);
}

function outputDirFor(config: WorkerConfig, job: AssemblyJob): string {
  return path.join(config.outputsRoot, job.scope.userId, job.scope.projectId);
}

export async function runAssemblyJob(job: AssemblyJob, options: JobRunnerOptions): Promise<JobOutcome> {
  const log: string[] = [];
  const outputs: JobOutcome['outputs'] = [];
  const spawnFn = options.spawn ?? realSpawn;
  const fsImpl = options.fsImpl ?? DEFAULT_FS;

  // Stage 1: validate every input path against the allowlist.
  const validatedInputs: { path: string; role: string }[] = [];
  for (const input of job.inputs) {
    const r = validateInputPath(input.path, options.config.inputsAllowlist);
    if (!r.ok || !r.resolved) {
      return {
        jobId: job.id,
        status: 'rejected',
        outputs: [],
        log: [...log, `input rejected: ${input.path} (${r.reason})`],
        errorMessage: `input rejected: ${input.path} (${r.reason})`,
        errorCategory: 'invalid_input_path'
      };
    }
    validatedInputs.push({ path: r.resolved, role: input.role });
  }
  log.push(`Stage 1: validated ${validatedInputs.length} input paths against allowlist`);

  // Compute work and output directories under the outputs root.
  const workDir = workDirFor(options.config, job);
  const outputDir = outputDirFor(options.config, job);
  for (const dir of [workDir, outputDir]) {
    const safe = safeJoinUnderRoot(options.config.outputsRoot, path.relative(options.config.outputsRoot, dir));
    if (!safe.ok) {
      return {
        jobId: job.id,
        status: 'rejected',
        outputs: [],
        log: [...log, `output path rejected: ${dir} (${safe.reason})`],
        errorMessage: `output path rejected: ${dir} (${safe.reason})`,
        errorCategory: 'output_path_not_writable'
      };
    }
  }
  await fsImpl.mkdir(workDir, { recursive: true });
  await fsImpl.mkdir(outputDir, { recursive: true });
  log.push(`Stage 1 complete: workDir=${workDir} outputDir=${outputDir}`);

  // Build the SRT path inside the work directory.
  const srtPath = path.join(workDir, `${job.scope.baseFilename}.srt`);
  await fsImpl.writeFile(srtPath, options.defaultSubtitlesText ?? job.subtitlesText ?? '1\n00:00:00,000 --> 00:00:01,000\n\n');

  // Stages 2-5 via the safe argument builder.
  let pipeline: BuiltPipeline;
  try {
    pipeline = buildPipeline(
      { inputs: validatedInputs, workDir, outputDir, baseFilename: job.scope.baseFilename },
      job.plan,
      srtPath
    );
  } catch (err) {
    if (err instanceof UnsafeArgumentError) {
      return {
        jobId: job.id,
        status: 'rejected',
        outputs: [],
        log: [...log, `unsafe argument: ${err.message}`],
        errorMessage: err.message,
        errorCategory: 'unsafe_argument'
      };
    }
    throw err;
  }

  // Persist the concat list file.
  await fsImpl.writeFile(pipeline.concatListPath, pipeline.concatListContent);

  // Run normalize stages sequentially so we can fail fast.
  const stages: StageArgs[] = [
    ...pipeline.normalizeStages,
    pipeline.concatStage,
    pipeline.overlayStage,
    ...pipeline.exportStages
  ];

  for (const stage of stages) {
    log.push(`running ${stage.stage}${stage.exportProfile ? ` (${stage.exportProfile})` : ''}`);
    let result;
    try {
      result = await spawnFn(options.config.ffmpegBinary, stage.args, {
        timeoutMs: options.config.jobTimeoutMs
      });
    } catch (err) {
      return {
        jobId: job.id,
        status: 'failed',
        outputs,
        log: [...log, `spawn error: ${(err as Error).message}`],
        errorMessage: (err as Error).message,
        errorCategory: 'ffmpeg_failed'
      };
    }
    if (result.code !== 0) {
      return {
        jobId: job.id,
        status: 'failed',
        outputs,
        log: [...log, `${stage.stage} exited with code ${result.code}`, result.stderr.slice(0, 4096)],
        errorMessage: `${stage.stage} exited with code ${result.code}`,
        errorCategory: 'ffmpeg_failed'
      };
    }
    if (stage.stage === 'export_master' || stage.stage === 'export_short' || stage.stage === 'thumbnail') {
      const profile = job.plan.exportProfiles.find((p) => p.name === stage.exportProfile);
      if (profile) {
        outputs.push({
          profile: profile.name,
          absolutePath: stage.outputPath,
          width: profile.width,
          height: profile.height,
          durationSeconds: 0
        });
      }
    }
  }

  log.push(`completed ${outputs.length} export(s)`);
  return {
    jobId: job.id,
    status: 'completed',
    outputs,
    log
  };
}
