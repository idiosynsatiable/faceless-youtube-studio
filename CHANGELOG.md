# Changelog

All notable changes to Faceless YouTube Studio are documented here. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.1] — 2026-05-08

### Security

- **Bumped `next` from 14.2.15 to 14.2.35** — patches the December 11, 2025 Next.js security advisory.
  - **CVE-2025-55184** (Denial of Service, CVSS 7.5 / High): a malformed HTTP request can put the Next.js server into an infinite loop, hanging the process. Affected applications use the App Router with React Server Components — Faceless YouTube Studio uses the App Router for every page and API route, so this advisory applied directly.
  - **CVE-2025-55183** (Source code exposure, CVSS 5.3 / Medium): a malformed request can leak the compiled body of a Server Function. The studio does not rely on Server Functions / Server Actions in this 1.0 release, so the practical exposure was limited; the upgrade still hardens against forward changes.
  - **CVE-2025-67779** (Initial fix completion): Next.js 14.2.34 carried an incomplete fix for CVE-2025-55184; 14.2.35 carries the complete fix. We jump directly to 14.2.35 and skip 14.2.34 entirely.
  - Reference: https://nextjs.org/blog/security-update-2025-12-11

### Verified — no breaking changes

`14.2.15 → 14.2.35` is a patch-level move on the same `14.2.x` minor line. The Next.js 14.2 series ships only security and bug fixes between patches. The repository continues to:

- Use App Router everywhere (`src/app/...`, `src/app/api/...`)
- Pin React 18.3.1 (Next.js 14.2 supports React 18.2+; React 18 is unaffected by the React-side RSC protocol CVE that landed alongside this advisory, which only affects React 19)
- Build with Node.js 20 in CI
- Pass typecheck (`tsc --noEmit`), all 67 Vitest tests across 28 suites, and `next build` in CI

### CI

- CI run [#7](https://github.com/idiosynsatiable/faceless-youtube-studio/actions/runs/25584807306) (1.0.0 final) — green
- CI run on this commit verifies the bump.

## [1.0.0] — 2026-05-08

### Added

- Production-grade base build:
  - 38 deterministic engines under `src/lib/`
  - 29 API routes under `src/app/api/`
  - 19 pages under `src/app/`
  - 25 React components under `src/components/`
  - Prisma schema with 13 models (long-form + Shorts)
  - Stripe billing architecture with disabled-safe mode
  - YouTube OAuth + upload preparation with explicit-authorization gating
  - PWA manifest, Docker, GitHub Actions CI
- Shorts engine upgrade:
  - `src/lib/shorts-engine.ts`, `shorts-cutter.ts`, `shorts-calendar.ts`, `shorts-funnel.ts`, `shorts-analytics.ts`
  - 6 API routes under `src/app/api/shorts/`
  - 4 pages under `src/app/shorts/`
  - 5 React components for the Shorts surface
  - 4 docs (`YOUTUBE_SHORTS_ENGINE.md`, `SHORTS_ALGORITHM_STRATEGY.md`, `SHORTS_MONETIZATION.md`, `SHORTS_COMPLIANCE.md`)
- FFmpeg worker scaffold (`src/worker/`):
  - Sanitized argv builder with shell-metacharacter rejection and ffmpeg-flag allowlist
  - Path allowlist for inputs and outputs (no traversal, no null bytes, no absolute escapes)
  - Spawn abstraction with `shell: false` and timeout
  - QueueAdapter contract + InMemoryQueueAdapter; documented Redis adapter shape
  - Hardened `Dockerfile.worker` (non-root uid 10001, tini PID 1, read-only inputs)
  - 4 Vitest suites covering rejection paths, full-argv shell-metacharacter audit, and ffmpeg failure propagation
- Documentation:
  - `README.md`, `FINAL_VERIFICATION_REPORT.md`, `docs/ARCHITECTURE.md`, `MARKET_INTELLIGENCE.md`, `DEMOGRAPHIC_ANALYSIS.md`, `VIDEO_PRODUCTION_WORKFLOW.md`, `YOUTUBE_UPLOAD_WORKFLOW.md`, `COMPLIANCE_AND_DISCLOSURES.md`, `MONETIZATION.md`, `YOUTUBE_POLICY_SAFETY.md`, `SEO_AND_RETENTION.md`, `DEPLOYMENT.md`, `API_REFERENCE.md`, `ACCEPTANCE_CRITERIA.md`, `VERCEL_DEPLOY.md`, `FFMPEG_WORKER.md`
- Tooling:
  - `scripts/scan-secrets.sh`, `scripts/scan-placeholders.sh`, `scripts/verify-studio.sh`
  - `.github/workflows/ci.yml` runs install, typecheck, vitest, both scans, and `next build` on every push and pull request

### Safety guarantees

- No fake engagement, bot subscribers, fake likes, fake comments, fake views, or view manipulation anywhere in the codebase
- No copyrighted media bundled without license
- No hardcoded secrets; placeholder scanner runs on every CI build
- Upload publish route requires explicit `authorization: "user_confirmed"` body field; YouTube OAuth + Stripe both run in disabled-safe mode by default and return `503 integration_disabled` when env vars are absent
- Stripe webhook verification uses HMAC SHA-256 with constant-time comparison and a 5-minute timestamp tolerance window
- FFmpeg worker uses `child_process.spawn(cmd, args, { shell: false })` exclusively; every argv is validated against an allowlist before any spawn
