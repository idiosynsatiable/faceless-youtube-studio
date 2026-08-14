import type { UploadPrivacyStatus } from './youtube-uploader';

export interface ShortOutputLike {
  profile: string;
  absolutePath: string;
}

export interface ShortUploadPlan {
  index: number;
  filePath: string;
  title: string;
  description: string;
  tags: string[];
  privacyStatus: UploadPrivacyStatus;
  scheduledAt?: string;
}

function titleFor(baseTitle: string, index: number, total: number): string {
  const suffix = total > 1 ? ` | Quick Take ${index + 1} #Shorts` : ' #Shorts';
  const maxBase = Math.max(1, 100 - suffix.length);
  return `${baseTitle.trim().slice(0, maxBase).trim()}${suffix}`.slice(0, 100);
}

function descriptionFor(baseDescription: string): string {
  const clean = baseDescription.trim();
  const suffix = '#Shorts';
  if (!clean) return suffix;
  if (/#[Ss]horts\b/.test(clean)) return clean;
  return `${clean}\n\n${suffix}`;
}

function tagsFor(tags: string[]): string[] {
  const seen = new Set<string>();
  const output: string[] = [];
  for (const raw of [...tags, 'Shorts']) {
    const tag = raw.trim();
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    output.push(tag);
  }
  return output.slice(0, 30);
}

export function planAutonomousShortUploads(args: {
  outputs: ShortOutputLike[];
  baseTitle: string;
  baseDescription: string;
  tags: string[];
  parentPrivacyStatus: UploadPrivacyStatus;
  parentScheduledAt?: string;
  maxShorts: number;
  spacingHours: number;
  now?: Date;
}): ShortUploadPlan[] {
  const shorts = args.outputs
    .filter((output) => output.profile === 'YouTube Shorts 9:16')
    .slice(0, Math.max(0, args.maxShorts));
  if (shorts.length === 0) return [];

  const now = args.now ?? new Date();
  const anchorMs = args.parentScheduledAt
    ? Math.max(now.getTime(), new Date(args.parentScheduledAt).getTime())
    : now.getTime();
  const shouldSchedulePublic = args.parentPrivacyStatus === 'public';
  const spacingMs = Math.max(1, args.spacingHours) * 60 * 60 * 1000;

  return shorts.map((output, index) => ({
    index,
    filePath: output.absolutePath,
    title: titleFor(args.baseTitle, index, shorts.length),
    description: descriptionFor(args.baseDescription),
    tags: tagsFor(args.tags),
    // YouTube scheduling requires a private upload with publishAt.
    privacyStatus: shouldSchedulePublic ? 'private' : args.parentPrivacyStatus,
    scheduledAt: shouldSchedulePublic
      ? new Date(anchorMs + spacingMs * (index + 1)).toISOString()
      : undefined
  }));
}
