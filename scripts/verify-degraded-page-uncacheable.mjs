#!/usr/bin/env node
/**
 * PLAT-16 — prove that a page which CANNOT read its own content does not get
 * served, and therefore cached, as a successful empty page.
 *
 * ── THE FAILING CASE, NAMED ───────────────────────────────────────────────
 *
 * `/artikel/{pillar}` renders `getPillarView`, and `/artikel/{category}`
 * renders `getCategoryArticles`. Both used to be wrapped in a
 * `try { … } catch { console.error }` that left the result at its empty
 * default and carried on rendering. The page then returned HTTP 200 carrying
 * UI-05's empty state — "Panduan ini masih kosong" — which is what a pillar
 * with genuinely nothing in it looks like. `/artikel/:category` is served with
 * `Vercel-CDN-Cache-Control: public, s-maxage=300,
 * stale-while-revalidate=600`, so that 200 is cacheable.
 *
 * ── HOW THE FAILURE IS FORCED, FOR REAL ───────────────────────────────────
 *
 * By taking `ACCESS EXCLUSIVE` on the `articles` table in an open transaction.
 * Every SELECT touching `articles` then BLOCKS — a genuine stall, not a thrown
 * error and not a mock — so `withDeadline(…, 3_000)` misses its deadline
 * exactly the way a production TCP blackhole makes it miss.
 *
 * It is deliberately SELECTIVE. `getCategoryBySlugCached` reads only
 * `inspire_categories` and is untouched, so the route still resolves the
 * category and still reaches the render — which is the precondition for the
 * defect. Locking the whole database instead would fail earlier, on a code
 * path that was never the bug.
 *
 * ── THE TWO ASSERTIONS, AND WHY THERE ARE TWO ─────────────────────────────
 *
 *   A (fires on the defect): while the read is stalled, the response must not
 *     be a cacheable success. Pre-fix this FAILS with `200 + empty state`;
 *     post-fix it PASSES with a 5xx.
 *
 *   B (green control):      once the lock is released, the very next request
 *     must serve the real pillar — the clusters and the article links. This is
 *     the half that proves the instrument can reach exit 0 at all, and that
 *     the marker string A looks for is genuinely absent from a healthy page.
 *
 * A check that has only ever been seen to fail is half-proven. Run it before
 * the fix and after.
 *
 * ── SAFETY ────────────────────────────────────────────────────────────────
 *
 * This script TAKES A TABLE LOCK. It refuses to run against anything that is
 * not loopback, and it asserts that before it opens a connection. `.env` in
 * these worktrees points at the production pooler and `.env.local` overrides
 * it with localhost — so "which file won" is never assumed here, it is
 * checked against the URL actually loaded.
 *
 * Usage:
 *   node scripts/verify-degraded-page-uncacheable.mjs --base http://127.0.0.1:3216
 *   node scripts/verify-degraded-page-uncacheable.mjs --slug hantaran-mas-kahwin
 */

import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

// ── args ────────────────────────────────────────────────────────────────────
function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const BASE = arg('base', 'http://127.0.0.1:3216').replace(/\/$/, '');
const SLUG = arg('slug', 'hantaran-mas-kahwin');
const PATHNAME = `/artikel/${SLUG}`;

// ── env, loaded the way Next loads it: .env then .env.local wins ────────────
function parseEnvFile(file) {
  if (!existsSync(file)) return {};
  const out = {};
  for (const line of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
  }
  return out;
}
const env = {
  ...parseEnvFile(path.join(ROOT, '.env')),
  ...parseEnvFile(path.join(ROOT, '.env.local')),
};
const DATABASE_URL = process.env.PLAT16_DATABASE_URL || env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error(
    'FATAL: no DATABASE_URL in .env/.env.local and none passed as PLAT16_DATABASE_URL.',
  );
  process.exit(2);
}

