// Lightweight in-memory token-bucket rate limiter.
// In production, swap the store with Redis through REDIS_URL.

interface Bucket {
  tokens: number;
  refillAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitOptions {
  capacity: number;
  windowMs: number;
}

export function rateLimit(key: string, opts: RateLimitOptions = { capacity: 60, windowMs: 60_000 }) {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.refillAt < now) {
    buckets.set(key, { tokens: opts.capacity - 1, refillAt: now + opts.windowMs });
    return { allowed: true, remaining: opts.capacity - 1, resetMs: opts.windowMs };
  }
  if (bucket.tokens <= 0) {
    return { allowed: false, remaining: 0, resetMs: bucket.refillAt - now };
  }
  bucket.tokens -= 1;
  return { allowed: true, remaining: bucket.tokens, resetMs: bucket.refillAt - now };
}

export function clientKey(headers: Headers): string {
  const fwd = headers.get('x-forwarded-for') || '';
  const real = headers.get('x-real-ip') || '';
  return (fwd.split(',')[0] || real || 'anonymous').trim();
}
