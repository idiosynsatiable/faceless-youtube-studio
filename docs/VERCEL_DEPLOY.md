# Vercel deployment guide

This is the operator's runbook for deploying Faceless YouTube Studio to Vercel. It assumes the repository is hosted at `idiosynsatiable/faceless-youtube-studio` (or your fork) and CI is green on `main`.

The app is a Next.js 14 App Router project with Prisma + PostgreSQL. Stripe and YouTube OAuth are disabled-safe by default — you can ship the app without either and turn them on later. The FFmpeg / upload worker is a separate process that runs outside Vercel (see the "Worker placement" section below).

---

## Pre-flight checklist

You will need:

- A Vercel account (Hobby is enough for staging; Pro is required for usage analytics, longer build limits, and team domains)
- A managed PostgreSQL provider — pick one before you start the import:
  - Vercel Postgres (Neon under the hood, simplest)
  - Neon directly (https://neon.tech)
  - Supabase (https://supabase.com)
  - Any provider that gives you a `postgres://` connection string
- (Optional) A managed Redis provider for the upload + FFmpeg worker queue:
  - Upstash Redis (Vercel marketplace)
  - Railway / Fly Redis
- (Optional) A Stripe account in test mode
- (Optional) A Google Cloud project with the YouTube Data API + YouTube Analytics API enabled
- (Optional) An OpenAI-compatible API key for richer AI generation; engines run rule-based without it

Read `docs/DEPLOYMENT.md` and `docs/YOUTUBE_UPLOAD_WORKFLOW.md` once before you start so the env vars below are not new to you.

---

## Step 1 — Import the repo into Vercel

1. Sign in to https://vercel.com.
2. Click **Add New → Project**.
3. Connect your GitHub account if it isn't already connected. Grant Vercel access to `idiosynsatiable/faceless-youtube-studio` (or your fork).
4. Click **Import** on the repo.
5. On the configure screen leave the defaults:
   - **Framework Preset:** Next.js (auto-detected)
   - **Root Directory:** `./`
   - **Build Command:** `npm run build` (Vercel default)
   - **Install Command:** `npm install --no-audit --no-fund`
   - **Output Directory:** `.next` (Vercel default)
   - **Node.js version:** `20.x`
6. Do **NOT** click Deploy yet. Open the **Environment Variables** panel first (Step 4).

---

## Step 2 — Provision PostgreSQL

Pick one of the three paths.

### Path A — Vercel Postgres (recommended)

1. In your project dashboard, open the **Storage** tab.
2. Click **Create Database → Postgres**.
3. Name it `faceless-youtube-studio-db`. Region: pick the same region as your Functions (default `iad1` for US East).
4. Vercel automatically attaches `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`, etc. to the project's env vars across Production, Preview, Development.
5. **Important for Prisma:** add a `DATABASE_URL` env var that points at `POSTGRES_PRISMA_URL`. The simplest way is to copy the value of `POSTGRES_PRISMA_URL` into a new env var called `DATABASE_URL`. The pooled connection string is what Prisma needs from a serverless function.

### Path B — Neon (direct)

1. Sign in at https://neon.tech.
2. Create a new project. Region: closest to your Vercel region.
3. Copy the **Pooled connection string** for the default branch.
4. Open Vercel → your project → **Settings → Environment Variables** and add:
   - `DATABASE_URL=postgresql://<user>:<password>@<host>/<db>?sslmode=require&pgbouncer=true&connect_timeout=15`

### Path C — Supabase

1. Sign in at https://supabase.com and create a new project.
2. Open **Project Settings → Database → Connection string → Transaction (pooler)**.
3. Replace the password placeholder with the database password.
4. Add to Vercel as `DATABASE_URL`.

### Run the initial migration

Prisma migrations run from your laptop or CI, not from a Vercel Function. From a clean clone of the repo:

```bash
git clone git@github.com:idiosynsatiable/faceless-youtube-studio.git
cd faceless-youtube-studio
cp .env.example .env
# edit .env so DATABASE_URL points at the production database
npm install
npx prisma generate
npx prisma migrate deploy
npm run prisma:seed   # optional - creates a demo channel
```

`prisma migrate deploy` is the right command for production; do not run `prisma migrate dev` against a deployed database.

---

## Step 3 — Provision Redis (optional)

Redis is only required for the upload + FFmpeg worker queue. If you only need the marketing / planning surface (Trend Radar, Ideas, Scripts, Storyboards, Compliance, Monetization, Shorts), you can skip Redis and add it later.

If you do want it now:

### Option A — Upstash via Vercel Marketplace

1. **Storage → Create Database → Upstash Redis**
2. Pick a region. Copy `UPSTASH_REDIS_REST_URL` and `REDIS_URL` (they auto-attach as env vars).
3. The repo reads `REDIS_URL`, so you only need that one.

### Option B — Railway, Fly, or any Redis provider

1. Provision a Redis instance.
2. Set the connection string as `REDIS_URL` in Vercel env vars.

---

## Step 4 — Environment variables

Go to **Settings → Environment Variables** for the project. Add the following.

### Required for any deployment

| Name | Example | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://faceless:...` | Pooled connection string (set in Step 2) |
| `JWT_SECRET` | `(generate)` | Run `openssl rand -base64 48` locally and paste the result |
| `NEXT_PUBLIC_APP_URL` | `https://faceless-youtube-studio.vercel.app` | Use your Vercel-assigned domain or your custom domain |

### Optional — Redis worker queue

| Name | Example |
|---|---|
| `REDIS_URL` | `redis://default:...@us1-xyz.upstash.io:6379` |

### Optional — YouTube OAuth (see Step 5 for setup)

| Name | Notes |
|---|---|
| `YOUTUBE_CLIENT_ID` | From Google Cloud OAuth client |
| `YOUTUBE_CLIENT_SECRET` | From Google Cloud OAuth client |
| `YOUTUBE_REDIRECT_URI` | `https://<your-domain>/api/youtube/callback` |

When all three are set, `/api/youtube/oauth`, `/callback`, `/channels`, and `/analytics` activate. Until then they return `503 integration_disabled`.

### Optional — Stripe billing (see Step 6 for setup)

| Name | Notes |
|---|---|
| `STRIPE_SECRET_KEY` | Test key starts with `sk_test_`, live with `sk_live_` |
| `STRIPE_WEBHOOK_SECRET` | Set after you create the webhook endpoint |
| `STRIPE_CREATOR_PRICE_ID` | `price_...` for the Creator tier |
| `STRIPE_STUDIO_PRICE_ID` | `price_...` for the Studio tier |
| `STRIPE_AGENCY_PRICE_ID` | `price_...` for the Agency tier |

When all are set, `/api/billing/checkout` and `/api/billing/webhook` activate; otherwise they return `503 integration_disabled`. The webhook handler verifies signatures with HMAC SHA-256 and constant-time comparison.

### Optional — AI provider

| Name | Notes |
|---|---|
| `OPENAI_API_KEY` | Optional. Engines run rule-based when unset. |
| `AI_PROVIDER` | Defaults to `openai`. Set to your provider name. |

### Per-environment scopes

Apply each variable to the environments you want it to take effect in:

- **Production** — the live deployment
- **Preview** — pull-request preview deployments
- **Development** — `vercel dev` locally (rarely used; `npm run dev` is more common)

For development, prefer `.env.local` on your laptop. Do not commit it.

---

## Step 5 — YouTube OAuth setup

Required only if you want creators to publish through the app or pull YouTube Analytics.

1. Open https://console.cloud.google.com.
2. Create a new project, e.g. `faceless-youtube-studio-prod`.
3. **APIs & Services → Library** — enable:
   - YouTube Data API v3
   - YouTube Analytics API
4. **OAuth consent screen** — set User Type to **External**, fill in the basics. App name `Faceless YouTube Studio`. Add scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
5. While the app is in **Testing** status, add yourself as a Test user. Submit for verification before going to public production.
6. **APIs & Services → Credentials → Create Credentials → OAuth client ID**.
   - Application type: Web application
   - Name: `faceless-youtube-studio-prod`
   - Authorized JavaScript origins:
     - `https://<your-vercel-domain>`
     - (optional) your custom domain
   - Authorized redirect URIs:
     - `https://<your-vercel-domain>/api/youtube/callback`
7. Copy the Client ID and Client secret into Vercel env vars (`YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`). Set `YOUTUBE_REDIRECT_URI` to the same redirect URI you registered.
8. Trigger a redeploy in Vercel so the new env vars take effect.
9. Open `https://<your-domain>/uploads`, click **Connect**, and complete the OAuth flow once with the channel you want to operate.

Refresh tokens must be encrypted at rest. The repo stores them on a Channel record only after the OAuth callback runs server-side; never log raw tokens. The `oauthConnected` flag on the Channel model flips to true after a successful callback.

---

## Step 6 — Stripe wiring

Required only if you want to sell subscriptions. The product runs in disabled-safe mode without Stripe.

### 6.1 — Create products and prices

1. Sign in at https://dashboard.stripe.com (test mode is fine to start).
2. **Products → Add product**, repeat three times:

   | Tier | Recurring price |
   |---|---|
   | Creator | $19 / month USD |
   | Studio | $49 / month USD |
   | Agency | $149 / month USD |

3. Copy each price ID (starts with `price_`) into Vercel:
   - `STRIPE_CREATOR_PRICE_ID`
   - `STRIPE_STUDIO_PRICE_ID`
   - `STRIPE_AGENCY_PRICE_ID`

4. **Developers → API keys**, copy the secret key into `STRIPE_SECRET_KEY`.

### 6.2 — Create the webhook endpoint

1. **Developers → Webhooks → Add endpoint**.
2. Endpoint URL: `https://<your-domain>/api/billing/webhook`
3. Listen for at least these events:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`
4. After saving, click **Reveal signing secret** and copy it into Vercel as `STRIPE_WEBHOOK_SECRET`.

### 6.3 — Verify locally with the Stripe CLI

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to https://<your-domain>/api/billing/webhook
```

Trigger a test event:

```bash
stripe trigger checkout.session.completed
```

The route returns `200 ok=true` only if the signature verifies (HMAC SHA-256, constant-time compare, 5-minute tolerance). If you see `400 invalid_signature`, the webhook secret in Vercel does not match the one shown in the Stripe dashboard.

### 6.4 — Sanity-check the checkout route

```bash
curl -X POST https://<your-domain>/api/billing/checkout \
  -H 'Content-Type: application/json' \
  -d '{"tier":"creator","successUrl":"https://<your-domain>/billing/success","cancelUrl":"https://<your-domain>/billing/cancel"}'
```

You should get a JSON payload that describes how to call Stripe to create the checkout session. The actual `stripe.checkout.sessions.create` call is performed server-side by your auth-aware controller, not by an unauthenticated request.

---

## Step 7 — First deployment

1. Back on the project's overview, click **Deploy**.
2. Watch the build log. Successful steps:
   - Cloning repo
   - `npm install --no-audit --no-fund`
   - `prisma generate` (runs automatically on Vercel because `@prisma/client` is in dependencies)
   - `next build`
3. After deploy, open `https://<your-domain>/api/health`. You should see:

   ```json
   {
     "ok": true,
     "service": "faceless-youtube-studio",
     "version": "1.0.0",
     "integrations": {
       "stripe": "configured" | "disabled_safe_mode",
       "youtube": "configured" | "disabled_safe_mode",
       "ai": "configured" | "rule_based_only"
     }
   }
   ```

4. Visit `/`, `/dashboard`, `/trend-radar`, `/shorts`, `/shorts/calendar` and confirm pages render.

---

## Step 8 — Custom domain

1. **Settings → Domains → Add**.
2. Add your domain. Follow Vercel's DNS instructions (CNAME or A record).
3. Wait for SSL provisioning (usually under 60 seconds).
4. Update `NEXT_PUBLIC_APP_URL` to the custom domain.
5. Update Google OAuth and Stripe webhook URLs to the custom domain. Redeploy.

---

## Step 9 — Worker placement (FFmpeg + upload queue)

Vercel Functions have hard limits — typical timeouts and memory ceilings make them a poor fit for video assembly and YouTube upload streaming. Run the worker on a long-running host:

- Railway: simplest. Deploy from the same repo using the included `Dockerfile`. Set `DATABASE_URL`, `REDIS_URL`, `YOUTUBE_CLIENT_ID/SECRET/REDIRECT_URI` to the same values used by Vercel.
- Fly.io: same deployment story, with regional fly.toml.
- Render: web service from the Dockerfile.
- Self-hosted: any container host. Read-only inputs, no shell injection, allowlist of validated paths (see `src/lib/video-assembler.ts` Stage 1-6 + safety notes).

The worker:

1. Subscribes to the upload queue on `REDIS_URL`.
2. Pulls `UploadJob` rows in `draft_ready` status, validates inputs, runs the FFmpeg pipeline, and writes outputs to object storage.
3. Calls the YouTube Data API to upload private/scheduled/published as instructed by the user-confirmed action.
4. Updates `UploadJob.status` and surfaces errors to the user via the `errorMessage` column.

For the Faceless YouTube Studio repo specifically, you can copy the `Dockerfile` and add an entrypoint script that runs `npm run worker` (a stub script you'll add when you stand up the worker — see `docs/DEPLOYMENT.md → Workers`).

---

## Step 10 — Post-deploy checks

Run these once after every meaningful change:

```bash
# Health
curl https://<your-domain>/api/health

# Trend scoring
curl -X POST https://<your-domain>/api/trends -H 'Content-Type: application/json' \
  -d '{"topic":"index funds explained","region":"US","language":"en","source":"manual"}'

# Niche scoring
curl -X POST https://<your-domain>/api/niches/score -H 'Content-Type: application/json' \
  -d '{"niche":"personal finance","competition":75,"monetization":85,"audienceUrgency":65,"retentionPotential":70,"advertiserSafety":80,"evergreen":true,"highIntent":true,"affiliateFit":true,"seriesPotential":true,"internationalScalability":true}'

# Shorts generation
curl -X POST https://<your-domain>/api/shorts/generate -H 'Content-Type: application/json' \
  -d '{"niche":"personal finance","audience":"finance beginners","count":3,"hasAffiliateLinks":true,"topicFlags":["financial"]}'

# Upload publish — should reject without authorization=user_confirmed
curl -X POST https://<your-domain>/api/uploads/publish -H 'Content-Type: application/json' \
  -d '{"videoProjectId":"abc","privacyStatus":"private"}'
# expect: 401 authorization_required
```

Anything other than `200` plus a structured JSON payload (or `401 / 503` where intentional) means something is wrong — most often a missing env var. Open the Vercel **Logs** tab and read the function logs.

---

## Step 11 — Preview deployments

Every push to a non-`main` branch becomes a Vercel Preview deployment with its own URL. Preview deployments inherit env vars whose Environment scope is set to **Preview**. Use that scope for safe (test-mode) Stripe keys and OAuth clients with preview-domain redirect URIs added.

---

## Step 12 — Rollback

Bad deploy? In the Vercel dashboard:

1. **Deployments** tab.
2. Find the last green deploy.
3. Click the three-dot menu → **Promote to Production**.

This switches the production alias without redeploying. Faster than reverting commits.

---

## Step 13 — Observability

Recommended:

- Vercel's built-in **Logs** and **Analytics** for HTTP traffic and Function runtime.
- Sentry-compatible error reporting via a thin `src/lib/observability.ts` (not in the base repo — add it when you have a Sentry org). Configure `SENTRY_DSN` and run `Sentry.init` in the entry point.
- Structured JSON logs from your worker process.

---

## Step 14 — Hardening checklist

- Rotate `JWT_SECRET` only with a session-invalidation policy in mind.
- Pin Stripe to test mode until you complete fraud review and tax setup.
- Keep YouTube OAuth client in Testing mode until you submit for verification with all required scope justifications.
- Use Vercel's **Protect Production Deployments** feature to require approval for promoting builds to production.
- Use the GitHub Actions CI on every push (`.github/workflows/ci.yml`) and require a green status check on PRs before merging to `main`.

---

## Common errors

| Symptom | Likely cause | Fix |
|---|---|---|
| `503 integration_disabled` on `/api/youtube/*` | Missing `YOUTUBE_CLIENT_ID/SECRET` | Add env vars, redeploy |
| `503 integration_disabled` on `/api/billing/*` | Missing Stripe keys or webhook secret | Add env vars, redeploy |
| `401 authorization_required` on `/api/uploads/publish` | Body missing `authorization: "user_confirmed"` | Required by design — never publish without explicit user confirmation |
| `400 invalid_signature` on Stripe webhook | Wrong `STRIPE_WEBHOOK_SECRET` in Vercel | Copy the secret from Stripe → Webhooks → Reveal |
| `Prisma migration failed` | Migration not applied to production database | Run `npx prisma migrate deploy` from your laptop or CI |
| Build error: `Module not found: @prisma/client` | Prisma generate did not run | Add `"postinstall": "prisma generate"` to `package.json` scripts (already wired via dependency) |
| 404s on Shorts pages | Old deployment cached | Force a redeploy — Vercel **Deployments → Latest → Redeploy** |

---

## Next actions after a clean deploy

1. Go through `docs/ACCEPTANCE_CRITERIA.md` and run each acceptance item against the live URL.
2. Connect a real YouTube channel and walk through the upload prep + publish flow once with a test private upload.
3. Subscribe to the Stripe Creator tier with a test card to confirm the checkout + webhook lifecycle.
4. Stand up the FFmpeg worker on Railway / Fly / Render before encouraging real video uploads.
5. Run `bash scripts/verify-studio.sh` from a clean local clone and attach the resulting `VERIFY_REPORT.md` to your release notes.
