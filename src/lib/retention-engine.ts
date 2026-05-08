// Maps a target duration to a retention curve plan with chapter beats.

export interface RetentionBeat {
  timestamp: string;
  beat: string;
  goal: string;
}

export function planRetention(durationMinutes: number): RetentionBeat[] {
  const totalSeconds = Math.max(60, Math.round(durationMinutes * 60));
  const beats: RetentionBeat[] = [];
  const fractions: Array<[number, string, string]> = [
    [0.0, 'Hook', 'Earn the next 30 seconds with a concrete promise'],
    [0.05, 'Setup', 'Frame the problem in one sentence'],
    [0.15, 'First micro-payoff', 'Deliver the first useful insight'],
    [0.3, 'Tension', 'Introduce the counter-intuitive point'],
    [0.5, 'Mid payoff', 'Resolve the tension with evidence'],
    [0.7, 'Case', 'Concrete example or scene-by-scene illustration'],
    [0.85, 'Synthesis', 'Tie everything to the viewer promise'],
    [0.95, 'Action step', 'One specific next move the viewer can take'],
    [1.0, 'Outro', 'Soft CTA to subscribe and watch the next video']
  ];
  for (const [frac, beat, goal] of fractions) {
    const sec = Math.round(totalSeconds * frac);
    const mm = Math.floor(sec / 60).toString().padStart(2, '0');
    const ss = (sec % 60).toString().padStart(2, '0');
    beats.push({ timestamp: `${mm}:${ss}`, beat, goal });
  }
  return beats;
}
