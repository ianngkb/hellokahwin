import { mintGscAccessToken, readGscServiceAccount } from './gsc-auth';

/**
 * Ask Google what it actually knows about a URL — the read half of the sitemap
 * story, and the only thing on this property that can tell you an article is
 * dark.
 *
 * READ `@/lib/seo/gsc-sitemap` FIRST. That module ASKS Google to re-read the
 * sitemap and its own header is explicit that a 204 proves acceptance and
 * nothing else: not a fetch, not an index. This module is the instrument that
 * closes that gap. Everything downstream of it — `@/lib/seo/indexing-alarm`,
 * `scripts/indexing-monitor.mts` — exists because on 27 Aug 2026 the owner ran
 * a URL inspection BY HAND and found five published articles Google had never
 * heard of. Nothing in the system would have found them, and nothing would have
 * found the next five.
 *
 * ── THE ENDPOINT, AND WHY IT IS NOT THE INDEXING API ──────────────────────
 *
 * `POST https://searchconsole.googleapis.com/v1/urlInspection/index:inspect` is
 * READ-ONLY. It reports; it never asks for anything to be crawled or indexed.
 * That distinction matters here more than usual: Google's *Indexing* API is
 * restricted to `JobPosting` and `BroadcastEvent` and calling it for an article
 * is a policy violation against the whole property (see the gsc-sitemap header;
 * it was proposed at the 26 Aug 2026 board and withdrawn in the same meeting).
 * Inspection carries none of that. It is the sanctioned way to ask.
 *
 * ── QUOTA, WHICH IS THE THING THAT WILL BITE ──────────────────────────────
 *
 * Google documents 2,000 inspections per property per DAY and 600 per MINUTE.
 * The live sitemap carries 86 URLs, so a daily full sweep spends about 4% of
 * the daily budget — but a caller that loops without a concurrency limit will
 * hit the per-minute ceiling and start collecting 429s, and a 429 that is
 * swallowed turns "we inspected everything" into a lie. This module retries a
 * 429 or a 5xx three times with linear backoff and, if it still fails, returns
 * `ok: false`. Callers MUST treat `ok: false` as "the monitor is blind", never
 * as "the URL is fine". `scripts/indexing-monitor.mts` fails its run over it.
 *
 * ── `languageCode`, AND THE SILENT BREAK IT HIDES ─────────────────────────
 *
 * `coverageState` is a HUMAN-READABLE, LOCALISED string — "Submitted and
 * indexed", "URL is unknown to Google", "Discovered - currently not indexed".
 * There is no enum. Any code matching on it is matching on English prose, so
 * this module pins `languageCode: 'en-US'` on every request. Drop that and
 * Google may answer in another locale, every substring test downstream quietly
 * returns false, and the monitor reports a clean sweep forever. That is exactly
 * the failure mode this whole item exists to prevent, so `@/lib/seo/
 * indexing-alarm` deliberately does NOT rely on the string alone — it has a
 * structural fallback. Do not delete either half.
 */

const INSPECT_ENDPOINT = 'https://searchconsole.googleapis.com/v1/urlInspection/index:inspect';

/** What Google reported for one URL. Every field is exactly what the API said. */
export interface UrlInspectionResult {
  /** The URL that was inspected. */
  url: string;
  /**
   * True only when Google ANSWERED. False means we do not know the state of
   * this URL — never that the URL is healthy.
   */
  ok: boolean;
  /** Localised prose, e.g. `Submitted and indexed`. Null when Google did not answer. */
  coverageState: string | null;
  /** `PASS` | `NEUTRAL` | `FAIL` | `VERDICT_UNSPECIFIED`. */
  verdict: string | null;
  /** `INDEXING_ALLOWED` | `BLOCKED_BY_META_TAG` | … | `INDEXING_STATE_UNSPECIFIED`. */
  indexingState: string | null;
  /** `ALLOWED` | `DISALLOWED` | `ROBOTS_TXT_STATE_UNSPECIFIED`. */
  robotsTxtState: string | null;
  /** `SUCCESSFUL` | `NOT_FOUND` | … | `PAGE_FETCH_STATE_UNSPECIFIED`. */
  pageFetchState: string | null;
  /** ISO 8601, or null when Googlebot has never fetched this URL. */
  lastCrawlTime: string | null;
  /** The URL Google picked as canonical — a mismatch is its own class of dark. */
  googleCanonical: string | null;
  /** The canonical the page itself declares. */
  userCanonical: string | null;
  /** Sitemaps Google says this URL was found in. Empty when Google has not tied it to one. */
  sitemaps: string[];
  /** Deep link into Search Console for a human to open. */
  inspectionResultLink: string | null;
  /** The literal API answer, or the error. Never contains credentials. */
  detail: string;
}

