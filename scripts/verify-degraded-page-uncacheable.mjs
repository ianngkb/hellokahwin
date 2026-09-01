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
console.log(`.next/BUILD_ID    ${buildId}`);
console.log(`base              ${BASE}`);
console.log(`target            ${PATHNAME}`);
console.log('────────────────────────────────────────────────────────────');

// ── the server must be serving the build we just made ──────────────────────
async function assertServingThisBuild() {
  if (buildId.startsWith('(')) return;
  const r = await fetch(`${BASE}/_next/static/${buildId}/_buildManifest.js`);
  if (!r.ok) {
    console.error(
      `FATAL: ${BASE} is not serving BUILD_ID ${buildId} ` +
        `(/_next/static/${buildId}/_buildManifest.js -> ${r.status}).\n` +
        'A stale `next start` on this port would make every number below a measurement of the wrong build.',
    );
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
const EMPTY_MARKERS = [
  ['pillar-empty', 'Panduan ini masih kosong'],
  ['grid-empty', 'Kategori ini masih kosong'],
];
const ERROR_MARKER = 'Ada masalah teknikal'; // src/app/error.tsx
/** Any link to an article: /artikel/{category}/{slug}. Works on both shapes. */
const ARTICLE_HREF = /href="\/artikel\/[^"/]+\/[^"]+"/g;

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
  const res = await fetch(`${BASE}${PATHNAME}`, { headers: { 'cache-control': 'no-cache' } });
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
    error: countAll(body, ERROR_MARKER),
    links: (body.match(ARTICLE_HREF) ?? []).length,
  };
  console.log(
    `[${label.padEnd(12)}] HTTP ${obs.status}  ${String(ms).padStart(5)}ms  ${String(obs.bytes).padStart(7)}B  ` +
      emptyCounts.map(([n, c]) => `${n}x${c}`).join('  ') +
      `  error-pagex${obs.error}  article-hrefx${obs.links}`,
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

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 10 });
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
// A genuine stall CANNOT come back inside the 3s deadline. So: a fast answer
// here is an INSTRUMENT failure (exit 2), never a pass.
const DEADLINE_MS = 3_000;
if (stalled1.ms < DEADLINE_MS - 500) {
  console.error(
    `\nFATAL (instrument, not the page): the stalled request answered in ${stalled1.ms}ms, ` +
      `faster than the ${DEADLINE_MS}ms deadline it was supposed to blow.\n` +
      'The Next data cache was warm, so the locked table was never read and NOTHING was tested.\n' +
      'Re-run cold:\n' +
      '  1. stop `next start`\n' +
      '  2. rm -rf .next/cache\n' +
      '  3. restart `next start`, then run this script FIRST, before any other request.\n',
  );
  process.exit(2);
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
assert(
  'A2',
  stalled2.status === stalled1.status,
  `the second stalled request behaved like the first (HTTP ${stalled1.status} -> ${stalled2.status}), i.e. nothing pinned a copy`,
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

console.log('────────────────────────────────────────────────────────────');
if (failures.length > 0) {
  console.log(`PLAT16 VERDICT: FAIL (${failures.length})`);
  for (const f of failures) console.log(`  - ${f}`);
} else {
  console.log('PLAT16 VERDICT: PASS');
}
console.log(`PLAT16 EXIT: ${failures.length > 0 ? 1 : 0}`);
process.exit(failures.length > 0 ? 1 : 0);
