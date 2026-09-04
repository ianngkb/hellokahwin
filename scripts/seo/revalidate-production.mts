#!/usr/bin/env node
/**
 * Drop BOTH production content caches after a direct database write.
 *
 * WHY THIS IS NOT OPTIONAL AFTER A CLI WRITE. The public read layer caches
 * with `revalidate: false` and relies entirely on `revalidateTag` firing from
 * the admin write paths. These SEO scripts write to Postgres from outside the
 * running app, so none of those paths fire, and Vercel's Data Cache survives a
 * redeploy — shipping new code does NOT clear it.
 *
 * ── WHY ONE CALL IS NOT ENOUGH ────────────────────────────────────────────
 *
 * There are two caches in front of a reader and `/api/cron/revalidate-content`
 * reaches only the inner one. `next.config.ts` sets an explicit
 * `Vercel-CDN-Cache-Control` on `/artikel/:category` and
 * `/artikel/:category/:slug` (`s-maxage=300, stale-while-revalidate=600`) and
 * `s-maxage=3600` on `/sitemap.xml`. Those CDN entries are created by the
 * header, nothing in Next knows they exist, and `stale-while-revalidate` means
 * the FIRST request past the TTL is served the old copy while the refresh
 * happens behind it. If that request is Googlebot's, Google indexes the
 * pre-write page. Measured 25 Ogos 2026 (log in `@/lib/cache/purge`): 457
 * seconds after a write, past the 300s TTL, the pillar still answered
 * `x-vercel-cache: STALE age: 717` with the old robots tag.
 *
 * So this runs the origin purge and then `purgeVercelEdge`, and a failure of
 * either is a failure of the run. Reporting "revalidated" after clearing one
 * of two caches is the shape of the bug, not the fix.
 *
 * ── THE SECRET NEVER TOUCHES DISK ─────────────────────────────────────────
 * `CRON_SECRET` lives in the project's Vercel production environment. This
 * reads it through the Vercel REST API into memory and sends it straight back
 * out as a Bearer token. It is deliberately NOT `vercel env pull`, which
 * writes every production secret to a file in the working tree, and it is
 * never logged: the only thing printed is the HTTP status and the route's own
 * JSON reply.
 *
 * ── WHAT A 200 PROVES ─────────────────────────────────────────────────────
 * That the request was accepted, and no more. A purge tag nobody ever stamped
 * also answers 200 (verified 26 Ogos 2026), and there is no read-back API. The
 * real proof is the acceptance verifier reading the live pages afterwards, so
 * run `scripts/seo/verify-content-acceptance.mjs` after this, not instead of it.
 *
 * Usage (VERCEL_TOKEN injected, never typed):
 *   pwsh -File scripts/seo/run-with-vercel.ps1 pnpm exec tsx scripts/seo/revalidate-production.mts
 */
import {
  edgePurgeFailureNotice,
  edgePurgeSuccessNotice,
  purgeVercelEdge,
} from '../../src/lib/cache/edge-purge';

const token = process.env.VERCEL_TOKEN;
if (!token)
  throw new Error('VERCEL_TOKEN is not set. Run through scripts/seo/run-with-vercel.ps1.');

const PROJECT = 'hellokahwin';
const SITE = 'https://hellokahwin.com';

const api = async (path: string) => {
  const res = await fetch(`https://api.vercel.com${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Vercel API ${path} -> ${res.status} ${res.statusText}`);
  return res.json() as Promise<Record<string, unknown>>;
};

/**
 * Every path this batch invalidated: every article, every category hub, the
 * article index, the homepage and the sitemap.
 *
 * The paths ARE the tags — see `@/lib/cache/edge-purge` for why Vercel offers
 * no purge-by-path — and each is stamped by the route's own render. A hub's
 * `?page=2` and `?sub=…` variants are separate CDN entries under the same tag,
 * so one purge takes all of them.
 */
async function invalidatedPaths(): Promise<string[]> {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': 'hk-purge' } });
  if (!res.ok) throw new Error(`could not read the sitemap to enumerate paths: HTTP ${res.status}`);
  const xml = await res.text();
  const paths = new Set<string>(['/', '/artikel', '/sitemap.xml']);
  for (const m of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    try {
      const { pathname } = new URL(m[1]);
      paths.add(pathname);
      // The hub above an article is invalidated by any change to that article.
      const segments = pathname.split('/').filter(Boolean);
      if (segments[0] === 'artikel' && segments.length === 3) {
        paths.add(`/artikel/${segments[1]}`);
      }
    } catch {
      // A malformed <loc> is the sitemap's problem, not a reason to skip the purge.
    }
  }
  return [...paths];
}

const envs = (await api(`/v9/projects/${PROJECT}/env`)) as {
  envs: { id: string; key: string; target?: string[] }[];
};
const row = envs.envs.find(
  (e) => e.key === 'CRON_SECRET' && (e.target ?? []).includes('production'),
);
if (!row) throw new Error('no production CRON_SECRET on the hellokahwin project');

const decrypted = (await api(`/v9/projects/${PROJECT}/env/${row.id}?decrypt=true`)) as {
  value?: string;
};
if (!decrypted.value) throw new Error('Vercel returned no value for CRON_SECRET');

// 1. The origin data cache.
const originRes = await fetch(`${SITE}/api/cron/revalidate-content`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${decrypted.value}` },
});
const originBody = await originRes.text();
console.log(
  `origin  POST /api/cron/revalidate-content -> ${originRes.status} ${originRes.statusText}`,
);
console.log(`        ${originBody}`);

// 2. The Vercel CDN copy of the rendered HTML, which the call above cannot reach.
const paths = await invalidatedPaths();
console.log(`edge    purging ${paths.length} paths`);
const purge = await purgeVercelEdge(paths);
console.log(purge.ok ? edgePurgeSuccessNotice(purge) : edgePurgeFailureNotice(purge));

if (!originRes.ok || !purge.ok) {
  console.error('\nREVALIDATION INCOMPLETE — readers may still be served the pre-write pages.');
  process.exit(1);
}
