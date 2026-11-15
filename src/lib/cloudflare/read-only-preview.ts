/**
 * The read-only switch for the Cloudflare preview Worker (docs/cloudflare.md).
 *
 * The preview on `*.workers.dev` renders the SAME Supabase database as
 * hellokahwin.com — there is only one. Two guards keep it from writing:
 *
 *   1. The database itself. The Worker connects (through Hyperdrive) as the
 *      read-only role Vercel's own preview deployments use: INSERT/UPDATE are
 *      refused by Postgres whatever the code does.
 *   2. This file, so a visitor gets a clean answer instead of a 500 from a
 *      refused write. With `HK_READ_ONLY=1` the middleware sends:
 *        - the admin, login and upload surfaces → 403 (Clerk sign-in does not
 *          work on workers.dev anyway, and there is nothing to edit);
 *        - the page-view beacon → 204, recorded nowhere;
 *        - any other non-GET request (Server Actions are POSTs) → 403.
 *      `/api/cron/revalidate-content` stays open: it is CRON_SECRET-gated and
 *      only drops this Worker's own page cache (R2/D1), never the database.
 *
 * Off (unset) everywhere else, including Vercel — the function then returns
 * null and the middleware carries on exactly as before.
 */
export type ReadOnlyVerdict = { status: 204 | 403; reason: string } | null;

const BLOCKED_PREFIXES = ['/admin', '/login', '/no-access', '/api/v1/inspire'];
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const REVALIDATE_PATH = '/api/cron/revalidate-content';
const BEACON_PATH = '/api/v1/analytics/collect';

export function readOnlyPreviewVerdict(
  enabled: boolean,
  method: string,
  pathname: string,
): ReadOnlyVerdict {
  if (!enabled) return null;
  if (pathname === BEACON_PATH || pathname === `${BEACON_PATH}/`) {
    return { status: 204, reason: 'read-only preview: page views are not recorded' };
  }
  if (BLOCKED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return { status: 403, reason: 'read-only preview: admin is on hellokahwin.com' };
  }
  if (!SAFE_METHODS.has(method.toUpperCase()) && pathname !== REVALIDATE_PATH) {
    return { status: 403, reason: 'read-only preview: writes are disabled' };
  }
  return null;
}

/** True when this deployment is the read-only Cloudflare preview. */
export function isReadOnlyPreview(): boolean {
  return process.env.HK_READ_ONLY === '1';
}
