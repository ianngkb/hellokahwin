// Persistent anonymous visitor identifier: the first-party `_hk_vid` cookie.
//
// HelloKahwin has no middleware that sets it on document requests (twn-new
// did), so the client tracker mints it on the first tracked event. Nothing
// sends the value in a payload — the collector reads it from the cookie on the
// request, and only from there.

import { randomUuid } from '@/lib/analytics/uuid';

export const VISITOR_COOKIE_NAME = '_hk_vid';
const TWO_YEARS_SECONDS = 60 * 60 * 24 * 365 * 2;
export const VISITOR_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Memoised for the page load. Without it, a browser with cookies blocked (or a
 * webview where the `document.cookie` write silently no-ops) minted a FRESH
 * uuid on every single call — one visit producing N different visitor ids.
 * Memoising makes the failure honest: one id per page load, and `''` once we
 * know it cannot persist.
 */
let cachedVisitorId: string | null = null;

/**
 * Ensure the `_hk_vid` cookie exists so the SERVER can read it on this and
 * every later request. Not httpOnly by necessity (it is written from script),
 * which is exactly why the collector never trusts a client-supplied id.
 *
 * Returns `''` when the id could not be persisted, which callers must treat as
 * "no identity" rather than inventing one.
 */
export function getOrCreateVisitorIdClient(): string {
  if (typeof document === 'undefined') return '';
  if (cachedVisitorId !== null) return cachedVisitorId;

  const read = () => {
    const match = document.cookie.match(/(?:^|;\s*)_hk_vid=([^;]+)/);
    if (!match) return null;
    // A malformed escape (`%E0%A4`) throws; treat it as no cookie, so a fresh
    // id is minted and the bad cookie overwritten.
    try {
      const value = decodeURIComponent(match[1]);
      return VISITOR_ID_RE.test(value) ? value : null;
    } catch {
      return null;
    }
  };

  const existing = read();
  if (existing) {
    cachedVisitorId = existing;
    return existing;
  }

  const id = randomUuid();
  try {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${VISITOR_COOKIE_NAME}=${id}; Max-Age=${TWO_YEARS_SECONDS}; Path=/; SameSite=Lax${secure}`;
  } catch {
    // Some webviews throw outright rather than no-opping.
  }
  // READ IT BACK. A silent no-op write is the common case in a cookie-blocked
  // browser, and a uuid that did not persist is not an identity.
  cachedVisitorId = read() ?? '';
  return cachedVisitorId;
}

/** Test seam — the memo is module state. */
export function _resetVisitorIdCacheForTest(): void {
  cachedVisitorId = null;
}

/**
 * The visitor id from a raw cookie value: the UUID, or null when the cookie is
 * absent or malformed. The column is `uuid`, so a junk value would fail the
 * whole batch insert — null keeps the row.
 */
export function parseVisitorIdCookie(raw: string | undefined | null): string | null {
  return raw && VISITOR_ID_RE.test(raw) ? raw : null;
}
