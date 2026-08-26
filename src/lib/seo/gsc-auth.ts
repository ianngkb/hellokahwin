import { createSign } from 'node:crypto';
import { readFileSync } from 'node:fs';

/**
 * The one place a Search Console access token is minted.
 *
 * This was lifted out of `@/lib/seo/gsc-sitemap` when a SECOND caller appeared
 * (`@/lib/seo/gsc-url-inspection`, the indexing monitor). Two copies of a
 * service-account flow is two places to fix a clock-skew bug, two places that
 * can start logging the private key, and — the one that actually bites — two
 * places where a scope can quietly drift apart, so that submitting a sitemap
 * works and inspecting a URL 403s for a reason nobody can see. There is one
 * copy. Add the third caller here.
 *
 * ⚠ IF YOU ARE MERGING `gsc-sitemap.ts` INTO `master` AND IT STILL CARRIES ITS
 * OWN `readServiceAccount` / `accessToken`: delete them and import from here.
 * On 27 Aug 2026 RISK-04's sitemap submission was live in production but its
 * source had not reached `master`, so this module shipped alone and the
 * de-duplication rides on RISK-04's branch (`fix(seo): cap the year-long stale
 * window…`). Landing that branch without doing the swap restores exactly the
 * two-copy problem this file was created to remove.
 *
 * ── THE CREDENTIAL ────────────────────────────────────────────────────────
 *
 * `hellokahwin-gsc@twn-new.iam.gserviceaccount.com`, which holds `siteFullUser`
 * on the `https://hellokahwin.com/` property. Supply it as EITHER:
 *
 *   GSC_SERVICE_ACCOUNT_JSON  the JSON itself (Doppler: project `hellokahwin`,
 *                             config `prd`; GitHub Actions: repository secret), or
 *   GSC_CREDENTIALS_PATH      a path to the JSON file (the local MCP server
 *                             already sets this to
 *                             ~/.claude/secrets/gsc-service-account.json).
 *
 * The private key is never logged, never returned in a `detail`, and never
 * placed on a command line.
 *
 * Both are read at CALL time, not at module load — the ingest CLI settles its
 * environment inside `main()` (`bootstrapEnv`), so anything captured at import
 * time would predate the `.env` files. Same trap as `@/lib/cache/edge-purge`.
 *
 * ── WHY `webmasters` AND NOT `webmasters.readonly` ────────────────────────
 *
 * `webmasters` is the read/write scope. The sitemap submission needs it. URL
 * inspection would be happy with `webmasters.readonly`, but a token is minted
 * per call and the two callers share this code, so asking for the wider scope
 * once is simpler than carrying two scopes to keep in sync. The service account
 * is already a full user on the property; the scope is not the thing holding
 * anything back.
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';

/** Read/write Search Console scope. See the header for why not `.readonly`. */
export const GSC_SCOPE = 'https://www.googleapis.com/auth/webmasters';

export interface GscServiceAccount {
  client_email: string;
  private_key: string;
}

/**
 * The service account, from whichever of the two env vars is set.
 *
 * Returns null rather than throwing: a missing credential is a degradation, not
 * a corruption, and it must not take down a caller that has already done its
 * durable work. Every caller is responsible for saying loudly that it degraded.
 */
export function readGscServiceAccount(): GscServiceAccount | null {
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
    const parsed = JSON.parse(raw) as Partial<GscServiceAccount>;
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
 *
 * Never throws. On failure `token` is undefined and `detail` carries Google's
 * own words, because `invalid_grant` (clock skew or a revoked key) and
 * `unauthorized_client` (the SA was never granted the scope) need completely
 * different responses and only the literal body separates them.
 */
export async function mintGscAccessToken(
  sa: GscServiceAccount,
  scope: string = GSC_SCOPE,
): Promise<{ token?: string; detail: string }> {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
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
    return {
      detail: `could not sign the assertion: ${err instanceof Error ? err.message : String(err)}`,
    };
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
      // The body of a FAILED exchange carries no token, so quoting it is safe.
      return { detail: `token exchange HTTP ${res.status} ${text.slice(0, 300)}` };
    }
    const token = (JSON.parse(text) as { access_token?: string }).access_token;
    if (!token) return { detail: 'token exchange returned no access_token' };
    return { token, detail: 'ok' };
  } catch (err) {
    return { detail: err instanceof Error ? err.message : String(err) };
  }
}