// ── HARD LOOPBACK ASSERTION — before any connection is opened ───────────────
{
  const u = new URL(DATABASE_URL);
  const LOOPBACK = new Set(['127.0.0.1', 'localhost', '::1', '[::1]']);
  if (!LOOPBACK.has(u.hostname)) {
    console.error(
      `FATAL: refusing to lock a table on a non-loopback host: ${u.hostname}:${u.port}\n` +
        'This script takes ACCESS EXCLUSIVE on `articles`. It runs against the throwaway\n' +
        'local Postgres only. `.env` points at the production pooler; `.env.local` must win.',
    );
    process.exit(2);
  }
  console.log(`LOOPBACK ASSERTION OK  host=${u.hostname} port=${u.port} db=${u.pathname.slice(1)}`);
}

// ── build fingerprint — a rendered measurement belongs to a BUILD, not a URL ─
function sh(cmd) {
  try {
    return execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return '(unavailable)';
  }
}
const routeSrc = path.join(ROOT, 'src/app/(public)/artikel/[category]/page.tsx');
const routeSha = existsSync(routeSrc)
  ? createHash('sha256').update(readFileSync(routeSrc)).digest('hex').slice(0, 12)
  : '(missing)';
// The route's declared ceiling, read from the route rather than restated here.
// `next start` does NOT enforce it, which is the whole reason this has to be
// asserted explicitly — see assertion C.
const declaredMaxDuration = existsSync(routeSrc)
  ? readFileSync(routeSrc, 'utf8').match(/^export const maxDuration = (\d+);$/m)
  : null;
const MAX_DURATION_MS = declaredMaxDuration ? Number(declaredMaxDuration[1]) * 1_000 : null;

const buildId = existsSync(path.join(ROOT, '.next/BUILD_ID'))
  ? readFileSync(path.join(ROOT, '.next/BUILD_ID'), 'utf8').trim()
  : '(no .next/BUILD_ID)';
console.log('── FINGERPRINT ─────────────────────────────────────────────');
console.log(
  `git HEAD          ${sh('git rev-parse --short HEAD')}  (${sh('git status --porcelain | wc -l')} files dirty)`,
);
console.log(`route source sha  ${routeSha}   src/app/(public)/artikel/[category]/page.tsx`);
console.log(
  `route variant     ${/readForCacheablePage/.test(existsSync(routeSrc) ? readFileSync(routeSrc, 'utf8') : '') ? 'FIXED (readForCacheablePage)' : 'PRE-FIX (soft-fail catch)'}`,
);
console.log(
  `route maxDuration ${MAX_DURATION_MS === null ? '(not declared — assertion C will fail)' : `${MAX_DURATION_MS}ms`}`,
);
console.log(`.next/BUILD_ID    ${buildId}`);
console.log(`base              ${BASE}`);
console.log(`target            ${PATHNAME}`);
console.log('────────────────────────────────────────────────────────────');

// ── EVERY instrument failure exits 2, never 1 ─────────────────────────
//
// 1 means "the page is defective". 2 means "this script could not tell". A
// caller that cannot distinguish them will eventually read a crashed run as a
// real finding, or a real finding as a crash. Review found three paths that
// escaped as 1: an unguarded `fetch` when the server is down, the recovery
// probe sitting outside any try, and a missing BUILD_ID silently skipping the
// build guard entirely.
function instrumentFailure(what, detail) {
  console.error(`\nFATAL (instrument, not the page): ${what}`);
  if (detail) console.error(String(detail));
  console.log('PLAT16 EXIT: 2');
  process.exit(2);
}

/** Every request here is bounded. An unbounded probe holds the ACCESS
 *  EXCLUSIVE lock for as long as undici's 300s default, which is not a timeout
 *  anybody chose. */
const PROBE_TIMEOUT_MS = 30_000;