interface IndexStatusResult {
  verdict?: string;
  coverageState?: string;
  robotsTxtState?: string;
  indexingState?: string;
  lastCrawlTime?: string;
  pageFetchState?: string;
  googleCanonical?: string;
  userCanonical?: string;
  sitemap?: string[];
}

/** The reason string used when there is no credential at all. */
export const NO_CREDENTIAL_DETAIL =
  'neither GSC_SERVICE_ACCOUNT_JSON nor a readable GSC_CREDENTIALS_PATH is set, so Google was never asked';

function blank(url: string, detail: string): UrlInspectionResult {
  return {
    url,
    ok: false,
    coverageState: null,
    verdict: null,
    indexingState: null,
    robotsTxtState: null,
    pageFetchState: null,
    lastCrawlTime: null,
    googleCanonical: null,
    userCanonical: null,
    sitemaps: [],
    inspectionResultLink: null,
    detail,
  };
}

/**
 * A token, minted once and reused for a whole sweep.
 *
 * 86 URLs is 86 requests. Minting a JWT per request would be 86 extra round
 * trips to Google's token endpoint for no benefit — the token lives an hour and
 * a sweep takes under a minute. Callers hold this and pass it in.
 */
export interface GscInspector {
  token: string;
  siteUrl: string;
}

/**
 * Build an inspector, or say why not.
 *
 * Returns `{ inspector }` on success and `{ detail }` on failure. It never
 * throws and it never returns a half-built inspector, so a caller cannot
 * accidentally sweep with no credential and report a clean result.
 */
export async function createGscInspector(
  siteUrl: string,
): Promise<{ inspector?: GscInspector; detail: string }> {
  const sa = readGscServiceAccount();
  if (!sa) return { detail: NO_CREDENTIAL_DETAIL };
  const { token, detail } = await mintGscAccessToken(sa);
  if (!token) return { detail };
  return { inspector: { token, siteUrl }, detail: 'ok' };
}

/**
 * Inspect one URL.
 *
 * Never throws. Retries a 429 or 5xx three times with linear backoff, because
 * the per-minute quota ceiling and a transient Google 503 are both recoverable
 * and neither should be recorded as a fact about the URL. A 4xx other than 429
 * is a fact about the REQUEST — a 403 means the service account is not on the
 * property, a 404 means the property string is wrong — and retrying gets the
 * same answer twice more while delaying the operator seeing it.
 */
export async function inspectUrl(
  inspector: GscInspector,
  url: string,
): Promise<UrlInspectionResult> {
  let detail = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(INSPECT_ENDPOINT, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${inspector.token}`,
          'content-type': 'application/json',
        },
        // `languageCode` is pinned. See the header — this is what keeps
        // `coverageState` in the English the downstream matcher was written
        // against.
        body: JSON.stringify({
          inspectionUrl: url,
          siteUrl: inspector.siteUrl,
          languageCode: 'en-US',
        }),
        signal: AbortSignal.timeout(30_000),
      });
      const text = await res.text();

      if (res.ok) {
        const parsed = JSON.parse(text) as {
          inspectionResult?: {
            indexStatusResult?: IndexStatusResult;
            inspectionResultLink?: string;
          };
        };
        const status = parsed.inspectionResult?.indexStatusResult;
        if (!status) {
          // A 200 with no indexStatusResult is not a healthy URL, it is an
          // answer we cannot read. Say so rather than defaulting to nulls that
          // look like "unknown to Google".
          detail = `HTTP 200 but no indexStatusResult in the body: ${text.slice(0, 300)}`;
          return blank(url, detail);
        }
        return {
          url,
          ok: true,
          coverageState: status.coverageState ?? null,
          verdict: status.verdict ?? null,
          indexingState: status.indexingState ?? null,
          robotsTxtState: status.robotsTxtState ?? null,
          pageFetchState: status.pageFetchState ?? null,
          lastCrawlTime: status.lastCrawlTime ?? null,
          googleCanonical: status.googleCanonical ?? null,
          userCanonical: status.userCanonical ?? null,
          sitemaps: status.sitemap ?? [],
          inspectionResultLink: parsed.inspectionResult?.inspectionResultLink ?? null,
          detail: `HTTP ${res.status}`,
        };
      }

      detail = `HTTP ${res.status}${text ? ` ${text.slice(0, 300)}` : ''}`;
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable) return blank(url, detail);
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 2000));
  }
  return blank(url, detail);
}
