// Converts script text into a scene-by-scene faceless storyboard.

import type { StoryboardInput } from './validators';

export interface StoryboardScene {
  index: number;
  timestampStart: string;
  timestampEnd: string;
  narration: string;
  visualConcept: string;
  assetType: string;
  motionDirection: string;
  caption: string;
  soundDesign: string;
  transition: string;
  retentionPurpose: string;
  assetLicenseRequirement: string;
}

export interface Storyboard {
  title: string;
  totalScenes: number;
  estimatedSeconds: number;
  scenes: StoryboardScene[];
  assetSummary: { type: string; count: number }[];
  licenseChecklist: string[];
}

const ASSET_TYPES = [
  'stock footage',
  'public domain footage',
  'creator-owned footage',
  'screen recording',
  'chart',
  'animated text',
  'generated illustration',
  'map',
  'timeline',
  'data visualization',
  'product screenshot with permission',
  'abstract motion background'
];

function ts(seconds: number): string {
  const mm = Math.floor(seconds / 60).toString().padStart(2, '0');
  const ss = (seconds % 60).toString().padStart(2, '0');
  return `${mm}:${ss}`;
}

function chunkScript(text: string, scenes: number): string[] {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  if (sentences.length <= scenes) {
    while (sentences.length < scenes) sentences.push('Hold on the previous beat with light B-roll.');
    return sentences;
  }
  const chunks: string[] = [];
  const per = Math.ceil(sentences.length / scenes);
  for (let i = 0; i < scenes; i++) {
    chunks.push(sentences.slice(i * per, (i + 1) * per).join(' ').trim());
  }
  return chunks;
}

function pickAsset(i: number): string {
  return ASSET_TYPES[i % ASSET_TYPES.length];
}

function captionFromNarration(narration: string): string {
  const words = narration.split(' ').filter(Boolean);
  return words.slice(0, 6).join(' ').replace(/[.!?,]+$/, '') + (words.length > 6 ? '…' : '');
}

function license(asset: string): string {
  switch (asset) {
    case 'stock footage':
      return 'License from licensed stock library; retain receipt and license terms';
    case 'public domain footage':
      return 'Confirm public domain status with archive citation';
    case 'creator-owned footage':
      return 'Owned by creator; archive original file and capture date';
    case 'screen recording':
      return 'Screen recording of owned account or content with permission';
    case 'product screenshot with permission':
      return 'Written permission from vendor or fair-use documentation';
    case 'generated illustration':
      return 'AI generated, disclose if material to the video';
    default:
      return 'Original or properly licensed asset';
  }
}

export function generateStoryboard(input: StoryboardInput): Storyboard {
  const scenesCount = Math.max(3, Math.min(40, input.scenesTarget));
  const text = input.scriptText.trim();
  const chunks = chunkScript(text, scenesCount);
  const totalSeconds = Math.max(scenesCount * 12, scenesCount * 8);
  const sceneSeconds = Math.round(totalSeconds / scenesCount);
  const scenes: StoryboardScene[] = [];
  const assetCounts: Record<string, number> = {};
  const licenses = new Set<string>();
  for (let i = 0; i < scenesCount; i++) {
    const start = i * sceneSeconds;
    const end = (i + 1) * sceneSeconds;
    const asset = pickAsset(i);
    assetCounts[asset] = (assetCounts[asset] ?? 0) + 1;
    const lic = license(asset);
    licenses.add(lic);
    scenes.push({
      index: i + 1,
      timestampStart: ts(start),
      timestampEnd: ts(end),
      narration: chunks[i] ?? '',
      visualConcept: `Visual that mirrors the narration: ${chunks[i]?.slice(0, 80) ?? ''}`,
      assetType: asset,
      motionDirection: i % 2 === 0 ? 'slow push-in' : 'subtle parallax with caption rise',
      caption: captionFromNarration(chunks[i] ?? ''),
      soundDesign: i === 0 ? 'soft underscore start' : 'underscore continues, light whoosh on transition',
      transition: i === scenesCount - 1 ? 'fade to outro card' : 'cut on motion',
      retentionPurpose:
        i === 0 ? 'lock attention' : i === scenesCount - 1 ? 'hand off to next video' : 'reinforce promise and pace',
      assetLicenseRequirement: lic
    });
  }
  return {
    title: input.title,
    totalScenes: scenesCount,
    estimatedSeconds: totalSeconds,
    scenes,
    assetSummary: Object.entries(assetCounts).map(([type, count]) => ({ type, count })),
    licenseChecklist: Array.from(licenses)
  };
}
