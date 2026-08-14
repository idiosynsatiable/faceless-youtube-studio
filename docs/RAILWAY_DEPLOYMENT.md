# Railway Production Deployment

## Deployment model

The current rendering pipeline validates local input paths and writes FFmpeg outputs to local directories. On Railway, the web process and queue worker therefore run in **one persistent application service** using the production `Dockerfile`. This is intentional: the application and worker share a single mounted media directory at runtime, so uploaded source assets and generated exports remain available to the same trusted worker process.

> Do not deploy `Dockerfile.worker` as a second Railway service until asset and export storage has been migrated to a shared object-storage backend. Railway volumes are mounted to individual services, while this repository’s current asset and render contracts are filesystem based.

Railway-managed **PostgreSQL** and **Redis** remain separate services. The application service starts Next.js and one FFmpeg worker under a small supervised runtime. It exposes only the web process publicly; the worker consumes Redis jobs in the background and has no public endpoint.

## Railway service layout

| Railway service | Source or template | Required configuration | Purpose |
| --- | --- | --- | --- |
| `studio` | GitHub: `idiosynsatiable/faceless-youtube-studio`, branch `finish/video-maker-e2e` | Root `Dockerfile`, one persistent volume mounted at `/var/lib/faceless-studio`, pre-deploy command `npx prisma migrate deploy` | Next.js application, API routes, asset persistence, FFmpeg rendering, and authorized YouTube upload worker. |
| `postgres` | Railway PostgreSQL template | Default managed connection string | Durable application data, encrypted OAuth refresh-token records, projects, and upload history. |
| `redis` | Railway Redis template | Default managed connection string | Durable render and publishing queue. |

Attach a public Railway domain only to `studio`. The exact public domain is required for both `NEXT_PUBLIC_APP_URL` and the Google OAuth callback registration.

## Studio service settings

Set the source to the feature branch until this work is merged, then switch the source branch to `main`. Railway automatically detects the root `Dockerfile`; no separate start command is needed because the container runs `npm run start:railway`.

Set the health-check path to `/api/health`, use a 300-second health-check timeout, and select an always-restart policy. The application should have a single replica because the attached media volume is part of the current deterministic render workflow. Set one persistent volume with the mount path shown below.

| Setting | Value |
| --- | --- |
| Dockerfile | `Dockerfile` |
| Build source | GitHub repository root |
| Pre-deploy command | `npx prisma migrate deploy` |
| Health-check path | `/api/health` |
| Health-check timeout | `300` seconds |
| Restart policy | `ALWAYS` |
| Replica count | `1` |
| Persistent volume mount path | `/var/lib/faceless-studio` |
| Worker concurrency | `1` initially |

## Environment variables

Create project-level shared variables for values that must be identical across the `studio` process and its worker subprocess. Seal every secret in Railway after entering it. Railway supports shared variables and service references; the syntax below assumes the managed services are named `postgres` and `redis`. Adjust only those two service names if your Railway canvas uses different names.

| Variable | `studio` value | Classification |
| --- | --- | --- |
| `DATABASE_URL` | `${{postgres.DATABASE_URL}}` | Service reference |
| `REDIS_URL` | `${{redis.REDIS_URL}}` | Service reference |
| `NEXT_PUBLIC_APP_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` | Service reference |
| `PORT` | Railway-provided; do not override unless Railway assigns a specific value | Platform runtime |
| `JWT_SECRET` | Unique high-entropy secret | Sealed secret |
| `OAUTH_STATE_SECRET` | Separate unique high-entropy secret | Sealed secret |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | Unique high-entropy secret | Sealed secret |
| `OPERATOR_EMAIL` | Owner-controlled operational email | Private configuration |
| `YOUTUBE_CLIENT_ID` | Google OAuth web-client ID | Private configuration |
| `YOUTUBE_CLIENT_SECRET` | Google OAuth web-client secret | Sealed secret |
| `YOUTUBE_REDIRECT_URI` | `https://YOUR-RAILWAY-DOMAIN/api/youtube/callback` | Private configuration |
| `YOUTUBE_AUTHORIZED_CHANNEL_HANDLE` | `idiosynsatiable` | Channel lock |
| `YOUTUBE_AUTHORIZED_CHANNEL_ID` | Leave blank before first authorization; set the verified immutable ID immediately after it succeeds | Channel lock |
| `WORKER_INPUT_ALLOWLIST` | `/var/lib/faceless-studio/inputs` | Runtime configuration |
| `WORKER_OUTPUT_ROOT` | `/var/lib/faceless-studio/exports` | Runtime configuration |
| `FFMPEG_BINARY` | `/usr/bin/ffmpeg` | Runtime configuration |
| `WORKER_CONCURRENCY` | `1` | Runtime configuration |
| `WORKER_JOB_TIMEOUT_MS` | `900000` | Runtime configuration |

Create the Google OAuth web client only after Railway has generated the `studio` public domain. Register exactly this callback URI in Google Cloud:

```text
https://YOUR-RAILWAY-DOMAIN/api/youtube/callback
```

The Google client’s callback must match `YOUTUBE_REDIRECT_URI` character for character. The application rejects OAuth callbacks with invalid signed state, missing upload permission, or a channel identity that does not resolve to **@idiosynsatiable**.

## Release procedure

Deploy PostgreSQL and Redis first, then configure and deploy the `studio` service. Confirm that `https://YOUR-RAILWAY-DOMAIN/api/health` returns successfully before opening the Release Desk.

Open **Release Desk → YouTube Publishing** and connect the Google identity that owns or manages `@idiosynsatiable`. On success, record the immutable channel ID in `YOUTUBE_AUTHORIZED_CHANNEL_ID`, redeploy the service, and run one **private** test release. Validate that the resulting YouTube video belongs to the approved channel before enabling scheduled or public releases.

The application requires explicit per-video confirmation before it queues a publish request. Immediately before upload, the worker refreshes the stored credential and confirms that it still resolves to the stored immutable ID and the configured `@idiosynsatiable` handle. A mismatch fails closed without initiating an upload.

## Railway operational notes

Railway treats variables as deployment configuration and supports sealed variables for secret values. Its service documentation also supports Dockerfile builds, health checks, and GitHub-driven deployments. Railway volumes are persistent, attached at service runtime, and mounted as `root`; the `studio` image intentionally owns the worker process so both trusted processes use the same single volume instead of relying on an unsupported cross-service media mount.[1][2][3]

## References

[1]: https://docs.railway.com/services "Railway Services"
[2]: https://docs.railway.com/variables "Railway Variables"
[3]: https://docs.railway.com/volumes "Railway Volumes"
[4]: https://developers.google.com/identity/protocols/oauth2/web-server "Google OAuth 2.0 for Web Server Applications"
[5]: https://developers.google.com/youtube/v3/docs/channels/list "YouTube Data API: Channels list"
