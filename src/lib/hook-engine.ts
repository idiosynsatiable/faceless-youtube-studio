// Hook & retention engine. Returns ethical retention scaffolding.

export interface HookPlan {
  fiveSecondHook: string;
  thirtySecondStructure: string[];
  openLoop: string;
  payoffSchedule: string[];
  patternInterrupts: string[];
  curiosityResets: string[];
  chapterPacing: string[];
  viewerPromise: string;
  retentionRisks: string[];
  ethicalTitleAlignment: string;
}

export interface HookInput {
  title: string;
  audience: string;
  format: string;
  durationMinutes: number;
}

export function buildHookPlan(input: HookInput): HookPlan {
  const cleanTitle = input.title.replace(/\?+$/, '').trim();
  return {
    fiveSecondHook:
      `For ${input.audience}: in the next ${Math.min(8, Math.max(5, Math.round(input.durationMinutes / 1.5)))} minutes you'll see the part of "${cleanTitle}" that most videos skip - using only verifiable points.`,
    thirtySecondStructure: [
      'Concrete promise stated plainly',
      'Why this episode is different (one line)',
      'Single tease of the most surprising point',
      'Roadmap of three sections',
      'Begin section one without filler'
    ],
    openLoop: `What changes once you understand the framework behind "${cleanTitle}".`,
    payoffSchedule: [
      'Mini payoff at 25%',
      'Mini payoff at 50%',
      'Main payoff at 75%',
      'Action step at 95%'
    ],
    patternInterrupts: [
      'Bullet recap card every 60-90s',
      'B-roll switch with motion at every transition',
      'On-screen number callouts during data points',
      'Lower-third question prompts at every chapter'
    ],
    curiosityResets: [
      'Mid-video question to the viewer',
      'Counter-intuitive line every 2 minutes',
      'Recap before each new chapter'
    ],
    chapterPacing: [
      'Chapter 1: setup - 0:00 to 1:30',
      'Chapter 2: framework - 1:30 to 4:00',
      'Chapter 3: case - 4:00 to 6:00',
      'Chapter 4: action step - 6:00 to end'
    ],
    viewerPromise: `By the end you'll be able to explain "${cleanTitle}" clearly and decide your next concrete step.`,
    retentionRisks: [
      'Avoid long preamble',
      'Avoid jargon without immediate definition',
      'Avoid dramatic music covering narration',
      'Avoid teasing payoff for too long without micro-payoffs'
    ],
    ethicalTitleAlignment:
      'Title must match the actual content shown. Do not promise outcomes the video does not deliver. Do not invent statistics. Do not impersonate experts.'
  };
}
