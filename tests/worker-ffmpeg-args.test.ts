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

  it('buildConcatListContent emits the concat demuxer format', () => {
    const content = buildConcatListContent(['/srv/work/some clip.mp4']);
    expect(content).toBe("file '/srv/work/some clip.mp4'\n");
  });

  it('buildPipeline keeps narration out of visual normalization and adds an audio mux stage', () => {
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
    expect(pipeline.normalizeStages.length).toBe(1);
    expect(pipeline.audioStage?.stage).toBe('audio_mux');
    expect(pipeline.concatStage.outputPath.endsWith('.timeline.mp4')).toBe(true);
    expect(pipeline.overlayStage.outputPath.endsWith('.with_captions.mp4')).toBe(true);
    expect(pipeline.exportStages.length).toBe(plan.exportProfiles.length);

    const allArgs = [
      ...pipeline.normalizeStages.flatMap((stage) => stage.args),
      ...pipeline.concatStage.args,
      ...(pipeline.audioStage?.args ?? []),
      ...pipeline.overlayStage.args,
      ...pipeline.exportStages.flatMap((stage) => stage.args)
    ];
    for (const arg of allArgs) {
      for (const ch of SHELL_METACHARS) {
        if (ch === "'" && arg.startsWith('subtitles=')) continue;
        if (ch === '\\') continue;
        expect(arg.includes(ch), `arg ${JSON.stringify(arg)} contains ${ch}`).toBe(false);
      }
    }
  });

  it('turns still images into timed visual stages and emits all profiles', () => {
    const plan = planVideoAssembly({
      title: 'Image story',
      durationMinutes: 2,
      shortsCount: 1,
      storyboardScenes: 3,
      style: 'documentary'
    });
    const pipeline = buildPipeline(
      {
        inputs: [{ path: '/srv/inputs/u1/p1/scene1.jpg', role: 'thumbnail_still' }],
        workDir: '/srv/work/u1/p1/job1',
        outputDir: '/srv/exports/u1/p1',
        baseFilename: 'image-story'
      },
      plan,
      '/srv/work/u1/p1/job1/image-story.srt'
    );
    expect(pipeline.normalizeStages[0].args).toContain('-loop');
    const profileNames = pipeline.exportStages.map((stage) => stage.exportProfile);
    expect(profileNames).toContain('YouTube long-form 16:9');
    expect(profileNames).toContain('YouTube Shorts 9:16');
    expect(profileNames).toContain('Thumbnail still');
  });
});
