# FFmpeg worker

The FFmpeg worker is the long-running process that consumes upload jobs from a Redis queue, runs the 6-stage pipeline documented in `src/lib/video-assembler.ts`, and writes export outputs to disk. It runs **outside Vercel** — typically on Railway, Fly, Render, or your own container host — because Vercel Functions have hard runtime and memory limits incompatible with video assembly.

## Why a separate worker?

- Video assembly is CPU-bound and frequently runs minutes per job.
- Streaming uploads to YouTube Data API takes more bandwidth than serverless functions are sized for.
- The pipeline must run in a sandboxed container with read-only inputs, no shell, and a strict argv allowlist. This is incompatible with the on-demand Function model.

## Module layout

```
src/worker/
  types.ts          # AssemblyJob, JobOutcome, WorkerConfig
  path-allowlist.ts # validateInputPath, safeJoinUnderRoot
  ffmpeg-args.ts    # buildPipeline + safeArg / safeArgs helpers
  spawn.ts          # realSpawn wrapper around node:child_process.spawn (shell:false)
  queue.ts          # QueueAdapter contract + InMemoryQueueAdapter for tests
  job-runner.ts     # runAssemblyJob orchestrator
  index.ts          # entry point, env loading, shutdown handlers
```

`src/lib/video-assembler.ts` continues to own the planning side (deterministic, framework-free). The worker consumes the resulting `AssemblyPlan` plus a list of validated inputs and turns it into a sequence of safe argv arrays.

## Pipeline → argv mapping

The 6 stages from `video-assembler.ts` map 1:1 to the worker:

| Stage | Worker function | Result |
|---|---|---|
| 1. validate input asset paths against allowlist | `validateInputPath` | resolves and confirms each input lives under `WORKER_INPUT_ALLOWLIST` |
| 2. normalize all assets to a common codec | `buildNormalizeArgs` | one ffmpeg invocation per input → `<workDir>/input_<n>.normalized.mp4` |
| 3. assemble timeline with concat demuxer | `buildConcatArgs` + `buildConcatListContent` | writes a sanitized concat list, runs ffmpeg with `-f concat -safe 0` |
| 4. overlay captions and lower-thirds | `buildOverlayArgs` | runs ffmpeg with the `subtitles=` filter pointing at the work-dir SRT |
| 5. export master + Shorts + previews | `buildExportArgs` | one ffmpeg invocation per export profile in the AssemblyPlan |
| 6. write outputs to per-user/per-project paths | `runAssemblyJob` | mkdir under `WORKER_OUTPUT_ROOT/<userId>/<projectId>/` |

## Security model

- **No shell.** Every spawn uses `child_process.spawn(cmd, args, { shell: false })`. We never join arguments into a string.
- **Argv allowlist.** Every flag passed to ffmpeg must be in `FFMPEG_FLAG_ALLOWLIST` (see `ffmpeg-args.ts`). Unknown flags throw `UnsafeArgumentError`. This blocks flag injection — a user-supplied path that starts with `-` cannot pose as a flag.
- **Shell metacharacter rejection.** `safeArg` rejects any value containing `;`, `|`, `&`, `` ` ``, `$`, `<`, `>`, `\\`, `\n`, `\r`, `"`, `'`. The concat-list generator is the one place a single quote is allowed inside a quoted form, and it is escaped per ffmpeg's own concat docs (`'\\''`).
- **Path allowlist.** Every input path runs through `validateInputPath` against `WORKER_INPUT_ALLOWLIST`. Outputs go through `safeJoinUnderRoot(WORKER_OUTPUT_ROOT, ...)`. Path traversal (`..`), absolute escapes, and embedded null bytes are refused.
- **Symlink resolution.** Operators should mount the inputs directory with `nosymlinks` or call `fs.realpathSync` after validation and re-check the resolved path. Containers should avoid mounting paths that contain symlinks pointing outside the inputs root.
- **Container hardening.** The provided `Dockerfile.worker` runs as a non-root user (uid 10001), sets the inputs mount read-only at the host level, mounts only the necessary directories, drops Linux capabilities, and uses tini for signal handling.
- **Network isolation.** The worker only needs to reach the YouTube Data API for the upload step. Run it with an egress allowlist that permits `youtube.googleapis.com` and your queue host; deny everything else.
- **Quota-friendly behaviour.** YouTube uploads are private by default. The publish API route already requires `authorization=user_confirmed`; the worker performs upload only after the route enqueues a job.

## Running the worker

Locally for development (no real Redis):

```bash
npm install
WORKER_OUTPUT_ROOT=$PWD/.worker/outputs \
WORKER_INPUT_ALLOWLIST=$PWD/.worker/inputs \
FFMPEG_BINARY=$(which ffmpeg) \
npx tsx src/worker/index.ts
```

The default queue adapter throws a clear error pointing here if you don't wire up Redis. For local testing, import `InMemoryQueueAdapter` from `src/worker/queue.ts` and feed it jobs by hand.

In production (Docker):

