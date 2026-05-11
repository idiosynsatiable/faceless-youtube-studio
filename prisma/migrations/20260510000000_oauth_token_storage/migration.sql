-- Add OAuth refresh-token storage columns to Channel.
--
-- Refresh tokens are stored as AES-256-GCM ciphertext with a randomly
-- generated 12-byte IV per row and the 16-byte GCM auth tag. The encryption
-- key is derived from JWT_SECRET via PBKDF2 (see src/lib/crypto-vault.ts).
--
-- Backwards-compatible: all new columns are nullable. Existing Channel rows
-- (e.g. the seed channel) keep working with oauthConnected=false.

ALTER TABLE "Channel" ADD COLUMN "oauthRefreshTokenCipher" TEXT;
ALTER TABLE "Channel" ADD COLUMN "oauthRefreshTokenIv" TEXT;
ALTER TABLE "Channel" ADD COLUMN "oauthRefreshTokenAuthTag" TEXT;
ALTER TABLE "Channel" ADD COLUMN "oauthScope" TEXT;
ALTER TABLE "Channel" ADD COLUMN "oauthTokenUpdatedAt" TIMESTAMP(3);
