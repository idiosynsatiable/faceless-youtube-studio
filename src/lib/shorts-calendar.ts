// Shorts calendar engine. Quality-first cadence with explicit refusal to
// recommend spam, duplicates, mass low-effort uploads, or fake engagement.

export type ChannelStage = 'new' | 'growing' | 'established';
export type ProductionCapacity = 'low' | 'medium' | 'high';

export interface ShortsCadenceInput {
  niche: string;
  audience: string;
  region?: string;
  channelStage: ChannelStage;
  productionCapacity: ProductionCapacity;
  longFormPerWeek?: number;
  availableShorts?: number;
  audienceFatigueSignal?: 'low' | 'medium' | 'high';
  startDate?: string;
  weeks?: number;
  topicClusters?: string[];
}

export interface CadenceRecommendation {
  recommendedShortsPerDay: number;
  recommendedShortsPerWeek: number;
  longFormSupportRatio: number;
  standaloneRatio: number;
  idealPublishWindowsLocalTime: string[];
  qualityWarning: string;
  saturationWarning: string;
  backlogTarget: number;
  policyNote: string;
}

export interface ShortsCalendarItem {
  date: string;
  publishWindow: string;
  type: 'long_form_support' | 'standalone' | 'comment_response' | 'long_form';
  topicCluster: string;
  title: string;
  notes: string;
}

