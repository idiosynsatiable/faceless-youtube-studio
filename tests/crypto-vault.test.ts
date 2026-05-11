import { describe, expect, it } from 'vitest';
import { encryptSecret, decryptSecret, CryptoVaultError } from '@/lib/crypto-vault';

const TEST_SECRET = 'test-jwt-secret-must-be-long-enough-to-pass-validation';

describe('crypto vault', () => {
  it('round-trips arbitrary UTF-8 plaintext', () => {
    const plaintext = '1//0gXyZ-refresh_token_value_with_special_chars=&?';
    const enc = encryptSecret(plaintext, TEST_SECRET);
    expect(enc.cipher).toBeTruthy();
    expect(enc.iv).toBeTruthy();
    expect(enc.authTag).toBeTruthy();
    const dec = decryptSecret(enc, TEST_SECRET);
    expect(dec).toBe(plaintext);
  });

  it('produces different ciphertext for the same plaintext (random IV)', () => {
    const plaintext = 'static-refresh-token';
    const a = encryptSecret(plaintext, TEST_SECRET);
    const b = encryptSecret(plaintext, TEST_SECRET);
    expect(a.cipher).not.toBe(b.cipher);
    expect(a.iv).not.toBe(b.iv);
    expect(decryptSecret(a, TEST_SECRET)).toBe(plaintext);
    expect(decryptSecret(b, TEST_SECRET)).toBe(plaintext);
  });

  it('throws when the key has rotated', () => {
    const enc = encryptSecret('something', TEST_SECRET);
    expect(() => decryptSecret(enc, 'a-different-but-still-long-secret-value-xx')).toThrowError(CryptoVaultError);
  });

  it('rejects short keys', () => {
    expect(() => encryptSecret('x', 'short')).toThrowError(CryptoVaultError);
  });

  it('rejects malformed payloads', () => {
    expect(() => decryptSecret({ cipher: 'invalid', iv: 'invalid', authTag: 'invalid' }, TEST_SECRET))
      .toThrowError(CryptoVaultError);
  });
});
