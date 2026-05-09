# Launch checklist — zero to live

This is the consolidated runbook to take Faceless YouTube Studio from a fresh GitHub clone to a production deployment with YouTube uploads working. Total time: roughly 60–90 minutes if you have all the accounts ready.

If you only want to read the app on your laptop, jump to **Step 0**. If you want it on a real domain serving real creators, do everything.

Per-section deep dives live in `docs/VERCEL_DEPLOY.md`, `docs/FFMPEG_WORKER.md`, `docs/YOUTUBE_UPLOAD_WORKFLOW.md`, and `docs/MONETIZATION.md`.

---

## Step 0 — Local smoke test (5 min)

```bash
git clone git@github.com:idiosynsatiable/faceless-youtube-studio.git
cd faceless-youtube-studio
cp .env.example .env
npm install --no-audit --no-fund
npm run typecheck
npm test
npm run build
```

If all four commands succeed you have a working tree. Disabled-safe mode means you can browse `/`, `/dashboard`, `/trend-radar`, `/shorts`, `/shorts/calendar` and call every non-integration API route without configuring anything else.

---

## Step 1 — Provision PostgreSQL (10 min)

Pick one provider and grab a **pooled connection string**:

- **Vercel Postgres** — open the project in Vercel, **Storage → Create → Postgres**. Copy `POSTGRES_PRISMA_URL`. Set `DATABASE_URL` to that value.
- **Neon** (https://neon.tech) — create a project, copy the pooled connection string, append `?sslmode=require&pgbouncer=true&connect_timeout=15`.
- **Supabase** (https://supabase.com) — **Settings → Database → Connection string → Transaction (pooler)**.

Then apply the schema from your laptop. The init migration is already committed at `prisma/migrations/20260508000000_init/migration.sql`, so you can apply it directly with `migrate deploy` — no `migrate dev` step required:

```bash
DATABASE_URL='<paste here>' npx prisma generate
DATABASE_URL='<paste here>' npx prisma migrate deploy
DATABASE_URL='<paste here>' npm run prisma:seed   # optional demo channel
```

The init migration was hand-crafted to match `prisma/schema.prisma` exactly (14 tables, 20 indexes, 30 foreign keys). If you ever introduce schema changes, run `npx prisma migrate dev --name <change>` from a development branch and commit the new migration directory alongside the schema change.

---

## Step 2 — (Optional) provision Redis (5 min)

Required only if you want the FFmpeg worker pipeline (Step 7). Skip otherwise.

- **Upstash via Vercel Marketplace**: **Storage → Create → Upstash Redis**. `REDIS_URL` is auto-attached.
- **Railway / Fly / Render**: provision a Redis service and copy the connection string.

---

## Step 3 — Push to your GitHub fork (2 min)

If you cloned the upstream and want your own remote:

```bash
gh repo create my-org/faceless-youtube-studio --public --source=. --push
```

Or fork the upstream in the GitHub UI and `git remote add origin git@github.com:my-org/faceless-youtube-studio.git && git push -u origin main`.

The repo ships `.github/workflows/ci.yml` and `.github/dependabot.yml`. Both activate on first push.

---

## Step 4 — Import into Vercel (5 min)

1. https://vercel.com → **Add New → Project** → pick your fork.
2. Vercel auto-detects Next.js. The committed `vercel.json` sets:
   - Build command: `npx prisma generate && next build`
   - Install command: `npm install --no-audit --no-fund`
   - Region: `iad1` (change if you need EU/APAC)
3. **Do not click Deploy yet.** Open **Environment Variables** and paste:

   | Required for production | Value |
   |---|---|
   | `DATABASE_URL` | pooled connection string from Step 1 |
   | `JWT_SECRET` | output of `openssl rand -base64 48` |
   | `NEXT_PUBLIC_APP_URL` | leave blank for now; set to your Vercel URL after first deploy |

4. Click **Deploy**. Wait for green.
5. Open `https://<your-vercel-url>/api/health`. Expect `ok: true` with `stripe: disabled_safe_mode`, `youtube: disabled_safe_mode`. That's correct for now.
6. Set `NEXT_PUBLIC_APP_URL` to the live URL and redeploy.

Detailed walkthrough: `docs/VERCEL_DEPLOY.md`.

---

## Step 5 — YouTube OAuth (15 min)

Required to publish videos and pull analytics. Skip if you only want the planning surface.

1. https://console.cloud.google.com → create a project.
2. **APIs & Services → Library** → enable **YouTube Data API v3** and **YouTube Analytics API**.
3. **OAuth consent screen** → External, add yourself as a Test user, scopes:
   - `https://www.googleapis.com/auth/youtube.upload`
   - `https://www.googleapis.com/auth/youtube.readonly`
4. **Credentials → Create OAuth Client ID → Web application**.
   - Authorized redirect URI: `https://<your-domain>/api/youtube/callback`
5. Add to Vercel:
   - `YOUTUBE_CLIENT_ID`
   - `YOUTUBE_CLIENT_SECRET`
   - `YOUTUBE_REDIRECT_URI` (same value as step 4)
6. Redeploy.
7. Open `https://<your-domain>/uploads`, click **Connect**, complete OAuth with the channel you want to operate.

Detailed walkthrough: `docs/YOUTUBE_UPLOAD_WORKFLOW.md`.

---

## Step 6 — Stripe billing (15 min)

Required only if you want to sell subscriptions. Skip if Free tier is enough.

1. https://dashboard.stripe.com → test mode.
2. **Products → Add product** three times:
   - Creator $19/month
   - Studio $49/month
   - Agency $149/month

   Copy the three `price_...` IDs.
3. **Developers → API keys** → copy the secret key.
4. **Developers → Webhooks → Add endpoint** → `https://<your-domain>/api/billing/webhook`. Subscribe to:
   - `checkout.session.completed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid`
   - `invoice.payment_failed`

   Copy the signing secret.
5. Add to Vercel:
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `STRIPE_CREATOR_PRICE_ID`, `STRIPE_STUDIO_PRICE_ID`, `STRIPE_AGENCY_PRICE_ID`
6. Redeploy.
7. Verify with the Stripe CLI:
   ```bash
   stripe login
   stripe listen --forward-to https://<your-domain>/api/billing/webhook
   stripe trigger checkout.session.completed
   ```

   Expect `200` from the webhook handler. The route uses HMAC SHA-256 with constant-time comparison.

Detailed walkthrough: `docs/VERCEL_DEPLOY.md → Step 6`.

---

## Step 7 — FFmpeg worker (20 min, optional)

Required only when you want the app to actually assemble and upload videos. The planning, scripting, and metadata surfaces work without it.

1. Provision a long-running container host. Options:
   - **Railway**: https://railway.app → New project → Empty service → `Settings → Source` → connect your GitHub repo → set Dockerfile path to `Dockerfile.worker`.
   - **Fly.io**: `fly launch` from the repo, point at `Dockerfile.worker`.
   - **Render**: New web service from your repo, choose `Dockerfile.worker`.
2. Set environment variables on the worker host:
   - `REDIS_URL`
   - `DATABASE_URL` (same as Vercel)
   - `YOUTUBE_CLIENT_ID`, `YOUTUBE_CLIENT_SECRET`, `YOUTUBE_REDIRECT_URI`
   - `WORKER_OUTPUT_ROOT=/var/lib/faceless-studio/exports`
   - `WORKER_INPUT_ALLOWLIST=/var/lib/faceless-studio/inputs`
3. Mount object storage for inputs (read-only) and outputs (read-write).
4. Wire the QueueAdapter — copy the `redisQueueAdapter` sketch from `docs/FFMPEG_WORKER.md` into a small bootstrap that imports `runWorkerLoop` and your adapter.
5. Deploy. Watch logs for `worker starting concurrency=1 outputs=/var/lib/faceless-studio/exports`.

Detailed walkthrough: `docs/FFMPEG_WORKER.md`.

---

## Step 8 — Custom domain (5 min)

1. Vercel → **Settings → Domains → Add**. Add your domain.
2. Update DNS at your registrar per Vercel's instructions.
3. Wait for SSL (~60 sec).
4. Update `NEXT_PUBLIC_APP_URL`, the YouTube redirect URI, and the Stripe webhook endpoint to the new domain.
5. Redeploy.

---

## Step 9 — Smoke tests (5 min)

Curl from your laptop:

```bash
DOM=https://<your-domain>

curl $DOM/api/health

curl -X POST $DOM/api/trends \
  -H 'Content-Type: application/json' \
  -d '{"topic":"index funds explained","region":"US","language":"en","source":"manual"}'

curl -X POST $DOM/api/shorts/generate \
  -H 'Content-Type: application/json' \
  -d '{"niche":"personal finance","audience":"finance beginners","count":3,"hasAffiliateLinks":true,"topicFlags":["financial"]}'

# Confirm the publish-authorization gate is enforced.
curl -X POST $DOM/api/uploads/publish \
  -H 'Content-Type: application/json' \
  -d '{"videoProjectId":"abc","privacyStatus":"private"}'
# expect: 401 authorization_required
```

Open these pages in a browser and confirm they render: `/`, `/dashboard`, `/trend-radar`, `/niches`, `/demographics`, `/ideas`, `/scripts`, `/studio`, `/videos`, `/uploads`, `/analytics`, `/monetization`, `/compliance`, `/settings`, `/pricing`, `/shorts`, `/shorts/from-longform`, `/shorts/calendar`, `/shorts/analytics`.

---

## Step 10 — Operator hardening (10 min)

- Branch protection on `main` requiring CI green and at least one review.
- **Settings → Code security and analysis → Dependabot alerts**: on. Dependabot config is already committed.
- **Vercel → Project Settings → Git → Production deployments**: require approval for production promotions.
- Enable Sentry (or compatible) for both the web app and the worker. Wire `SENTRY_DSN` env vars after you sign up.
- Daily DB backups via your Postgres provider.
- Rotate `JWT_SECRET`, Stripe keys, and YouTube refresh tokens on a schedule that matches your security policy.

---

## Done

You now have:

- A live Vercel deployment of the planning + production + compliance + monetization surface
- A connected YouTube channel that can publish through OAuth-gated upload
- Stripe-enabled subscriptions across three tiers
- (Optional) a hardened FFmpeg worker assembling and uploading videos
- CI on every push and PR
- Dependabot watching for security updates
- A documented vulnerability disclosure path (see `SECURITY.md`)

If anything fails, the **Common errors** tables in `docs/VERCEL_DEPLOY.md` and `docs/FFMPEG_WORKER.md` map most failures to a specific fix. The `FINAL_VERIFICATION_REPORT.md` lists the 42-item base acceptance checklist plus the 20-item Shorts upgrade addendum if you want to validate against the original spec.
