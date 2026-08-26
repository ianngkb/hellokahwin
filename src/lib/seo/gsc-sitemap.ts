import { mintGscAccessToken, readGscServiceAccount } from './gsc-auth';

/**
 * Tell Google the sitemap changed — the third and last cache in a publish.
 *
 * READ `@/lib/cache/edge-purge` FIRST. A publish clears three things in a fixed
 * order and this is the end of that chain:
 *
 *   1. `revalidateTag` empties the Next data cache at the ORIGIN.
 *   2. `purgeVercelEdge` deletes the CDN copies, `/sitemap.xml` among them.
 *   3. this file asks Google to come and read the sitemap again.
 *
 * ── THE ORDER IS NOT COSMETIC ─────────────────────────────────────────────
 *
 * `/sitemap.xml` is the longest-lived edge entry on the site — `s-maxage=3600`
 * (next.config.ts). Ask Google to fetch it before step 2 has run and Google
 * gets the hour-old copy, the one WITHOUT the article that was just published,
 * and records that as the current sitemap. The resubmission then costs a
 * `last_downloaded` that moved and an article Google still has never heard of:
 * the worst possible outcome, because every dashboard says the publish
 * succeeded. Step 3 runs after step 2 or it does not run at all.
 *
 * ── WHY THE SITEMAP AND NOT THE INDEXING API ──────────────────────────────
 *
 * Google's Indexing API is restricted to `JobPosting` and `BroadcastEvent`
 * structured data. Calling it for an article is a policy violation against the
 * property, not a grey area, and the punishment lands on the whole site. It was
 * proposed at the 26 Aug 2026 board and withdrawn in the same meeting. Sitemap
 * resubmission with a truthful `lastmod` is the sanctioned mechanism and this
 * is it. If a future reader thinks they have found a legitimate exception,
 * bring it back to the owner rather than adding the call.
 *
 * IndexNow (`@/lib/seo/indexnow`) is the neighbouring half of this and is NOT
 * a substitute: it notifies Bing and Yandex, and Google does not participate.
 * It also fires only from the admin publish path, never from ingest.
 *
 * ── WHAT A 204 PROVES, AND WHAT IT DOES NOT ───────────────────────────────
 *
 * `PUT .../sitemaps/{feedpath}` answers **204 No Content with an empty body**
 * on success. That is the good outcome and it looks exactly like nothing
 * happening, which is why `detail` says so in words rather than leaving an
 * operator to read an empty string as a failure.
 *
 * It proves Google ACCEPTED the submission. It does not prove Google fetched
 * the sitemap, and it certainly does not prove anything was indexed. The only
 * evidence of the fetch is `last_downloaded` moving on the sitemap in Search
 * Console; the only evidence of indexing is a URL inspection. Callers must not
 * upgrade "204" into "Google has the new article".
 *
 * ── AUTH, WITHOUT A NEW DEPENDENCY ────────────────────────────────────────
 *
 * A service-account flow is one signed JWT and one token exchange, so it is
 * done with `node:crypto` rather than by pulling `googleapis` (≈50 MB of
 * transitive dependency) into a Next.js app's tree for two HTTP calls.
 *
 * That flow used to live in this file. It now lives in `@/lib/seo/gsc-auth`,
 * because the indexing monitor (`@/lib/seo/gsc-url-inspection`) became a second
 * caller and a service-account flow duplicated is a scope that can drift.
 * Nothing about the credential, the env vars or the call-time reads changed —
 * read `gsc-auth` for all of it.
 */

const API = 'https://www.googleapis.com/webmasters/v3/sites';

export interface GscSitemapResult {
  /** True only if Google accepted the submission. See the header comment for what that does and does not mean. */
  ok: boolean;
  /** The GSC property the submission was made against. */
  siteUrl: string;
  /** The sitemap URL that was submitted. */
  sitemapUrl: string;
  /** The literal API answer: `HTTP 204 (empty body — success)`, `HTTP 403 {…}`, or a network error. */
  detail: string;
  /** True when no credential was available, so nothing was even attempted. */
  skipped: boolean;
}

/**
 * Resubmit `sitemapUrl` to Google for the `siteUrl` property.
 *
 * Never throws, for the same reason `purgeVercelEdge` never throws: the article
 * is already written and already live, and a publishing step that fails AFTER
 * the durable write must degrade loudly rather than crash the run. Callers are
 * responsible for saying so.
 */