```bash
docker build -f Dockerfile.worker -t faceless-youtube-studio-worker .
docker run --rm \
  -e REDIS_URL=redis://redis:6379 \
  -v /srv/faceless/inputs:/var/lib/faceless-studio/inputs:ro \
  -v /srv/faceless/exports:/var/lib/faceless-studio/exports:rw \
  faceless-youtube-studio-worker
```

The worker reads `WORKER_OUTPUT_ROOT`, `WORKER_INPUT_ALLOWLIST` (comma-separated absolute prefixes), `FFMPEG_BINARY`, `WORKER_CONCURRENCY`, and `WORKER_JOB_TIMEOUT_MS` from env. All of those have sensible defaults baked into the Dockerfile.

## QueueAdapter contract

We do not bundle a Redis client because the operator chooses their stack (`redis`, `ioredis`, Upstash REST). Implement the four methods on `QueueAdapter`:

- `pop(timeoutMs)` — block on `BLPOP <queueKey> <timeoutSec>`. Parse the JSON value, validate against `AssemblyJob`, return it.
- `ack(outcome)` — store the result (HSET / Postgres / object storage) and notify subscribers.
- `nack(jobId, errorMessage, retryable)` — re-enqueue with backoff if `retryable` is true; otherwise dead-letter.
- `close()` — call once on SIGTERM. Idempotent.

A real adapter sketch (using `redis`):

```ts
import { createClient } from 'redis';
import type { QueueAdapter } from '@/worker/queue';
import type { AssemblyJob, JobOutcome } from '@/worker/types';

export function redisQueueAdapter(url: string, queueKey = 'faceless:jobs:upload'): QueueAdapter {
  const client = createClient({ url });
  client.on('error', (err) => console.error('redis', err));
  void client.connect();
  return {
    async pop(timeoutMs = 5000) {
      const v = await client.blPop(queueKey, Math.max(1, Math.round(timeoutMs / 1000)));
      return v ? (JSON.parse(v.element) as AssemblyJob) : null;
    },
    async ack(outcome: JobOutcome) {
      await client.hSet('faceless:jobs:result', outcome.jobId, JSON.stringify(outcome));
      await client.publish('faceless:jobs:result:notify', outcome.jobId);
    },
    async nack(jobId, errorMessage, retryable) {
      if (retryable) {
        await client.zAdd('faceless:jobs:retry', { score: Date.now() + 30_000, value: jobId });
      } else {
        await client.lPush('faceless:jobs:dead', JSON.stringify({ jobId, errorMessage }));
      }
    },
    async close() {
      await client.quit();
    }
  };
}
```

Pass the adapter in `runWorkerLoop({ adapter })` instead of relying on the default. The worker's `index.ts` is intentionally a small wrapper so you can replace it with your own bootstrap.

## Testing

Three Vitest suites cover the worker without touching ffmpeg:

- `tests/worker-path-allowlist.test.ts` — exercises `validateInputPath` and `safeJoinUnderRoot` against traversal, null bytes, absolute escapes.
- `tests/worker-ffmpeg-args.test.ts` — confirms every produced argv contains no shell metacharacters, every flag is in the allowlist, the concat list is properly escaped, and the export profiles map to the right argv.
- `tests/worker-job-runner.test.ts` — drives `runAssemblyJob` with a mock `spawn` that records every invocation. Tests rejection paths (bad input path, unsafe argument), happy path (5 export profiles → 5 spawns), and ffmpeg failure propagation.

Run them with `npm test`. They produce no temporary files outside the test sandbox.

## Observability

Recommended:

- Structured JSON logs from `runWorkerLoop` (the default uses plain text — wrap `log` to emit JSON).
- Sentry-compatible error reporting with the job id as a tag.
- Per-job metrics (stage durations, output bytes) emitted to Prometheus or your APM.
- A `/healthz` endpoint on a sidecar HTTP server for liveness/readiness probes.

## Backpressure

The default `WORKER_CONCURRENCY=1` means the worker processes one job at a time and reads from Redis with a 5-second BLPOP timeout in between. Increase concurrency by spawning multiple `runWorkerLoop` calls in the same process or by running multiple worker containers. Match concurrency to the number of vCPUs available; FFmpeg saturates a single core per job by default (`-preset medium`).

## Common errors

| Symptom | Cause | Fix |
|---|---|---|
| `UnsafeArgumentError: shell metacharacter ...` | Input path contains a forbidden character | Reject the upload; never sanitize by stripping — the user's filename is wrong |
| `UnsafeArgumentError: flag not in allowlist: -X` | Plan or input introduced a new flag | Update `FFMPEG_FLAG_ALLOWLIST` only after security review |
| `input rejected: ... (absolute_outside_allowlist)` | Asset is outside the inputs mount | Move the asset into the allowlisted prefix or extend `WORKER_INPUT_ALLOWLIST` |
| `spawn timed out after 900000ms` | A single ffmpeg invocation took longer than `WORKER_JOB_TIMEOUT_MS` | Raise the timeout deliberately, or split the job into shorter clips |
| `Redis queue adapter is not bundled.` | You started the worker without wiring a real adapter | Implement `redisQueueAdapter` (see above) and pass it to `runWorkerLoop` |
