// Queue producer shared by render-only and YouTube publish jobs.

export type UploadAuthorization = 'user_confirmed' | 'owner_autopilot';

export interface UploadJobRequest {
  kind?: 'upload';
  id: string;
  videoProjectId: string;
  userId?: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  scheduledAt?: string;
  enqueuedAt: string;
  authorization: UploadAuthorization;
}

export interface RenderJobRequest {
  kind: 'render';
  id: string;
  userId: string;
  projectId: string;
  title: string;
  durationMinutes: number;
  shortsCount: number;
  storyboardScenes: number;
  style: 'cinematic' | 'cinematic-clean' | 'punchy' | 'documentary';
  enqueuedAt: string;
}

export type PipelineJobRequest = UploadJobRequest | RenderJobRequest;

export function isRenderJobRequest(request: PipelineJobRequest): request is RenderJobRequest {
  return request.kind === 'render';
}

export interface QueueEnqueueResult {
  enqueued: true;
  queueKey?: string;
}

export interface QueueProducer {
  enqueue(request: PipelineJobRequest): Promise<QueueEnqueueResult>;
  close(): Promise<void>;
}

export class QueueDisabledError extends Error {
  readonly reason = 'queue_disabled' as const;
  constructor(message: string) {
    super(message);
    this.name = 'QueueDisabledError';
  }
}

export class InMemoryQueueProducer<T extends PipelineJobRequest = UploadJobRequest> implements QueueProducer {
  readonly enqueued: T[] = [];
  private closed = false;

  async enqueue(request: PipelineJobRequest): Promise<QueueEnqueueResult> {
    if (this.closed) throw new Error('producer closed');
    this.enqueued.push({ ...request } as T);
    return { enqueued: true, queueKey: 'memory:faceless:jobs:upload' };
  }

  async close(): Promise<void> {
    this.closed = true;
  }
}

export function disabledQueueProducer(): QueueProducer {
  return {
    async enqueue() {
      throw new QueueDisabledError(
        'Queue is disabled. Set REDIS_URL and run the FFmpeg worker to enable rendering.'
      );
    },
    async close() {
      // no-op
    }
  };
}

let producerOverride: QueueProducer | null = null;

export function setQueueProducer(producer: QueueProducer | null): void {
  producerOverride = producer;
}

export function getQueueProducer(): QueueProducer {
  if (producerOverride) return producerOverride;
  return disabledQueueProducer();
}
