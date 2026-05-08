// YouTube upload preparation and dispatch.
// Never simulates a successful upload when the integration is disabled.
// Never publishes without explicit user authorization passed by the route.

import type { UploadPrepareInput, UploadPublishInput } from './validators';
import { config } from './config';
import { safeFilename } from './security';

export type UploadStatus =
  | 'draft_ready'
  | 'private_uploaded'
  | 'scheduled'
  | 'published'
  | 'failed'
  | 'needs_review';

export interface UploadPackage {
  filename: string;
  title: string;
  description: string;
  tags: string[];
  category: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  scheduledAt?: string;
  playlistId?: string;
  thumbnailKey?: string;
  status: UploadStatus;
  warnings: string[];
}

export function preparePackage(input: UploadPrepareInput): UploadPackage {
  const warnings: string[] = [];
  if (input.title.length > 100) warnings.push('Title exceeds 100 characters');
  if (input.tags.length > 25) warnings.push('More than 25 tags - YouTube ignores excess tags');
  if (input.privacyStatus === 'public' && !input.scheduledAt) warnings.push('Public publish requires explicit user confirmation - upload will be sent as private until confirmed');
  return {
    filename: safeFilename(input.title, 'video-package'),
    title: input.title,
    description: input.description,
    tags: input.tags,
    category: input.category,
    privacyStatus: input.privacyStatus,
    scheduledAt: input.scheduledAt,
    playlistId: input.playlistId,
    thumbnailKey: input.thumbnailKey,
    status: 'draft_ready',
    warnings
  };
}

export interface PublishOutcome {
  status: UploadStatus;
  reason?: 'integration_disabled' | 'authorization_required' | 'enqueued';
  message: string;
  package?: UploadPackage;
}

export function publishOutcome(input: UploadPublishInput, draft: UploadPackage): PublishOutcome {
  if (!config.youtube.enabled) {
    return {
      status: 'needs_review',
      reason: 'integration_disabled',
      message: 'YouTube OAuth is not configured. Connect a YouTube account before publishing.',
      package: { ...draft, privacyStatus: input.privacyStatus, status: 'needs_review' }
    };
  }
  if (input.authorization !== 'user_confirmed') {
    return {
      status: 'needs_review',
      reason: 'authorization_required',
      message: 'Explicit user authorization is required to publish. Pass authorization=user_confirmed only after the user clicks Publish.'
    };
  }
  return {
    status: 'private_uploaded',
    reason: 'enqueued',
    message: 'Upload enqueued for the worker. Publish will only happen after the YouTube API confirms a successful private upload.',
    package: {
      ...draft,
      privacyStatus: input.privacyStatus,
      scheduledAt: input.scheduledAt ?? draft.scheduledAt,
      status: input.scheduledAt ? 'scheduled' : 'private_uploaded'
    }
  };
}
