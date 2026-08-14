import fs from 'node:fs/promises';
import path from 'node:path';
import { config } from '@/lib/config';
import { generateEditorialImage, generateHeroClip } from '@/lib/openai-media';

export async function writeGeneratedVisuals(projectDir: string, prompts: string[]): Promise<string[]> {
  await fs.mkdir(projectDir, { recursive: true });
  const clean = prompts.map((prompt) => prompt.trim()).filter(Boolean);
  if (clean.length === 0) throw new Error('at least one visual prompt is required');
  const count = Math.max(3, Math.min(config.autonomy.maxVisuals, clean.length));
  const visuals: string[] = [];
  let clipsUsed = 0;
  for (let i = 0; i < count; i += 1) {
    const prompt = clean[i % clean.length];
    if (config.autonomy.soraEnabled && clipsUsed < config.autonomy.maxSoraClips) {
      try {
        const video = path.join(projectDir, `generated-${String(i + 1).padStart(2, '0')}.mp4`);
        await fs.writeFile(video, await generateHeroClip(prompt));
        visuals.push(video);
        clipsUsed += 1;
        continue;
      } catch {
        // Fall back to an original still when video generation is unavailable.
      }
    }
    const image = path.join(projectDir, `generated-${String(i + 1).padStart(2, '0')}.png`);
    await fs.writeFile(image, await generateEditorialImage(prompt));
    visuals.push(image);
  }
  return visuals;
}
