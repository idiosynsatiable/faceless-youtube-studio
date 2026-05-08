# Faceless YouTube Studio

Tagline: Turn rising trends into monetizable faceless video systems.

Faceless YouTube Studio is an AI-assisted market intelligence and faceless video production command center. It pairs trend discovery, demographic analysis, niche scoring, idea generation, scriptwriting, storyboarding, video assembly planning, captions, metadata, compliance disclaimers, YouTube upload preparation, analytics feedback, and monetization planning into one workflow.

The product never uses fake engagement, bot traffic, fake subscribers, fake likes, comment spam, view manipulation, stolen copyrighted content, misleading metadata, harmful misinformation, or deceptive monetization tactics.

## Product overview

- 23 production-grade modules covering the full pipeline from trend to monetization, including a first-class YouTube Shorts engine
- 29 documented API routes
- 19 UI pages in the App Router (including `/shorts`, `/shorts/from-longform`, `/shorts/calendar`, `/shorts/analytics`)
- Stripe billing architecture with disabled-safe mode
- YouTube OAuth + upload preparation with explicit-authorization gating (long-form and Shorts)
- Long-form-to-Shorts cutter, 9:16 storyboards, 15s/30s/60s variants, sustainable cadence engine, Shorts -> long-form funnel
- Vitest test suite for engines, disclaimers, integration disabled modes, and the Shorts no-spam guarantees
- PWA manifest, Docker, and Vercel-ready deployment

## Stack

Next.js App Router, TypeScript, Tailwind CSS, PostgreSQL via Prisma, Redis-ready architecture, Zod validation, FFmpeg-architected video assembly, Stripe billing, YouTube Data API integration, Vitest tests, GitHub Actions CI.

## Install

```bash
git clone <your-fork-of-this-repo>
cd faceless-youtube-studio
cp .env.example .env
npm install
```

## Environment setup

The product runs end to end with no third-party keys configured. YouTube OAuth, Stripe billing, and AI provider features all support a disabled-safe mode that returns clear 503 responses until env vars are filled in.

Configure `.env` from `.env.example`. To enable optional integrations, fill in the matching keys.

## Database setup

```bash
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

PostgreSQL and Redis containers are pre-configured in `docker-compose.yml`.

## Run commands

```bash
npm run dev          # local development
npm run build        # production build
npm run start        # serve production build
npm run typecheck    # strict TypeScript
npm run test         # Vitest engine tests
npm run scan:secrets
npm run scan:placeholders
npm run verify       # full local verification pipeline
```

## YouTube OAuth setup

1. Create a Google Cloud project, enable YouTube Data API and YouTube Analytics API.
2. Configure an OAuth client with redirect URI `${NEXT_PUBLIC_APP_URL}/api/youtube/callback`.
3. Set `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI` in `.env`.
4. Restart the app. The `/api/youtube/oauth` route returns the authorize URL once configured. Until then it responds with `503 integration_disabled`.

## Stripe setup

1. Create products and prices for the Creator, Studio, and Agency tiers.
2. Set `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, and the three price IDs in `.env`.
3. Configure a webhook endpoint pointing at `/api/billing/webhook`. The webhook route validates the signature with HMAC SHA-256 and a constant-time compare.

## Trend workflow

1. Add trend records via `/api/trends` (manual, CSV import, or imported from official APIs).
2. The Trend Radar engine returns trend score, monetization score, competition score, evergreen score, advertiser-safety score, suggested angles, suggested formats, and recommended publish timing.
3. Combine with niche and demographic engines to produce an opportunity score.

## Video package workflow

1. Generate ideas via `/api/ideas/generate`.
2. Generate a script via `/api/scripts/generate`.
3. Convert script into a storyboard via `/api/storyboards/generate`.
4. Plan the video via `/api/video-plan/generate`.
5. Generate metadata via `/api/metadata/generate`.
6. Run compliance via `/api/compliance/check`.
7. Export Markdown and JSON via `/api/exports/generate`.

## Upload workflow

1. Connect a YouTube channel through `/api/youtube/oauth`.
2. Prepare an upload package via `/api/uploads/prepare`.
3. Publish via `/api/uploads/publish` — the route requires `authorization=user_confirmed`. Without it the request is rejected with 401.

## Monetization workflow

`/api/monetization/plan` returns a primary path, secondary path, revenue streams ranked by fit, CTA strategy, affiliate plan, sponsor plan, email funnel, product ladder, first 10 sponsor targets, first 10 affiliate categories, revenue readiness score, and policy notes.

## Compliance workflow

`/api/compliance/check` reads script and metadata, identifies financial, medical, legal, AI, and affiliate triggers, and returns the required disclaimers plus any high-severity issues. The disclaimer texts are the standard ones from the spec.

## Shorts workflow

1. Generate standalone Shorts via `/api/shorts/generate`.
2. Convert any long-form script into 3-10 clips via `/api/shorts/from-longform`. Each clip ships with 15s, 30s, and 60s variants.
3. Plan the publish cadence via `/api/shorts/calendar`. The engine refuses spam-level recommendations.
4. Build a Short -> long-form funnel via `/api/shorts/funnel`.
5. Generate Shorts metadata (title, description, hashtags, pinned comment, disclosures) via `/api/shorts/metadata`.
6. Score performance and request next moves via `/api/shorts/analytics`.
7. Export a Shorts-only or long-form-plus-Shorts bundle via `/api/exports/generate` with `bundleType: "shorts"` or `"combined"`.

## Asset license note

The icons under `public/icon-192.png` and `public/icon-512.png` were produced by this project as small solid PNGs and are released under the MIT license alongside the repository. No third-party copyrighted media is bundled.
