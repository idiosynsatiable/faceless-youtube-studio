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

  it('buildPipeline expands visuals across the requested timeline and keeps narration out of normalization', () => {
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
    expect(pipeline.normalizeStages.length).toBe(plan.timeline.length);
    expect(pipeline.normalizeStages.every((stage) => stage.args.includes(String(plan.timeline[0].durationSeconds)))).toBe(true);
    expect(pipeline.audioStage?.stage).toBe('audio_mux');
    expect(pipeline.concatStage.outputPath.endsWith('.timeline.mp4')).toBe(true);
    expect(pipeline.overlayStage.outputPath.endsWith('.with_captions.mp4')).toBe(true);
    expect(pipeline.exportStages.filter((stage) => stage.stage === 'export_short')).toHaveLength(2);

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

  it('turns still images into timeline-length scenes and emits the requested short count', () => {
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
    expect(pipeline.normalizeStages).toHaveLength(3);
    expect(pipeline.normalizeStages.every((stage) => stage.args.includes('-loop'))).toBe(true);
    const profileNames = pipeline.exportStages.map((stage) => stage.exportProfile);
    expect(profileNames).toContain('YouTube long-form 16:9');
    expect(profileNames).toContain('YouTube Short 1 9:16');
    expect(profileNames).toContain('Thumbnail still');
  });

  it('emits no vertical short export when shortsCount is zero', () => {
    const plan = planVideoAssembly({
      title: 'No shorts',
      durationMinutes: 1,
      shortsCount: 0,
      storyboardScenes: 1,
      style: 'punchy'
    });
    const pipeline = buildPipeline(
      {
        inputs: [{ path: '/srv/inputs/u1/p1/scene.mp4', role: 'broll' }],
        workDir: '/srv/work/u1/p1/job1',
        outputDir: '/srv/exports/u1/p1',
        baseFilename: 'no-shorts'
      },
      plan,
      '/srv/work/u1/p1/job1/no-shorts.srt'
    );
    expect(pipeline.exportStages.filter((stage) => stage.stage === 'export_short')).toHaveLength(0);
  });

  it('mixes music under narration at roughly -12 dB when both are present', () => {
    const plan = planVideoAssembly({
      title: 'Narrated music video',
      durationMinutes: 1,
      shortsCount: 0,
      storyboardScenes: 1,
      style: 'cinematic'
    });
    const pipeline = buildPipeline(
      {
        inputs: [
          { path: '/srv/inputs/u1/p1/scene.mp4', role: 'broll' },
          { path: '/srv/inputs/u1/p1/narration.wav', role: 'narration' },
          { path: '/srv/inputs/u1/p1/music.mp3', role: 'music' }
        ],
        workDir: '/srv/work/u1/p1/job1',
        outputDir: '/srv/exports/u1/p1',
        baseFilename: 'mixed-audio'
      },
      plan,
      '/srv/work/u1/p1/job1/mixed-audio.srt'
    );
    expect(pipeline.audioStage?.args).toContain('-filter_complex');
    expect(pipeline.audioStage?.args).toContain('[1:a][2:a]amix=inputs=2:duration=longest:weights=1 0.25[aout]');
  });
});
