# YouTube upload workflow

## OAuth

`/api/youtube/oauth` returns the Google OAuth 2.0 authorize URL once `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET` are configured. Until then it returns `503 integration_disabled`.

`/api/youtube/callback` exchanges the authorization code server-side. Refresh tokens must be encrypted at rest. Raw client secrets are never written to logs or response bodies.

## Upload preparation

`/api/uploads/prepare` accepts: title (1-100 characters), description, tags, category, privacy status (`private` by default), optional scheduled publish time, optional playlist id, and optional thumbnail key. The route returns a sanitized filename, the package, and any warnings.

## Publish

`/api/uploads/publish` requires:

- `videoProjectId`
- `authorization=user_confirmed`

Without that explicit confirmation the route returns `401 authorization_required`. When YouTube OAuth is disabled the route returns `503 integration_disabled`. Public publishing is enqueued for a worker process that uses the YouTube Data API.

## Statuses

`draft_ready`, `private_uploaded`, `scheduled`, `published`, `failed`, `needs_review`.

## Quota safety

Uploads are private by default. The worker honors YouTube quota limits, retries with backoff on 5xx, and surfaces every error message into the `UploadJob` table.
