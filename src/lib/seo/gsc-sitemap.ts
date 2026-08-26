import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

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
 * done here with `node:crypto` rather than by pulling `googleapis` (≈50 MB of
 * transitive dependency) into a Next.js app's tree for two HTTP calls.
 *
 * The credential is the `hellokahwin-gsc@twn-new.iam.gserviceaccount.com`
 * service account, which holds `siteFullUser` on the `https://hellokahwin.com/`
 * property. Supply it as EITHER:
 *
 *   GSC_SERVICE_ACCOUNT_JSON  the JSON itself (Doppler: project `hellokahwin`,
 *                             config `prd`), or
 *   GSC_CREDENTIALS_PATH      a path to the JSON file (the local MCP server
 *                             already sets this to
 *                             ~/.claude/secrets/gsc-service-account.json).
 *
 * The private key is never logged, never returned in `detail`, and never placed
 * on a command line.
 *
 * Both are read at CALL time, not at module load — the ingest CLI settles its
 * environment inside `main()` (`bootstrapEnv`), so anything captured at import
 * time would predate the `.env` files. Same trap as `@/lib/cache/edge-purge`.
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const SCOPE = 'https://www.googleapis.com/auth/webmasters';
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

interface ServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * The service account, from whichever of the two env vars is set.
 *
 * Returns null rather than throwing: a missing credential is a degradation
 * (Google finds the article on its own schedule instead of ours), not a
 * corruption, and it must not take down a publish that has already written
 * correctly.
 */
function readServiceAccount(): ServiceAccount | null {
  const inline = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const path = process.env.GSC_CREDENTIALS_PATH;
  let raw: string | undefined;
  if (inline && inline.trim()) raw = inline;
  else if (path && path.trim()) {
    try {
      raw = readFileSync(path, 'utf8');
    } catch {
      return null;
    }
  }
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<ServiceAccount>;
    if (!parsed.client_email || !parsed.private_key) return null;
    return { client_email: parsed.client_email, private_key: parsed.private_key };
  } catch {
    return null;
  }
}

const b64url = (input: string | Buffer) =>
  Buffer.from(input).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

/**
 * Mint an access token from the service account.
 *
 * The JWT is `RS256(header.claims)` with a one-hour life. `iat` is backdated by
 * sixty seconds: Google rejects a token whose `iat` is in the future, and a
 * workstation clock that is a few seconds fast is a completely invisible reason
 * for a publish to stop telling Google anything.
 */
async function accessToken(sa: ServiceAccount): Promise<{ token?: string; detail: string }> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: SCOPE,
      aud: TOKEN_ENDPOINT,
      iat: now - 60,
      exp: now + 3600,
    }),
  );
  let assertion: string;
  try {
    const signer = createSign('RSA-SHA256');
    signer.update(`${header}.${claims}`);
    assertion = `${header}.${claims}.${b64url(signer.sign(sa.private_key))}`;
  } catch (err) {
    // A malformed private key lands here. The message is about the key's SHAPE
    // (bad PEM, wrong type) and never contains the key, which is why it is safe
    // to surface — an operator cannot fix this one without being told.
    return { detail: `could not sign the assertion: ${err instanceof Error ? err.message : String(err)}` };
  }

  try {
    const res = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
      signal: AbortSignal.timeout(15_000),
    });
    const text = await res.text();
    if (!res.ok) {
      // Google's own reason, verbatim: `invalid_grant` (clock skew or a revoked
      // key) and `unauthorized_client` (the SA was never granted the scope)
      // need completely different responses, and only the literal body
      // separates them. The body of a FAILED exchange carries no token.
      return { detail: `token exchange HTTP ${res.status} ${text.slice(0, 300)}` };
    }
    const token = (JSON.parse(text) as { access_token?: string }).access_token;
    if (!token) return { detail: 'token exchange returned no access_token' };
    return { token, detail: 'ok' };
  } catch (err) {
    return { detail: err instanceof Error ? err.message : String(err) };
  }
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
  const sa = readServiceAccount();
  if (!sa) {
    return {
      ...base,
      ok: false,
      skipped: true,
      detail:
        'neither GSC_SERVICE_ACCOUNT_JSON nor a readable GSC_CREDENTIALS_PATH is set, so Google was not told',
    };
  }

  const { token, detail: tokenDetail } = await accessToken(sa);
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
