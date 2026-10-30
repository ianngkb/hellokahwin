import type { NextRequest } from 'next/server';
import { apiError } from './response';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store keyed by "pathname:ip". Ported from The Wedding Notebook.
// NOTE: This does NOT persist across Vercel function restarts or across
// instances, so it is a per-instance brake on a runaway client rather than a
// global quota. That is enough for the analytics beacon it guards.
const store = new Map<string, RateLimitEntry>();

// F3: Bound the store to prevent memory exhaustion from attacker-rotated IPs.
const MAX_STORE_SIZE = 10_000;

/**
 * Make room for one more bucket, and MAKE SURE THERE IS ROOM.
 *
 * The first version only deleted expired entries, which is no bound at all: at
 * 10,000 live keys every subsequent insert found nothing to remove and was
 * added anyway, so an attacker supplying fresh IP buckets inside one
 * window grew this Map without limit — the exact memory exhaustion the cap was
 * written to prevent (review F10).
 *
 * Expired rows go first because they are free. If that is not enough, the
 * SOONEST-EXPIRING live bucket is dropped: it is the one closest to being
 * worthless anyway, and losing it costs an attacker a few extra allowed
 * attempts rather than resetting everybody's counter.
 */
function evictExpiredIfNeeded(): void {
  if (store.size < MAX_STORE_SIZE) return;

  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  if (store.size < MAX_STORE_SIZE) return;

  // Nothing expired — every bucket is live. Drop the ones nearest their reset
  // until there is room for the caller's insert.
  const byExpiry = [...store.entries()].sort((a, b) => a[1].resetAt - b[1].resetAt);
  const overBy = store.size - MAX_STORE_SIZE + 1;
  for (let i = 0; i < overBy && i < byExpiry.length; i++) {
    store.delete(byExpiry[i][0]);
  }
}

/**
 * Test-only introspection for the in-memory store. Not part of the runtime API —
 * used to assert the eviction bound. Prefixed `__` to signal internal.
 */
export const __rateLimitStoreInternals = {
  size: () => store.size,
  maxSize: MAX_STORE_SIZE,
  clear: () => store.clear(),
};

function getClientIp(request: NextRequest): string {
  // Prefer x-real-ip (Vercel's trusted header). Failing that, the LAST
  // x-forwarded-for entry (appended by the proxy) — the first is whatever the
  // client claimed. Same rule as the analytics collector.
  return (
    request.headers.get('x-real-ip') ??
    request.headers.get('x-forwarded-for')?.split(',').pop()?.trim() ??
    'unknown'
  );
}

interface RateLimitOptions {
  limit: number;
  windowMs: number;
  /**
   * Narrow the bucket beyond "this route, this IP".
   *
   * Some routes are hit many times per visitor for DIFFERENT things, and a
   * single per-IP bucket then punishes shared addresses — carrier CGNAT puts
   * hundreds of real mobile visitors behind one `x-real-ip`. Passing the thing
   * being acted on (e.g. a click key) keeps the cap meaningful per target
   * instead of per network. Omit it for the ordinary per-route, per-IP cap.
   */
  keySuffix?: string;
}

/**
 * Check IP-based rate limit for a route handler.
 * Returns a 429 Response if the limit is exceeded, or null if the request is allowed.
 */
export function ipRateLimit(request: NextRequest, options: RateLimitOptions): Response | null {
  const ip = getClientIp(request);
  const key = options.keySuffix
    ? `${request.nextUrl.pathname}:${ip}:${options.keySuffix}`
    : `${request.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    evictExpiredIfNeeded();
    store.set(key, { count: 1, resetAt: now + options.windowMs });
    return null;
  }

  if (entry.count >= options.limit) {
    return apiError('Too many requests', 429);
  }

  entry.count += 1;
  return null;
}
