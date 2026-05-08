// Caption / subtitle plan generation.

import type { Storyboard } from './storyboard-engine';

export interface CaptionPlan {
  srt: string;
  shortCaptions: string[];
  emphasisWords: string[];
  lowerThirdSuggestions: string[];
  chapterTitles: string[];
  accessibilityNotes: string[];
}

function pad(n: number, width: number): string {
  return n.toString().padStart(width, '0');
}

function toSrtTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${pad(h, 2)}:${pad(m, 2)}:${pad(s, 2)},000`;
}

function emphasis(text: string): string[] {
  const words = text.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  return Array.from(new Set(words.filter((w) => w.length >= 6))).slice(0, 8);
}

export function generateCaptions(storyboard: Storyboard): CaptionPlan {
  const lines: string[] = [];
  const shortCaptions: string[] = [];
  const lowerThirds: string[] = [];
  const chapters: string[] = [];
  let cursor = 0;
  storyboard.scenes.forEach((scene, idx) => {
    const startSec = cursor;
    cursor += Math.max(6, Math.round(storyboard.estimatedSeconds / storyboard.totalScenes));
    const endSec = cursor;
    const block = `${idx + 1}\n${toSrtTime(startSec)} --> ${toSrtTime(endSec)}\n${scene.narration}\n`;
    lines.push(block);
    shortCaptions.push(scene.caption);
    if (idx % Math.max(1, Math.round(storyboard.totalScenes / 4)) === 0) {
      const chapterTime = `${pad(Math.floor(startSec / 60), 2)}:${pad(startSec % 60, 2)}`;
      chapters.push(`${chapterTime} ${scene.visualConcept.slice(0, 40)}`);
    }
    if (idx % 3 === 0) lowerThirds.push(scene.caption);
  });
  return {
    srt: lines.join('\n'),
    shortCaptions,
    emphasisWords: emphasis(shortCaptions.join(' ')),
    lowerThirdSuggestions: lowerThirds,
    chapterTitles: chapters,
    accessibilityNotes: [
      'Caption every spoken word, including narrator and any on-camera dialogue',
      'Describe critical visual changes with bracketed captions when relevant',
      'Maintain at least 4.5:1 contrast for burned-in caption styles'
    ]
  };
}
