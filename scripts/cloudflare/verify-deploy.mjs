// Prove that a just-deployed production Worker version is the one answering.
//
//   node scripts/cloudflare/verify-deploy.mjs --sha <git sha> <url> [<url> ...]
//
// For every URL: exactly HTTP 200 (redirects are NOT followed: a 3xx fails),
// and the `x-hk-build` header equal to --sha. The Worker sets that header from
// HK_BUILD_SHA, which cf-production.yml passes at deploy (`--var`), so a
// response from Vercel, from an older Worker version, or from anything else
// fails. Retries a few times while the new version propagates, then exits 1
// naming every mismatch.
export const BUILD_HEADER = 'x-hk-build';

/** One probe: `null` when it matches, else the reason it does not. */
export async function probe(url, sha, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(url, {
      redirect: 'manual',
      headers: { 'cache-control': 'no-cache', 'user-agent': 'hk-verify-deploy' },
    });
  } catch (err) {
    return `${url}: request failed (${err instanceof Error ? err.message : String(err)})`;
  }
  const build = res.headers.get(BUILD_HEADER);
  if (res.status !== 200) return `${url}: HTTP ${res.status} (want exactly 200)`;
  if (build !== sha) return `${url}: ${BUILD_HEADER}=${build ?? '(missing)'} (want ${sha})`;
  return null;
}

/** Every URL must match; retried `attempts` times, `delayMs` apart. */
export async function verifyDeploy(
  { sha, urls, attempts = 6, delayMs = 10_000 },
  fetchImpl = fetch,
  sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
) {
  if (!/^[0-9a-f]{7,40}$/.test(sha ?? '')) throw new Error(`--sha must be a git SHA (got ${sha})`);
  if (!urls?.length) throw new Error('give at least one URL');
  let failures = [];
  for (let i = 1; i <= attempts; i++) {
    failures = (await Promise.all(urls.map((u) => probe(u, sha, fetchImpl)))).filter(Boolean);
    if (failures.length === 0) return [];
    if (i < attempts) await sleep(delayMs);
  }
  return failures;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('scripts/cloudflare/verify-deploy.mjs')) {
  const args = process.argv.slice(2);
  const at = args.indexOf('--sha');
  const sha = at >= 0 ? args[at + 1] : undefined;
  const urls = args.filter((_, i) => i !== at && i !== at + 1);
  const failures = await verifyDeploy({ sha, urls });
  if (failures.length) {
    for (const f of failures) console.error(`MISMATCH ${f}`);
    process.exit(1);
  }
  for (const u of urls) console.log(`ok ${u} -> 200, ${BUILD_HEADER}=${sha}`);
}