export async function submitSitemapToGsc(
  siteUrl: string,
  sitemapUrl: string,
): Promise<GscSitemapResult> {
  const base = { siteUrl, sitemapUrl };
  const sa = readGscServiceAccount();
  if (!sa) {
    return {
      ...base,
      ok: false,
      skipped: true,
      detail:
        'neither GSC_SERVICE_ACCOUNT_JSON nor a readable GSC_CREDENTIALS_PATH is set, so Google was not told',
    };
  }

  const { token, detail: tokenDetail } = await mintGscAccessToken(sa);
  if (!token) return { ...base, ok: false, skipped: false, detail: tokenDetail };

  const url = `${API}/${encodeURIComponent(siteUrl)}/sitemaps/${encodeURIComponent(sitemapUrl)}`;

  // Three attempts, matching the two purge calls next to it in the ingest. A
  // cold TLS handshake or a momentary 5xx must not be the reason a correctly
  // published article goes unannounced, and resubmitting a sitemap is
  // idempotent — Google records one `last_submitted`, not a queue.
  let detail = '';
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, {
        method: 'PUT',
        headers: { authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(20_000),
      });
      const text = await res.text();
      if (res.ok) {
        // 204 + empty body IS the success shape. Spell it out; an operator
        // reading `HTTP 204` followed by nothing has no way to tell an accepted
        // submission from a truncated log line.
        return {
          ...base,
          ok: true,
          skipped: false,
          detail: text
            ? `HTTP ${res.status} ${text.slice(0, 300)}`
            : `HTTP ${res.status} (empty body — this is Google's success response)`,
        };
      }
      detail = `HTTP ${res.status}${text ? ` ${text.slice(0, 300)}` : ''}`;
      // Every 4xx here is a fact about the request, not a blip: a 403 means the
      // service account is not on the property, a 404 means the property string
      // is wrong (`https://hellokahwin.com/` WITH the trailing slash, not
      // `sc-domain:` — they are different properties). Retrying gets the same
      // answer twice more and delays the operator seeing it.
      if (res.status >= 400 && res.status < 500) {
        return { ...base, ok: false, skipped: false, detail };
      }
    } catch (err) {
      detail = err instanceof Error ? err.message : String(err);
    }
    if (attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
  }
  return { ...base, ok: false, skipped: false, detail };
}

/**
 * The GSC property string for a site base URL.
 *
 * A URL-prefix property is the origin WITH a trailing slash, and Google treats
 * `https://hellokahwin.com/` and `sc-domain:hellokahwin.com` as two different
 * properties with separate verification. The service account is on the former.
 * `GSC_SITE_URL` overrides for anyone pointing this at another property.
 */
export function gscPropertyFor(siteBaseUrl: string): string {
  const override = process.env.GSC_SITE_URL;
  if (override && override.trim()) return override.trim();
  const u = new URL(siteBaseUrl);
  return `${u.protocol}//${u.host}/`;
}

/**
 * The sitemap URL to submit for a property.
 *
 * Derived from the PROPERTY, never from whatever base URL the caller happens to
 * be pointing its cache purges at. Google rejects a sitemap that does not live
 * under the property being submitted to, and the two are not always the same
 * thing: a run can legitimately revalidate one origin (a local server, a
 * preview deployment) while the sitemap that matters is production's. Deriving
 * this from the property makes that combination correct instead of a 400 nobody
 * expected.
 */
export function gscSitemapUrlFor(property: string): string {
  return new URL('/sitemap.xml', property).toString();
}

/** What the operator is told when Google was told. */
export function gscSubmitSuccessNotice(result: GscSitemapResult): string {
  return (
    `Google was asked to re-read the sitemap (${result.detail}):\n` +
    `  property: ${result.siteUrl}\n` +
    `  sitemap : ${result.sitemapUrl}\n` +
    '  This is an ACCEPTANCE, not a fetch and not an indexing. Confirm with the\n' +
    "  sitemap's `last_downloaded` in Search Console, and with a URL inspection\n" +
    '  of the new article within 48h.'
  );
}

/**
 * What the operator is told when Google was NOT told.
 *
 * Same three properties as `edgePurgeFailureNotice`, and for the same reasons:
 * it never contains the success sentence, it names what is actually degraded in
 * terms the operator can act on, and it carries Google's own reason verbatim
 * because a 403 and a clock-skew `invalid_grant` need different responses.
 */
export function gscSubmitFailureNotice(result: GscSitemapResult): string {
  return (
    '\n' +
    '  ════════════════════════════════════════════════════════════════════\n' +
    '  ⚠  GOOGLE WAS NOT TOLD. The article is published, the caches are\n' +
    '     clear and the sitemap is correct — but Search Console was not\n' +
    '     asked to re-read it, so Google will find the article on its own\n' +
    '     schedule, which has run to days on this property.\n' +
    '\n' +
    `     Property: ${result.siteUrl}\n` +
    `     Sitemap : ${result.sitemapUrl}\n` +
    `     Reason  : ${result.detail}\n` +
    '\n' +
    (result.skipped
      ? '     Re-run the ingest with the GSC credential in the environment, or\n' +
        '     resubmit the sitemap by hand in Search Console.\n'
      : '     Resubmit the sitemap by hand in Search Console, or fix the reason\n' +
        '     above and re-run.\n') +
    '  ════════════════════════════════════════════════════════════════════'
  );
}

/** What the operator is told when the sitemap did not change, so Google was deliberately not pestered. */
export function gscSubmitSkippedNotice(sitemapUrl: string): string {
  return (
    'Sitemap NOT resubmitted: this ingest changed nothing the sitemap carries — no\n' +
    'URL added or removed, and no lastmod moved. Resubmitting an unchanged sitemap\n' +
    `teaches Google that ${sitemapUrl} is noisy, which is the opposite of the point.`
  );
}
