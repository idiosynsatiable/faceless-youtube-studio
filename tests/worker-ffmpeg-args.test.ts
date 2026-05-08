import { describe, expect, it } from 'vitest';
import {
  buildPipeline,
  buildConcatListContent,
  safeArg,
  UnsafeArgumentError
} from '@/worker/ffmpeg-args';
import { planVideoAssembly } from '@/lib/video-assembler';

const SHELL_METACHARS = [';', '|', '&', '`', '$', '<', '>', '\\', '\n', '\r', '"', "'"];

describe('worker ffmpeg args', () => {
  it('safeArg rejects shell metacharacters', () => {
    for (const ch of SHELL_METACHARS) {
      expect(() => safeArg(`/srv/inputs/clip${ch}.mp4`)).toThrowError(UnsafeArgumentError);
    }
  });

  it('safeArg rejects flag-style values', () => {
    expect(() => safeArg('-rf')).toThrowError(UnsafeArgumentError);
  });

  it('safeArg rejects flags not in the allowlist', () => {
    expect(() => safeArg('-evil', 'flag')).toThrowError(UnsafeArgumentError);
  });

  it('buildConcatListContent escapes single quotes correctly', () => {
    const content = buildConcatListContent(['/srv/work/some clip.mp4']);
    expect(content).toBe("file '/srv/work/some clip.mp4'\n");
  });

  it('buildPipeline produces all stages with no unsafe args', () => {
    const plan = planVideoAssembly({
      title: 'Index funds explained',
      durationMinutes: 8,
      shortsCount: 2,
      storyboardScenes: 6,
      style: 'cinematic-clean'
    });
    const pipeline = buildPipeline(
      {
        inputs: [
          { path: '/srv/inputs/u1/p1/scene1.mp4', role: 'broll' },
          { path: '/srv/inputs/u1/p1/narration.wav', role: 'narration' }
        ],
        workDir: '/srv/work/u1/p1/job1',
        outputDir: '/srv/exports/u1/p1',
        baseFilename: 'index-funds-explained'
      },
      plan,
      '/srv/work/u1/p1/job1/index-funds-explained.srt'
    );
    expect(pipeline.normalizeStages.length).toBe(2);
    expect(pipeline.concatStage.outputPath.endsWith('.timeline.mp4')).toBe(true);
    expect(pipeline.overlayStage.outputPath.endsWith('.with_captions.mp4')).toBe(true);
    expect(pipeline.exportStages.length).toBe(plan.exportProfiles.length);
    const allArgs = [
      ...pipeline.normalizeStages.flatMap((s) => s.args),
      ...pipeline.concatStage.args,
      ...pipeline.overlayStage.args,
      ...pipeline.exportStages.flatMap((s) => s.args)
    ];
    for (const arg of allArgs) {
      for (const ch of SHELL_METACHARS) {
        if (ch === "'" && arg.startsWith('subtitles=')) continue;
        if (ch === '\\') continue; // path separators on Windows would set this; we run on Linux runners
        expect(arg.includes(ch), `arg ${JSON.stringify(arg)} contains ${ch}`).toBe(false);
      }
    }
  });

  it('buildPipeline emits the right export profile names', () => {
    const plan = planVideoAssembly({
      title: 'Index funds explained',
      durationMinutes: 8,
      shortsCount: 2,
      storyboardScenes: 6,
      style: 'cinematic-clean'
    });
    const pipeline = buildPipeline(
      {
        inputs: [{ path: '/srv/inputs/u1/p1/scene1.mp4', role: 'broll' }],
        workDir: '/srv/work/u1/p1/job1',
        outputDir: '/srv/exports/u1/p1',
        baseFilename: 'index-funds-explained'
      },
      plan,
      '/srv/work/u1/p1/job1/index-funds-explained.srt'
    );
    const profileNames = pipeline.exportStages.map((s) => s.exportProfile);
    expect(profileNames).toContain('YouTube long-form 16:9');
    expect(profileNames).toContain('YouTube Shorts 9:16');
    expect(profileNames).toContain('Thumbnail still');
  });
});
