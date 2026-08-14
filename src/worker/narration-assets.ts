import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { generateNarration } from '@/lib/openai-media';

function splitNarration(text: string, maxChars = 3400): string[] {
  const sentences = text.replace(/\s+/g, ' ').trim().split(/(?<=[.!?])\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = '';
  for (const sentence of sentences) {
    if (current && current.length + sentence.length + 1 > maxChars) {
      chunks.push(current);
      current = sentence;
    } else {
      current = current ? `${current} ${sentence}` : sentence;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

function srtTime(seconds: number): string {
  const ms = Math.max(0, Math.round(seconds * 1000));
  const h = Math.floor(ms / 3_600_000).toString().padStart(2, '0');
  const m = Math.floor((ms % 3_600_000) / 60_000).toString().padStart(2, '0');
  const s = Math.floor((ms % 60_000) / 1000).toString().padStart(2, '0');
  const milli = (ms % 1000).toString().padStart(3, '0');
  return `${h}:${m}:${s},${milli}`;
}

export function buildCaptionTrack(script: string, durationSeconds: number): string {
  const words = script.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean);
  const groups: string[] = [];
  for (let i = 0; i < words.length; i += 9) groups.push(words.slice(i, i + 9).join(' '));
  if (groups.length === 0) return '1\n00:00:00,000 --> 00:00:01,000\n\n';
  const each = Math.max(0.8, durationSeconds / groups.length);
  return groups.map((line, index) => {
    const start = index * each;
    const end = Math.min(durationSeconds, Math.max(start + 0.6, (index + 1) * each));
    return `${index + 1}\n${srtTime(start)} --> ${srtTime(end)}\n${line}\n`;
  }).join('\n');
}

async function runProcess(binary: string, args: string[]): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const child = spawn(binary, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => { stdout += String(chunk); });
    child.stderr.on('data', (chunk) => { stderr += String(chunk); });
    child.once('error', reject);
    child.once('close', (code) => code === 0 ? resolve(stdout.trim()) : reject(new Error(`${path.basename(binary)} exited ${code}: ${stderr.slice(-2000)}`)));
  });
}

async function runFfmpeg(args: string[]): Promise<void> {
  await runProcess(process.env.FFMPEG_BINARY ?? '/usr/bin/ffmpeg', args);
}

async function probeDuration(file: string): Promise<number> {
  const ffmpeg = process.env.FFMPEG_BINARY ?? '/usr/bin/ffmpeg';
  const ffprobe = process.env.FFPROBE_BINARY ?? path.join(path.dirname(ffmpeg), 'ffprobe');
  const output = await runProcess(ffprobe, ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file]);
  const seconds = Number(output);
  if (!Number.isFinite(seconds) || seconds <= 0) throw new Error('ffprobe returned an invalid narration duration');
  return seconds;
}

function ffconcat(value: string): string {
  return value.replace(/'/g, "'\\''");
}

export async function writeNarrationAssets(projectDir: string, script: string, _durationMinutes: number): Promise<{ narration: string; captions: string }> {
  await fs.mkdir(projectDir, { recursive: true });
  const chunks = splitNarration(script);
  if (chunks.length === 0) throw new Error('script is empty');
  const parts: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const file = path.join(projectDir, `voice-${String(i + 1).padStart(2, '0')}.wav`);
    await fs.writeFile(file, await generateNarration(chunks[i]));
    parts.push(file);
  }
  const narration = path.join(projectDir, 'narration.wav');
  if (parts.length === 1) {
    await fs.rename(parts[0], narration);
  } else {
    const manifest = path.join(projectDir, 'voice-parts.txt');
    await fs.writeFile(manifest, parts.map((file) => `file '${ffconcat(file)}'`).join('\n'), 'utf8');
    await runFfmpeg(['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', manifest, '-c:a', 'pcm_s16le', narration]);
    await Promise.all(parts.map((file) => fs.rm(file, { force: true })));
    await fs.rm(manifest, { force: true });
  }
  const narrationSeconds = await probeDuration(narration);
  const captions = path.join(projectDir, 'captions.srt');
  await fs.writeFile(captions, buildCaptionTrack(script, narrationSeconds), 'utf8');
  return { narration, captions };
}
