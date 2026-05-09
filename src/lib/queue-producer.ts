// Queue producer for upload publish requests.
//
// The /api/uploads/publish route uses this to enqueue a request after
// validating the user's explicit authorization. The default producer is
// "disabled-safe" — it throws QueueDisabledError. Operators replace the
// default at deploy time by calling setQueueProducer() from a bootstrap
// module that wires up a real Redis-backed producer (see
// docs/FFMPEG_WORKER.md → QueueProducer contract).
//
// The worker then pops these UploadJobRequest records, hydrates them into
// full AssemblyJob records by reading the VideoProject from the database,
// and runs the pipeline via runAssemblyJob (src/worker/job-runner.ts).
//
// Tests use InMemoryQueueProducer to capture enqueued requests.

export interface UploadJobRequest {
  id: string;
  videoProjectId: string;
  userId?: string;
  privacyStatus: 'private' | 'unlisted' | 'public';
  scheduledAt?: string;
  enqueuedAt: string;
  authorization: 'user_confirmed';
}

export interface QueueEnqueueResult {
  enqueued: true;
  queueKey?: string;
}

export interface QueueProducer {
  enqueue(request: UploadJobRequest): Promise<QueueEnqueueResult>;
  close(): Promise<void>;
}

export class QueueDisabledError extends Error {
  readonly reason = 'queue_disabled' as const;
  constructor(message: string) {
    super(message);
    this.name = 'QueueDisabledError';
  }
}

export class InMemoryQueueProducer implements QueueProducer {
  readonly enqueued: UploadJobRequest[] = [];
  private closed = false;

  async enqueue(request: UploadJobRequest): Promise<QueueEnqueueResult> {
    if (this.closed) throw new Error('producer closed');
    this.enqueued.push({ ...request });
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
        'Queue is disabled. Set REDIS_URL and wire a QueueProducer (see docs/FFMPEG_WORKER.md).'
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
