# Owner-Authorized YouTube Publishing

## Purpose

This studio is configured to publish only through the owner-approved **@idiosynsatiable** YouTube channel. A valid Google credential alone is insufficient. The application verifies the public handle during OAuth, persists the resulting immutable YouTube channel ID, and verifies that exact ID again immediately before every worker upload.

> The upload workflow is deliberately **operator-led**. A completed render is not published until an operator explicitly confirms the individual release.

## One-time Google Cloud setup

Create or select the Google Cloud project that will own this integration, enable the **YouTube Data API v3**, and configure an OAuth client of type **Web application**. Register the exact production callback URL:

```text
https://YOUR-STUDIO-DOMAIN/api/youtube/callback
```

The callback URL in Google Cloud must match `YOUTUBE_REDIRECT_URI` exactly, including the `https` scheme, host, path, and any trailing slash behavior. Store the generated client ID and client secret only in your deployment secret manager; do not commit them to Git.

## Required production environment

Configure the following values in the web application and worker deployment. The web application and worker must use the same YouTube and secret values.

| Variable | Required value |
| --- | --- |
| `YOUTUBE_CLIENT_ID` | OAuth web-client ID from the Google Cloud project. |
| `YOUTUBE_CLIENT_SECRET` | OAuth web-client secret from the Google Cloud project. |
| `YOUTUBE_REDIRECT_URI` | Exact registered callback URL, such as `https://YOUR-STUDIO-DOMAIN/api/youtube/callback`. |
| `YOUTUBE_AUTHORIZED_CHANNEL_HANDLE` | `idiosynsatiable` |
| `YOUTUBE_AUTHORIZED_CHANNEL_ID` | Optional initially; set to the verified immutable ID returned after the first successful connection. |
| `OAUTH_STATE_SECRET` | A unique, high-entropy secret used only to sign short-lived OAuth state. |
| `JWT_SECRET` | A unique, high-entropy application secret used by encrypted-token storage. |
| `OAUTH_TOKEN_ENCRYPTION_KEY` | A unique, high-entropy encryption secret if configured by the deployment topology. |
| `DATABASE_URL` | Production PostgreSQL database URL. |
| `REDIS_URL` | Shared Redis URL for publication and render jobs. |

Generate independent secrets with a secure password manager or cryptographic generator. Never place a client secret, refresh token, or encryption secret in a browser-visible variable, source file, issue, pull request, or chat transcript.

## Owner connection procedure

1. Deploy the application and worker with the required values above, then run the Prisma migrations against the production database.
2. Open **Release Desk** in the studio and confirm that the authorized destination reads **@idiosynsatiable**.
3. Select **Connect @idiosynsatiable**. Google will display the consent screen; sign in with the Google identity that owns or manages the intended channel.
4. Consent only to the displayed YouTube permissions. The callback validates its signed state, requires the upload scope, resolves `channels.list?mine=true`, and cross-checks it with `@idiosynsatiable`.
5. If the channel does not match, the callback refuses to store the refresh token. No upload job can use that account.
6. On success, record the immutable channel ID returned by the connected-channel result and set it as `YOUTUBE_AUTHORIZED_CHANNEL_ID` in the deployment secret manager. Redeploy the application and worker after setting it.
7. Re-open the Release Desk and perform one private test release. Confirm the returned YouTube video URL belongs to the intended channel before considering public or scheduled releases.

## Publishing controls

Every publish request requires the application’s `authorization: "user_confirmed"` field. The queue worker then decrypts the server-side refresh token, refreshes it, confirms the refreshed credential still resolves to the stored channel ID and configured `@idiosynsatiable` handle, and only then initiates the resumable upload.

If the state is expired, required scope is absent, stored channel differs from configuration, a token resolves to another channel, or a refresh credential is unavailable, the flow fails closed. It does not fall back to another channel, browser token, or service account.

## Operational checks

Before enabling regular publishing, verify the following in production:

- The application and worker share database, Redis, OAuth configuration, and encrypted-secret configuration.
- The worker can access the intended export volume and FFmpeg runtime.
- The `GET /api/health` endpoint reports the expected infrastructure state.
- A private render reaches the queue, uploads only after explicit confirmation, and records a YouTube video ID in the related upload job.
- The owner-approved immutable channel ID is configured after the first verified connection.

## References

Google documents server-side OAuth state, exact redirect URI matching, and offline access in its [web-server OAuth guide](https://developers.google.com/identity/protocols/oauth2/web-server). The YouTube Data API documents `channels.list?mine=true` as the authorized request filter for the authenticated owner and supports handle resolution with `forHandle` in its [Channels: list reference](https://developers.google.com/youtube/v3/docs/channels/list). The [YouTube upload guide](https://developers.google.com/youtube/v3/guides/uploading_a_video) covers authorized `videos.insert` uploads and privacy modes.
