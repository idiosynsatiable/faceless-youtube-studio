# Architecture

Faceless YouTube Studio is a Next.js App Router application backed by PostgreSQL via Prisma. The architecture separates pure engines (deterministic TypeScript modules under `src/lib`) from API routes (Next.js Route Handlers under `src/app/api`) and UI pages.

## Modules

Eighteen modules under `src/lib`:

1. `trend-radar.ts` and `trend-sources.ts` — trend ingestion and scoring
2. `demographic-engine.ts` — audience analysis
3. `niche-scorer.ts` and `opportunity-score.ts` — niche and opportunity scoring
4. `idea-engine.ts` — faceless video idea generation
5. `hook-engine.ts` and `retention-engine.ts` — ethical retention scaffolding
6. `script-engine.ts` — voiceover-ready scripts
7. `storyboard-engine.ts` — scene-by-scene faceless storyboards
8. `voiceover-planner.ts` — narration cadence and delivery
9. `asset-planner.ts` — B-roll and asset planning
10. `video-assembler.ts` — FFmpeg pipeline plan + export profiles
11. `caption-engine.ts` — SRT, lower-thirds, chapters, accessibility
12. `metadata-engine.ts` — YouTube metadata package
13. `thumbnail-engine.ts` — titles + thumbnail concepts (no clickbait)
14. `compliance-engine.ts` and `disclaimer-engine.ts` — disclaimers and policy checks
15. `monetization-engine.ts` and `affiliate-disclosure.ts` — revenue and disclosure
16. `growth-strategy.ts` — organic-only subscriber growth
17. `youtube-oauth.ts`, `youtube-upload.ts`, `youtube-analytics.ts` — YouTube Data API abstraction
18. `billing.ts` — Stripe abstraction with constant-time webhook verification

## Routes

Every Route Handler validates inputs with Zod and rejects oversized requests. Disabled-safe routes return `503 integration_disabled` when env vars are absent.

## Data flow

Trend records ingest into Prisma `TrendTopic`. Ideas link to `VideoIdea`. Scripts, storyboards, metadata, compliance, and monetization JSON live on `VideoProject`. Upload jobs persist in `UploadJob`. Analytics snapshots live in `AnalyticsSnapshot`. All export deliverables live in `ExportFile`.

## Workers

Long-running tasks (FFmpeg assembly, YouTube uploads, analytics ingestion) are designed for a worker process consuming a Redis queue (`REDIS_URL`). The architecture documents the queue boundary; routes never run shell commands.

## Storage

Generated exports are stored in `ExportFile` rows and (in production) in object storage. The architecture documents per-user, per-project paths and access rules.

## Integrations

- YouTube Data API (OAuth 2.0, upload, analytics) — disabled-safe by default
- Stripe (subscription checkout, webhook signatures) — disabled-safe by default
- OpenAI-compatible AI providers — optional; engines run rule-based when disabled
- Resend email — architecture-only, disabled-safe by default
