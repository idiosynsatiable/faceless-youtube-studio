// Crypto vault — encrypts and decrypts small secrets (specifically OAuth
// refresh tokens) at rest in the database.
//
// Algorithm: AES-256-GCM with a 12-byte IV per ciphertext + 16-byte auth tag.
// Key derivation: PBKDF2-HMAC-SHA-256 over the configured JWT_SECRET with a
// fixed application-scoped salt and 100,000 iterations. This means rotating
// JWT_SECRET invalidates all stored ciphertexts — the operator must re-OAuth
// any connected channels.

import {
  createCipheriv,
  createDecipheriv,
  pbkdf2Sync,
  randomBytes
} from 'node:crypto';

import { config } from './config';

const KEY_LENGTH = 32;
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
const PBKDF2_SALT = Buffer.from('faceless-youtube-studio.oauth.vault.v1', 'utf8');
const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_DIGEST = 'sha256';

export interface EncryptedSecret {
  cipher: string;
  iv: string;
  authTag: string;
}

export class CryptoVaultError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoVaultError';
  }
}

function deriveKey(secret: string): Buffer {
  if (!secret || secret.length < 16) {
    throw new CryptoVaultError(
      'JWT_SECRET must be at least 16 characters. Generate with `openssl rand -base64 48`.'
    );
  }
  return pbkdf2Sync(secret, PBKDF2_SALT, PBKDF2_ITERATIONS, KEY_LENGTH, PBKDF2_DIGEST);
}

export function encryptSecret(plaintext: string, secretOverride?: string): EncryptedSecret {
  const secret = secretOverride ?? config.jwtSecret;
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return {
    cipher: enc.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
  };
}

export function decryptSecret(payload: EncryptedSecret, secretOverride?: string): string {
  const secret = secretOverride ?? config.jwtSecret;
  const key = deriveKey(secret);
  let iv: Buffer;
  let cipher: Buffer;
  let authTag: Buffer;
  try {
    iv = Buffer.from(payload.iv, 'base64');
    cipher = Buffer.from(payload.cipher, 'base64');
    authTag = Buffer.from(payload.authTag, 'base64');
  } catch {
    throw new CryptoVaultError('encrypted payload is not valid base64');
  }
  if (iv.length !== IV_LENGTH) throw new CryptoVaultError(`IV must be ${IV_LENGTH} bytes`);
  if (authTag.length !== AUTH_TAG_LENGTH) throw new CryptoVaultError(`auth tag must be ${AUTH_TAG_LENGTH} bytes`);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  try {
    const dec = Buffer.concat([decipher.update(cipher), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    throw new CryptoVaultError(
      'decryption failed — most likely because JWT_SECRET has rotated since this secret was encrypted. Re-OAuth the channel.'
    );
  }
}
