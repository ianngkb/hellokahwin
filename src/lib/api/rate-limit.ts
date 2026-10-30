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
 * OLDEST buckets are dropped, in Map insertion order (a bucket is re-inserted
 * whenever its window restarts, so insertion order is window-start order and
 * the first keys are the ones nearest their reset). That is O(overBy) — the
 * earlier version sorted all 10,000 entries on every new IP once the store was
 * full. Losing an old bucket costs an attacker a few extra allowed attempts
 * rather than resetting everybody's counter.
 */
function evictExpiredIfNeeded(): void {
  if (store.size < MAX_STORE_SIZE) return;

  const now = Date.now();
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
  if (store.size < MAX_STORE_SIZE) return;

  // Nothing expired — every bucket is live. Drop the oldest until there is
  // room for the caller's insert.
  let overBy = store.size - MAX_STORE_SIZE + 1;
  for (const key of store.keys()) {
    if (overBy-- <= 0) break;
    store.delete(key);
  }
}

/**
 * The rate-limit identity for an address. IPv4 is used as-is. IPv6 is cut to
 * its /64 prefix: one client is routinely handed a whole /64 and can rotate
 * through it freely, so per-address buckets would not limit anything. An
 * IPv4-mapped IPv6 address (`::ffff:1.2.3.4`) is treated as the IPv4 it carries.
 */
export function rateLimitIdentity(ip: string): string {
  if (!ip.includes(':')) return ip;
  const addr = ip.split('%')[0].toLowerCase();
  if (addr.includes('.')) return addr.slice(addr.lastIndexOf(':') + 1);

  const [head, tail] = addr.split('::');
  const headParts = head ? head.split(':') : [];
  let hextets = headParts;
  if (tail !== undefined) {
    const tailParts = tail ? tail.split(':') : [];
    const zeros = Array(Math.max(0, 8 - headParts.length - tailParts.length)).fill('0');
    hextets = [...headParts, ...zeros, ...tailParts];
  }
  const prefix = hextets
    .slice(0, 4)
    .map((h) => h.replace(/^0+(?=.)/, '') || '0')
    .join(':');
  return `${prefix}::/64`;
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
  const ip = rateLimitIdentity(getClientIp(request));
  const key = options.keySuffix
    ? `${request.nextUrl.pathname}:${ip}:${options.keySuffix}`
    : `${request.nextUrl.pathname}:${ip}`;
  const now = Date.now();

  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    // Delete-then-set moves a restarted bucket to the END of insertion order,
    // which is what lets eviction drop the oldest windows first.
    store.delete(key);
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
