# Deployment

## Vercel

The app is Next.js App Router. To deploy on Vercel:

1. Connect the repository.
2. Set the same env vars as `.env.example`.
3. Provide a managed PostgreSQL database for `DATABASE_URL`.
4. Optional: provide a managed Redis URL via `REDIS_URL` for the worker queue.

## Docker

```bash
docker compose up --build
```

`docker-compose.yml` provisions PostgreSQL, Redis, and the app service on port 3000.

## Workers

A worker process consumes the Redis queue for FFmpeg assembly, YouTube uploads, and analytics ingestion. The worker enforces:

- Allowlisted input paths
- Sanitized arguments
- No shell interpolation
- Per-user, per-project storage prefixes

## Env vars

See `.env.example`. Disabled-safe defaults apply when YouTube, Stripe, or AI keys are absent.

## Monitoring

Recommended: structured logs, Sentry-compatible error reporting, and uptime checks for `/api/health`.

## Backups

Daily database snapshots. Encrypted refresh tokens for YouTube OAuth must be backed up with an additional layer of encryption-at-rest.
