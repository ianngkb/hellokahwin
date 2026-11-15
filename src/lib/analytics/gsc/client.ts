import 'server-only';
import { mintGscAccessToken, readGscServiceAccount } from '@/lib/seo/gsc-auth';
import { gscPropertyFor } from '@/lib/seo/gsc-sitemap';

/**
 * Search Console's Search Analytics API — the one endpoint the nightly sync
 * reads. Ported from The Wedding Notebook's `src/lib/gsc/client.ts` (URL
 * Inspection left out: nothing here reads it).
 *
 * Auth is HelloKahwin's existing service-account flow (`@/lib/seo/gsc-auth`,
 * `GSC_SERVICE_ACCOUNT_JSON`) — one place a token is minted — and the property
 * is the one the sitemap submission already uses (`gscPropertyFor`). Raw
 * `fetch`, no `googleapis` dependency.
 */

const SEARCH_ANALYTICS_BASE = 'https://www.googleapis.com/webmasters/v3/sites';

/** The API caps a single response at 25,000 rows; more requires startRow paging. */
export const GSC_MAX_ROW_LIMIT = 25_000;

/**
 * `final` returns only settled data; `all` includes the last 1–2 days Google
 * is still revising — right for a self-healing rolling refresh.
 */
export type GscDataState = 'all' | 'final';

export interface GscRow {
  /** Positionally aligned with the request's `dimensions`. */
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  /** An AVERAGE. Never sum or re-average across rows without impression-weighting. */
  position: number;
}

export interface GscSession {
  token: string;
  /** The property, e.g. `https://hellokahwin.com/` (URL-prefix, trailing slash). */
  property: string;
}

/** Thrown when there is no usable credential or Google refuses the token exchange. */
export class GscAuthError extends Error {}

/**
 * Mint one access token for the whole run (it lives an hour). Throws
 * `GscAuthError` with Google's own words when it cannot — never the key.
 */
export async function openGscSession(siteBaseUrl: string): Promise<GscSession> {
  const sa = readGscServiceAccount();
  if (!sa) {
    throw new GscAuthError(
      'neither GSC_SERVICE_ACCOUNT_JSON nor a readable GSC_CREDENTIALS_PATH is set',
    );
  }
  const { token, detail } = await mintGscAccessToken(sa);
  if (!token) throw new GscAuthError(`could not get a Search Console token: ${detail}`);
  return { token, property: gscPropertyFor(siteBaseUrl) };
}

const RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** POST with bounded exponential backoff on 429/5xx/network errors; 403 fails fast. */
async function postJson<T>(
  session: GscSession,
  url: string,
  body: unknown,
  { maxAttempts = 4, baseDelayMs = 1000 }: { maxAttempts?: number; baseDelayMs?: number } = {},
): Promise<T> {
  let lastError = '';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let res: Response;
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(60_000),
      });
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      if (attempt < maxAttempts) await sleep(2 ** (attempt - 1) * baseDelayMs);
      continue;
    }
    if (res.ok) return (await res.json()) as T;
    lastError = `${res.status} ${(await res.text().catch(() => '')).slice(0, 300)}`;
    if (res.status === 403) {
      throw new Error(
        `Search Console returned 403 for ${session.property}: the service account is not a user ` +
          `on this property, or the Search Console API is off in its Google Cloud project. ` +
          `Raw: ${lastError}`,
      );
    }
    if (!RETRYABLE_STATUS.has(res.status)) throw new Error(`GSC request failed: ${lastError}`);
    if (attempt < maxAttempts) await sleep(2 ** (attempt - 1) * baseDelayMs);
  }
  throw new Error(`GSC request failed after ${maxAttempts} attempts: ${lastError}`);
}

export interface PaginateResult {
  rows: GscRow[];
  apiCalls: number;
  /** True if we stopped at `maxCalls` rather than because the data ran out. */
  truncated: boolean;
}

/**
 * Every row of a `date × page` (or any) Search Analytics query, paging until a
 * short page comes back. `maxCalls` is a runaway guard: a 5-day date×page
 * pull for this site is one call.
 */
export async function searchAnalyticsAll(
  session: GscSession,
  req: {
    startDate: string;
    endDate: string;
    dimensions: Array<'date' | 'page' | 'query'>;
    dataState?: GscDataState;
  },
  { maxCalls = 20, pauseMs = 250, baseDelayMs = 1000 } = {},
): Promise<PaginateResult> {
  const url = `${SEARCH_ANALYTICS_BASE}/${encodeURIComponent(session.property)}/searchAnalytics/query`;
  const rows: GscRow[] = [];
  let apiCalls = 0;
  for (let startRow = 0; apiCalls < maxCalls; startRow += GSC_MAX_ROW_LIMIT) {
    const res = await postJson<{ rows?: GscRow[] }>(
      session,
      url,
      {
        startDate: req.startDate,
        endDate: req.endDate,
        dimensions: req.dimensions,
        dataState: req.dataState ?? 'final',
        type: 'web',
        rowLimit: GSC_MAX_ROW_LIMIT,
        startRow,
      },
      { baseDelayMs },
    );
    apiCalls++;
    const batch = res.rows ?? [];
    rows.push(...batch);
    if (batch.length < GSC_MAX_ROW_LIMIT) return { rows, apiCalls, truncated: false };
    if (pauseMs) await sleep(pauseMs);
  }
  return { rows, apiCalls, truncated: true };
}