export interface ShortsCalendarOutput {
  cadence: CadenceRecommendation;
  daily: ShortsCalendarItem[];
  weekly: { weekStart: string; items: ShortsCalendarItem[]; clusterMix: Record<string, number> }[];
  warnings: string[];
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

function defaultClusters(niche: string): string[] {
  const base = niche.replace(/\s+/g, ' ').toLowerCase();
  return [
    `${base} basics`,
    `${base} myths vs fact`,
    `${base} compare`,
    `${base} mistakes to avoid`,
    `${base} 60-second framework`
  ];
}

function publishWindows(region: string): string[] {
  if (region.toUpperCase() === 'US') return ['12:30', '17:30', '20:30'];
  return ['08:00', '12:30', '19:30'];
}

function recommendCadence(input: ShortsCadenceInput): CadenceRecommendation {
  const stage = input.channelStage;
  const capacity = input.productionCapacity;
  const fatigue = input.audienceFatigueSignal ?? 'low';

  let perDay = 1;
  if (stage === 'new' && capacity !== 'low') perDay = capacity === 'high' ? 2 : 1;
  if (stage === 'growing') perDay = capacity === 'high' ? 3 : capacity === 'medium' ? 2 : 1;
  if (stage === 'established') perDay = capacity === 'high' ? 3 : capacity === 'medium' ? 2 : 1;
  if (fatigue === 'high') perDay = Math.max(1, perDay - 1);

  const perWeek = perDay * 7;
  const longFormSupportRatio = stage === 'new' ? 0.6 : stage === 'growing' ? 0.5 : 0.4;
  const standaloneRatio = 1 - longFormSupportRatio;

  const qualityWarning =
    capacity === 'low' && perDay > 1
      ? 'Production capacity is low. Reduce to 1 high-quality Short per day before adding cadence.'
      : 'Quality first. Skip a slot rather than publish a duplicate or low-effort Short.';

  const saturationWarning =
    fatigue === 'high'
      ? 'Audience fatigue detected. Pause same-cluster Shorts for 48 hours and run a different angle.'
      : perDay >= 3
        ? 'When publishing 3+ per day, every Short must be meaningfully distinct. Repeats are flagged automatically.'
        : 'Cadence within sustainable range.';

  return {
    recommendedShortsPerDay: perDay,
    recommendedShortsPerWeek: perWeek,
    longFormSupportRatio,
    standaloneRatio,
    idealPublishWindowsLocalTime: publishWindows(input.region ?? 'US'),
    qualityWarning,
    saturationWarning,
    backlogTarget: perWeek * 2,
    policyNote:
      'No spam, no duplicates, no fake engagement, no bots. Cadence prioritizes retention, niche consistency, and audience fatigue signals.'
  };
}

function detectRepetition(items: ShortsCalendarItem[]): string[] {
  const warnings: string[] = [];
  const byCluster = new Map<string, number>();
  for (const item of items) {
    byCluster.set(item.topicCluster, (byCluster.get(item.topicCluster) ?? 0) + 1);
  }
  for (const [cluster, count] of byCluster.entries()) {
    if (count >= 5) {
      warnings.push(`Cluster "${cluster}" appears ${count} times in this window. Rotate angles to avoid audience fatigue.`);
    }
  }
  // Detect identical titles in adjacent days.
  for (let i = 1; i < items.length; i++) {
    if (items[i - 1].title === items[i].title) {
      warnings.push(`Duplicate title detected on ${items[i].date}. Refusing to recommend duplicates - rewrite this slot.`);
    }
  }
  return warnings;
}

export function planShortsCalendar(input: ShortsCadenceInput): ShortsCalendarOutput {
  const start = input.startDate ?? new Date().toISOString().slice(0, 10);
  const weeks = Math.max(1, Math.min(12, input.weeks ?? 4));
  const cadence = recommendCadence(input);
  const clusters = (input.topicClusters && input.topicClusters.length > 0) ? input.topicClusters : defaultClusters(input.niche);
  const daily: ShortsCalendarItem[] = [];
  const longFormPerWeek = Math.max(0, Math.min(4, input.longFormPerWeek ?? 1));

  for (let day = 0; day < weeks * 7; day++) {
    const date = addDays(start, day);
    const dow = new Date(date + 'T12:00:00Z').getUTCDay();
    const slots = cadence.recommendedShortsPerDay;
    for (let s = 0; s < slots; s++) {
      const cluster = clusters[(day + s) % clusters.length];
      const useLongFormSupport = (day + s) % Math.max(2, Math.round(1 / Math.max(0.1, cadence.longFormSupportRatio))) === 0;
      const type: ShortsCalendarItem['type'] = useLongFormSupport ? 'long_form_support' : 'standalone';
      const title = type === 'long_form_support'
        ? `${cluster} - cut from this week's long-form`
        : `${cluster} - standalone angle ${s + 1}`;
      daily.push({
        date,
        publishWindow: cadence.idealPublishWindowsLocalTime[s % cadence.idealPublishWindowsLocalTime.length],
        type,
        topicCluster: cluster,
        title,
        notes: type === 'long_form_support'
          ? 'Pinned comment links to the long-form. Description repeats CTA with disclosure block.'
          : 'Distinct angle. Avoid repeating beats from earlier Shorts in this cluster.'
      });
    }
    if (longFormPerWeek > 0 && (dow === 2 || (longFormPerWeek > 1 && dow === 5))) {
      daily.push({
        date,
        publishWindow: '17:00',
        type: 'long_form',
        topicCluster: clusters[(day) % clusters.length],
        title: `${input.niche} long-form for ${input.audience}`,
        notes: 'Hero video for the week. Drives Shorts cluster for the next 7 days.'
      });
    }
  }

  // Group into weeks.
  const weekly: ShortsCalendarOutput['weekly'] = [];
  for (let w = 0; w < weeks; w++) {
    const weekStart = addDays(start, w * 7);
    const items = daily.filter((d) => {
      const di = Math.round((new Date(d.date + 'T12:00:00Z').getTime() - new Date(weekStart + 'T12:00:00Z').getTime()) / 86_400_000);
      return di >= 0 && di < 7;
    });
    const clusterMix: Record<string, number> = {};
    items.forEach((i) => {
      clusterMix[i.topicCluster] = (clusterMix[i.topicCluster] ?? 0) + 1;
    });
    weekly.push({ weekStart, items, clusterMix });
  }

  const warnings = detectRepetition(daily);
  if (cadence.qualityWarning) warnings.push(cadence.qualityWarning);
  if (cadence.saturationWarning) warnings.push(cadence.saturationWarning);

  return {
    cadence,
    daily,
    weekly,
    warnings
  };
}
