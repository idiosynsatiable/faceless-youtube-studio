// Voiceover planning. Splits a script into lines that match faceless narration cadence.

export interface VoiceoverLine {
  index: number;
  text: string;
  approximateSeconds: number;
  delivery: 'calm' | 'energetic' | 'matter-of-fact';
  emphasis: string[];
}

export interface VoiceoverPlan {
  totalLines: number;
  estimatedDurationSeconds: number;
  lines: VoiceoverLine[];
  delivery: 'calm' | 'energetic' | 'matter-of-fact';
  recordingNotes: string[];
}

function emphasisFor(text: string): string[] {
  const words = text.replace(/[^a-zA-Z0-9 ]/g, '').split(' ').filter(Boolean);
  return words.filter((w) => w.length > 6).slice(0, 3);
}

export function planVoiceover(text: string, tone: string): VoiceoverPlan {
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter(Boolean);
  const lines: VoiceoverLine[] = [];
  let total = 0;
  let delivery: VoiceoverPlan['delivery'] = 'matter-of-fact';
  if (tone.includes('calm') || tone.includes('document')) delivery = 'calm';
  if (tone.includes('energetic') || tone.includes('high-retention') || tone.includes('punchy')) delivery = 'energetic';
  sentences.forEach((s, i) => {
    const wordCount = s.split(' ').length;
    const seconds = Math.max(2, Math.round(wordCount / 2.5));
    total += seconds;
    lines.push({
      index: i + 1,
      text: s.trim(),
      approximateSeconds: seconds,
      delivery,
      emphasis: emphasisFor(s)
    });
  });
  return {
    totalLines: lines.length,
    estimatedDurationSeconds: total,
    lines,
    delivery,
    recordingNotes: [
      'Record in a treated space with consistent mic distance',
      'Leave 1.5s of silence between takes for clean editing',
      'Re-record any line that contains an unverified claim until that claim is verified or removed',
      'Disclose AI voice if used, when material to the video'
    ]
  };
}
