// Lightweight per-IP rate limiting for server-side routes.
//
// Uses an in-memory Map. This is fine for a single Vercel/Railway instance and
// small traffic. For multi-instance deployments or higher volume, replace with
// Redis or similar.

interface LimitState {
  count: number;
  resetAt: number;
}

const store = new Map<string, LimitState>();

const WINDOW_MS = 60_000;

export interface RateLimitOptions {
  maxRequests: number;
  windowMs?: number;
  keyPrefix?: string;
}

function getClientIp(req: { headers: Headers; ip?: string | null }): string {
  if (req.ip) return req.ip;
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const real = req.headers.get('x-real-ip');
  if (real) return real.trim();
  return 'unknown';
}

export function checkRateLimit(
  req: { headers: Headers; ip?: string | null },
  options: RateLimitOptions
): { allowed: boolean; limit: number; remaining: number; resetAt: number } {
  const { maxRequests, windowMs = WINDOW_MS, keyPrefix = '' } = options;
  const ip = getClientIp(req);
  const key = `${keyPrefix}:${ip}`;
  const now = Date.now();

  let state = store.get(key);
  if (!state || now >= state.resetAt) {
    state = { count: 0, resetAt: now + windowMs };
  }

  state.count += 1;
  store.set(key, state);

  // Trim old entries occasionally to avoid unbounded growth.
  if (store.size > 10_000) {
    for (const [k, v] of store) {
      if (now >= v.resetAt) store.delete(k);
    }
  }

  return {
    allowed: state.count <= maxRequests,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - state.count),
    resetAt: state.resetAt,
  };
}
