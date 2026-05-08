// Security helpers: safe filenames, request size guards, JSON validation.

const FILENAME_ALLOWED = /^[A-Za-z0-9._-]+$/;

export function safeFilename(input: string, fallback = 'video-package'): string {
  const trimmed = (input || '').trim().replace(/\s+/g, '-').toLowerCase();
  const sanitized = trimmed.replace(/[^a-z0-9._-]/g, '-').replace(/-+/g, '-');
  const truncated = sanitized.slice(0, 64).replace(/^[-.]+|[-.]+$/g, '');
  if (!truncated || !FILENAME_ALLOWED.test(truncated)) return fallback;
  return truncated;
}

export const MAX_REQUEST_BYTES = 256 * 1024;

export function tooLarge(body: string): boolean {
  return Buffer.byteLength(body, 'utf8') > MAX_REQUEST_BYTES;
}

export function redactSecretLike(text: string): string {
  return text.replace(/sk_[A-Za-z0-9_-]{8,}/g, 'sk_REDACTED').replace(/AIza[0-9A-Za-z_-]{16,}/g, 'AIza_REDACTED');
}

export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
