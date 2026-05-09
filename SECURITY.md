# Security policy

## Supported versions

| Version | Supported |
|---|---|
| 1.0.x | yes |
| < 1.0 | no |

## Reporting a vulnerability

If you discover a security issue in Faceless YouTube Studio, please **do not open a public issue**. Instead, report it privately so we can ship a fix before public disclosure.

Use either:

- **GitHub private vulnerability reporting**: https://github.com/idiosynsatiable/faceless-youtube-studio/security/advisories/new
- **Email**: `dall.whitt@gmail.com` with subject `[security] faceless-youtube-studio`

Please include:

- A description of the issue and where you observed it
- A minimal reproduction (curl command, code snippet, or steps)
- The commit SHA you're testing against
- Your assessment of severity, if you have one

We aim to acknowledge new reports within 72 hours and to ship a patched release within 14 days for high-severity issues. We will credit you in the changelog and the GitHub Security Advisory unless you request anonymity.

## Scope

In scope:

- Source code in this repository (`src/`, `prisma/`, `scripts/`, `docs/`, configs at the repo root)
- The provided `Dockerfile` and `Dockerfile.worker`
- The CI workflow at `.github/workflows/ci.yml`

Out of scope:

- Issues in upstream dependencies (`next`, `@prisma/client`, `react`, etc.). Report those to the upstream project and we will pick up the patched release through Dependabot or a manual bump.
- Vulnerabilities that require a malicious operator (e.g., the operator setting `JWT_SECRET=test`)
- Content-policy questions about creator-generated videos. The compliance engine refuses obvious abuse but is not a substitute for a creator's own policy review.

## Hardening checklist for operators

If you run a deployment of this app, please ensure:

- Every required env var is set; disabled-safe modes are intentional but should not be the production state long-term
- Stripe webhook secret is configured and rotated periodically
- YouTube OAuth refresh tokens are encrypted at rest
- The FFmpeg worker runs as a non-root user with read-only inputs and an egress allowlist (see `docs/FFMPEG_WORKER.md`)
- The `JWT_SECRET` was generated with at least 256 bits of entropy (`openssl rand -base64 48`)
- Database backups run at least daily and are restorable
- CI is required on PRs and `main` is protected

## Disclosed vulnerabilities

See [`CHANGELOG.md`](./CHANGELOG.md) for the running list. The 1.0.1 release patched CVE-2025-55184, CVE-2025-55183, and the completion fix CVE-2025-67779 by bumping `next` to 14.2.35.