// ── the server must be serving the build we just made ──────────────────────
async function assertServingThisBuild() {
  if (buildId.startsWith('(')) {
    instrumentFailure(
      'no .next/BUILD_ID — cannot prove which build is on the port.',
      'Run `pnpm build` in this worktree first. Skipping this guard is how a run reports\n' +
        'on a stale server while the fingerprint above quotes the source you just edited.',
    );
  }
  let r;
  try {
    r = await fetch(`${BASE}/_next/static/${buildId}/_buildManifest.js`, {
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (err) {
    instrumentFailure(`${BASE} did not answer — is \`next start\` running on that port?`, err);
  }
  if (!r.ok) {
    console.error(
      `FATAL: ${BASE} is not serving BUILD_ID ${buildId} ` +
        `(/_next/static/${buildId}/_buildManifest.js -> ${r.status}).\n` +
        'A stale `next start` on this port would make every number below a measurement of the wrong build.',
    );
    console.log('PLAT16 EXIT: 2');
    process.exit(2);
  }
  console.log(`SERVING BUILD OK  /_next/static/${buildId}/_buildManifest.js -> 200`);
}

// ── markers, ENUMERATED rather than assumed ────────────────────────────────
//
// Both empty states are checked on every run, because the two shapes this
// route can take have different ones and a check that only knows the pillar's
// would return a calm zero on the grid.
//
//   PILLAR  /artikel/{pillar}      -> PillarBody's UI-05 P6 state
//   GRID    /artikel/{category}    -> EmptyCategoryState (design-system)
//
// Expect every count to come back DOUBLED on a healthy page: Next serves the
// rendered HTML and the RSC flight payload in the same document, so every
// string in the tree appears twice. That is why nothing below asserts an exact
// number — only presence, absence, and direction.
//
// AND THEY ARE PINNED TO THEIR SOURCE. Assertions A and B3 are both phrased as
// "this string is ABSENT", which is the direction that passes vacuously if an
// editor rewords the Malay heading: the count goes to 0, A passes, B3 passes,
// and the whole instrument reports PASS against a route serving a cacheable
// empty page. So each marker is checked to still EXIST in the file it came
// from, and a miss is an instrument failure rather than a pass.
const EMPTY_MARKERS = [
  ['pillar-empty', 'Panduan ini masih kosong', 'src/components/inspire/pillar-body.tsx'],
  ['grid-empty', 'Kategori ini masih kosong', 'src/design-system/components/feedback.tsx'],
];
/** Any link to an article: /artikel/{category}/{slug}. Works on both shapes. */
const ARTICLE_HREF = /href="\/artikel\/[^"/]+\/[^"]+"/g;

for (const [name, needle, source] of EMPTY_MARKERS) {
  const file = path.join(ROOT, source);
  if (!existsSync(file) || !readFileSync(file, 'utf8').includes(needle)) {
    instrumentFailure(
      `the \`${name}\` marker "${needle}" is no longer in ${source}.`,
      'This script can only recognise an empty page by the words on it. Update the marker\n' +
        'here in the same change that reworded the copy, or every run below is a no-op that\n' +
        'reports PASS.',
    );
  }
}
console.log(`MARKERS PINNED    ${EMPTY_MARKERS.map(([n]) => n).join(', ')} — present in source`);

function countAll(haystack, needle) {
  let n = 0;
  let i = 0;
  for (;;) {
    const j = haystack.indexOf(needle, i);
    if (j === -1) break;
    n++;
    i = j + needle.length;
  }
  return n;
}

async function probe(label) {
  const t0 = Date.now();
  let res;
  try {
    res = await fetch(`${BASE}${PATHNAME}`, {
      headers: { 'cache-control': 'no-cache' },
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    });
  } catch (err) {
    instrumentFailure(`the "${label}" probe did not complete within ${PROBE_TIMEOUT_MS}ms.`, err);
  }
  const body = await res.text();
  const ms = Date.now() - t0;
  const emptyCounts = EMPTY_MARKERS.map(([name, s]) => [name, countAll(body, s)]);
  const obs = {
    label,
    status: res.status,
    ms,
    bytes: body.length,
    cacheControl: res.headers.get('cache-control') ?? '(none)',
    cdnCacheControl: res.headers.get('vercel-cdn-cache-control') ?? '(none)',
    emptyCounts,
    empty: emptyCounts.reduce((a, [, n]) => a + n, 0),
    links: (body.match(ARTICLE_HREF) ?? []).length,
  };
  console.log(
    `[${label.padEnd(12)}] HTTP ${obs.status}  ${String(ms).padStart(5)}ms  ${String(obs.bytes).padStart(7)}B  ` +
      emptyCounts.map(([n, c]) => `${n}x${c}`).join('  ') +
      `  article-hrefx${obs.links}`,
  );
  console.log(`${' '.repeat(15)}Cache-Control:             ${obs.cacheControl}`);
  console.log(`${' '.repeat(15)}Vercel-CDN-Cache-Control:  ${obs.cdnCacheControl}`);
  return obs;
}

// ── run ─────────────────────────────────────────────────────────────────────
const failures = [];
function assert(id, ok, message) {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${message}`);
  if (!ok) failures.push(`${id}: ${message}`);
}

await assertServingThisBuild();

// `lock_timeout` so a conflicting lock held by anything else fails fast and
// loudly instead of hanging this run with no verdict and no exit.
const sql = postgres(DATABASE_URL, {
  max: 1,
  connect_timeout: 10,
  connection: { lock_timeout: '10s' },
});
let stalled1;
let stalled2;
let recovered;

try {
  console.log('\n── PHASE 1: articles table locked ACCESS EXCLUSIVE ─────────');
  await sql.begin(async (tx) => {
    await tx.unsafe('LOCK TABLE articles IN ACCESS EXCLUSIVE MODE');
    console.log('lock held; every SELECT touching `articles` now blocks.');
    stalled1 = await probe('stalled #1');
    stalled2 = await probe('stalled #2');
    // Rolling back rather than committing: this transaction wrote nothing and
    // must not be able to.
    throw new Error('__release_lock__');
  });
} catch (err) {
  if (!(err instanceof Error) || err.message !== '__release_lock__') {
    // A real failure (e.g. the role may not LOCK) — report it as a failure of
    // the INSTRUMENT, not as a pass.
    console.error('FATAL: could not hold the lock:', err);
    await sql.end({ timeout: 5 });
    process.exit(2);
  }
  console.log('lock released (transaction rolled back).');
}

// ── PRECONDITION GUARD, and it is the most important line in this file ─────
//
// The lock only reaches the render if the render actually issues the query.
// `getPillarView` and `getCategoryArticles` are `unstable_cache(…,
// { revalidate: false })`, so once ANY request has warmed them the next render
// answers from the data cache and never touches Postgres — the lock is held,
// the page is healthy, and every assertion below passes.
//
// That is not hypothetical. Measured 02 Sep 2026: a second run against the
// UNFIXED build returned `HTTP 200 28ms … article-hrefx4` and printed
// `PLAT16 VERDICT: PASS` on code that had failed the identical check twelve
// minutes earlier. A comfortable number, produced by a warm cache rather than
// by the page.
//
// A LATENCY TEST ALONE IS NOT ENOUGH, and this is worth stating because the
// first version of this guard was exactly that. On a PILLAR url,
// `generateMetadata` runs its OWN read against the locked `articles` table
// under its own deadline — so the response can take the full deadline even
// when `getPillarView` answered instantly from a warm cache. A slow answer
// proves something stalled; it does not prove the PAGE's read stalled.
//
// What actually discriminates: a stalled render cannot produce the real page.
// A 2xx carrying article links means the page's read succeeded, the lock never
// reached it, and nothing was tested — whatever the clock said.
const DEADLINE_MS = 3_000;
const COLD_ADVICE =
  'Re-run cold:\n' +
  '  1. stop `next start`\n' +
  '  2. rm -rf .next/cache\n' +
  '  3. restart `next start`, then run this script FIRST, before any other request.';

if (stalled1.status >= 200 && stalled1.status < 400 && stalled1.links > 0) {
  instrumentFailure(
    `the stalled request returned HTTP ${stalled1.status} with ${stalled1.links} article links ` +
      `in ${stalled1.ms}ms — the page's own read answered from the warm Next data cache and ` +
      'never touched the locked table, so NOTHING was tested.',
    COLD_ADVICE,
  );
}
if (stalled1.ms < DEADLINE_MS - 500) {
  instrumentFailure(
    `the stalled request answered in ${stalled1.ms}ms, faster than the ${DEADLINE_MS}ms deadline ` +
      'it was supposed to blow. Measured 02 Sep 2026: a run against the UNFIXED build came back ' +
      '`HTTP 200 28ms … article-hrefx4` and printed `PLAT16 VERDICT: PASS` on code that had ' +
      'failed the identical check twelve minutes earlier.',
    COLD_ADVICE,
  );
}

console.log('\n── PHASE 2: lock released, DB healthy ──────────────────────');
recovered = await probe('recovered');

await sql.end({ timeout: 5 });

console.log('\n── ASSERTIONS ──────────────────────────────────────────────');

// A — fires on the defect.
const cacheableEmpty = stalled1.status >= 200 && stalled1.status < 400 && stalled1.empty > 0;
const which =
  stalled1.emptyCounts
    .filter(([, n]) => n > 0)
    .map(([n]) => n)
    .join(',') || 'none';
assert(
  'A',
  !cacheableEmpty,
  cacheableEmpty
    ? `a stalled content read produced HTTP ${stalled1.status} carrying an empty state (${which}) — ` +
        `and the response is served with Vercel-CDN-Cache-Control: ${stalled1.cdnCacheControl}, ` +
        `so the edge keeps that answer`
    : `a stalled content read did not produce a cacheable empty page (HTTP ${stalled1.status}, empty markers: ${which})`,
);

// A2 — the second stalled request must be a fresh render, not a served copy.
const a2 = stalled2.status === stalled1.status;
assert(
  'A2',
  a2,
  a2
    ? `the second stalled request behaved like the first (HTTP ${stalled1.status} -> ${stalled2.status}), i.e. nothing pinned a copy`
    : `the second stalled request DIFFERED from the first (HTTP ${stalled1.status} -> ${stalled2.status}) — something between the two is holding state`,
);

// B — green control. The instrument must reach a healthy page.
assert('B1', recovered.status === 200, `the request after recovery is HTTP ${recovered.status}`);
assert(
  'B2',
  recovered.links > 0,
  `the recovered page carries ${recovered.links} /artikel/{cat}/{slug} links`,
);
assert(
  'B3',
  recovered.empty === 0,
  `the recovered page carries NO empty-state marker (${recovered.emptyCounts.map(([n, c]) => `${n}x${c}`).join(' ')}) — so those markers really do discriminate`,
);

// ── C — THE ASSERTION THIS SCRIPT SHIPPED WITHOUT, AND SHOULD NOT HAVE ────
//
// `next start` does not enforce `maxDuration`. Vercel does. So a failure path
// measured here can be one this script watched work perfectly and that
// production will never reach — the function is killed first, and the throw,
// the log and the error document all belong to a request that no longer
// exists.
//
// That is not a hypothetical either. This script reported
// `PLAT16 VERDICT: PASS` on a fix whose stalled request took 7,704ms against
// a declared ceiling of 5,000ms. Every assertion above was true and the
// conclusion drawn from them was not, because none of them knew there WAS a
// ceiling. Reviewers found it; the instrument had no opinion.
//
// A LOCAL MEASUREMENT OF A FAILURE PATH IS ONLY EVIDENCE ABOUT PRODUCTION IF
// IT FITS INSIDE THE BUDGET PRODUCTION ENFORCES. Assert the ceiling, or the
// green tick is about the wrong machine.
if (MAX_DURATION_MS === null) {
  assert(
    'C',
    false,
    'could not read `export const maxDuration` from the route — cannot tell whether the ' +
      'measured failure path fits inside the ceiling Vercel enforces',
  );
} else {
  const slowest = Math.max(stalled1.ms, stalled2.ms);
  assert(
    'C',
    slowest < MAX_DURATION_MS,
    slowest < MAX_DURATION_MS
      ? `the stalled request finished in ${slowest}ms, inside the route's declared ` +
          `maxDuration of ${MAX_DURATION_MS}ms — so the throw above is one production reaches`
      : `the stalled request took ${slowest}ms against a declared maxDuration of ` +
          `${MAX_DURATION_MS}ms. Vercel kills the function first, so NEITHER the throw NOR its ` +
          'log ever runs in production and everything asserted above describes a response no ' +
          'reader receives. `next start` does not enforce maxDuration; this line does.',
  );
}

console.log('────────────────────────────────────────────────────────────');
if (failures.length > 0) {
  console.log(`PLAT16 VERDICT: FAIL (${failures.length})`);
  for (const f of failures) console.log(`  - ${f}`);
} else {
  console.log('PLAT16 VERDICT: PASS');
}
console.log(`PLAT16 EXIT: ${failures.length > 0 ? 1 : 0}`);
process.exit(failures.length > 0 ? 1 : 0);
