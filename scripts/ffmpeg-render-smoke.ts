import { mkdtemp, mkdir, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { planVideoAssembly } from '@/lib/video-assembler';
import { runAssemblyJob } from '@/worker/job-runner';
import type { AssemblyJob, WorkerConfig } from '@/worker/types';

function run(command: string, args: string[]) {
  const result = spawnSync(command, args, { encoding: 'utf8', shell: false });
  if (result.status !== 0) {
    throw new Error(`${command} failed (${result.status}): ${result.stderr || result.stdout}`);
  }
}

async function main() {
  const root = await mkdtemp(path.join(tmpdir(), 'faceless-ffmpeg-smoke-'));
  const inputsRoot = path.join(root, 'inputs');
  const outputsRoot = path.join(root, 'outputs');
  const projectDir = path.join(inputsRoot, 'smoke-user', 'smoke-project');
  await mkdir(projectDir, { recursive: true });
  await mkdir(outputsRoot, { recursive: true });

  const videoPath = path.join(projectDir, 'scene.mp4');
  const narrationPath = path.join(projectDir, 'narration.wav');
  const captionsPath = path.join(projectDir, 'captions.srt');

  try {
    run('/usr/bin/ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'color=c=blue:s=320x180:d=1',
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', videoPath
    ]);
    run('/usr/bin/ffmpeg', [
      '-y', '-loglevel', 'error',
      '-f', 'lavfi', '-i', 'sine=frequency=440:duration=1',
      '-c:a', 'pcm_s16le', narrationPath
    ]);
    await writeFile(captionsPath, '1\n00:00:00,000 --> 00:00:00,800\nRender smoke\n', 'utf8');

    const plan = planVideoAssembly({
      title: 'FFmpeg render smoke',
      durationMinutes: 1,
      shortsCount: 0,
      storyboardScenes: 1,
      style: 'cinematic-clean'
    });
    plan.exportProfiles = [
      { name: 'Smoke master 16:9', width: 320, height: 180, aspect: '16:9', bitrateKbps: 500, fps: 24, audioKbps: 96 }
    ];

    const job: AssemblyJob = {
      id: 'smoke-job',
      scope: { userId: 'smoke-user', projectId: 'smoke-project', baseFilename: 'ffmpeg-render-smoke' },
      plan,
      inputs: [
        { path: videoPath, role: 'broll', license: 'test-fixture' },
        { path: narrationPath, role: 'narration', license: 'test-fixture' },
        { path: captionsPath, role: 'caption_track', license: 'test-fixture' }
      ],
      enqueuedAt: new Date().toISOString()
    };
    const config: WorkerConfig = {
      inputsAllowlist: [inputsRoot],
      outputsRoot,
      ffmpegBinary: '/usr/bin/ffmpeg',
      jobTimeoutMs: 60_000,
      concurrency: 1
    };

    const outcome = await runAssemblyJob(job, { config });
    if (outcome.status !== 'completed' || outcome.outputs.length !== 1) {
      throw new Error(`render smoke failed: ${JSON.stringify(outcome)}`);
    }
    const outputStat = await stat(outcome.outputs[0].absolutePath);
    if (!outputStat.isFile() || outputStat.size < 1024) {
      throw new Error(`render smoke output is invalid: ${outcome.outputs[0].absolutePath} (${outputStat.size} bytes)`);
    }
    process.stdout.write(`FFmpeg render smoke passed: ${outputStat.size} bytes\n`);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
  process.exit(1);
});
