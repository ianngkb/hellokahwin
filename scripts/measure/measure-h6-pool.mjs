#!/usr/bin/env node
/**
 * measure-h6-pool.mjs — is the homepage's candidate pool big enough for H6, and
 * what does it cost to cache?
 *
 * WHY THIS EXISTS. DES-03 §7.5 H6.1 lets a candidate pool contribute at most
 * `min(count(c), cap)` items per category, so the SIZE of the pool decides
 * whether H6 is satisfiable at all — independently of how well the selection is
 * written. UI-13 found the front page failing H6 for two reasons and only one
 * of them was the ordering; the other was `.limit(20)`, and a perfect selection
 * over a too-narrow pool fails INVISIBLY, by truncating to a shorter homepage
 * that `check-h6.sh` then passes at the shorter N. This script is what makes
 * that half measurable instead of arguable.
 *
 *   node scripts/measure/measure-h6-pool.mjs
 *
 * Exit 0 with four blocks printed; exit 3 if `.env` carries no DATABASE_URL.
 * There is no pass/fail verdict here — `check-h6.sh` is the gate, this is the
 * instrument that says whether a failure is the build or the corpus.
 *
 * WHAT IT PRINTS, AND WHAT EACH NUMBER MEANS WHEN IT IS SMALL:
 *
 *   1. The serialized `unstable_cache` entry for `hk-home-v5`, whole corpus vs
 *      the old 20 rows, and the per-column breakdown. Against Vercel's Data
 *      Cache per-entry ceiling. A number in the low hundreds of KiB means the
 *      whole-corpus pool is affordable and the two-query fallback (a light
 *      ranking query + a hydrate query for chosen ids) is not needed.
 *   2. Capacity — `Σ min(count(c), cap)` — for ranks 1–13, ranks 1–20 and the
 *      whole corpus, with the categories enumerated. Capacity BELOW the
 *      required N is the finding: it says H6 could not have been satisfied from
 *      that pool no matter how the selection was written.
 *   3. The real `publishedAt` tie distribution, which is what H6.4's rank
 *      clauses (2)–(4) exist for. ⚠️ DO NOT read this off the sitemap instead:
 *      `src/app/sitemap.ts` builds `<lastmod>` from `updatedAt`, so sitemap tie
 *      counts measure edit batches and say nothing about `publishedAt`.
 *   4. How many rows carry a null `media.width`/`height` and where they sit by
 *      recency. `hero-frame.ts` R8(c) treats unknown as hero-INELIGIBLE, so a
 *      pool deep enough to reach them starts excluding real hero candidates.
 *
 * ⚠️ A ZERO OR AN EMPTY CATEGORY LIST IS A CLAIM ABOUT THIS SCRIPT, NOT ABOUT
 * THE SITE, until the query is checked. Block 2 enumerates every category it
 * found rather than testing for ones it expects, because a count of something
 * you assumed is there can only ever return a number about your assumption.
 * If a block looks empty, run the SELECT below by hand before reporting it.
 *
 * READ-ONLY. Every statement here is a SELECT; there is no write path in this
 * file. It is pointed at PRODUCTION on purpose, because the local database is
 * NOT a copy of it — measured 01 Sept 2026, local serves 3 masthead categories
 * where production serves 9 — so a byte measurement taken locally is a
 * measurement of the wrong corpus.
 *
 * DATABASE_URL comes from `.env` (the production session pooler). `.env.local`
 * overrides it in Next but is not read here; the host is printed so the reader
 * can see which database produced the numbers.
 *
 * ⚠️ THE SELECT BELOW MIRRORS `getHomeData` IN `src/app/(public)/page.tsx`
 * COLUMN FOR COLUMN. Change that query and this measurement is stale — the byte
 * size in particular is a number about a specific column list, not about the
 * table.
 *
 * RUN LOG — a measurement belongs to a corpus, not to a script. The corpus
 * moved twice while UI-13 was being built, which is itself part of the finding:
 * these runs are two hours and two publications apart and they agree.
 *
 *   01 Sept 2026 (UI-13), run A · 90 published rows across 15 categories
 *     entry 230,176 B whole corpus vs 55,842 B at 20 rows (4.12x).
 *     Ranks 1–20 capacity 9 against a required 13.
 *     82 distinct `publishedAt` over 90 rows, largest tie x7.
 *     26 null `media.width`/`height` at recency ranks 62–90.
 *
 *   01 Sept 2026 (UI-13), run B · 92 published rows across 15 categories
 *     entry 235,542 B vs 55,612 B (4.24x) — about 2,560 B per row, so the
 *     ~1.5 MB point where a two-query shape earns its keep is near 590
 *     articles. 43.2% of the bytes are `cover_image_smart_crops` in both runs.
 *     Ranks 1–20 capacity 11 against a required 13 — STILL not satisfiable,
 *     and ranks 14–20 STILL add zero categories (seven more
 *     `hantaran-mas-kahwin`, which is 41% of the corpus).
 *     84 distinct `publishedAt` over 92 rows, largest tie x7.
 *     Output committed at docs/work-done/sep-01-2026-session-01/
 *     sep-01-2026-ui-13-EVIDENCE/measure-h6-pool-2026-09-01.txt (run B)
 */
import { readFileSync } from 'node:fs';
import postgres from 'postgres';

function envFromFile(path) {
  const out = {};
  for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    out[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
  return out;
}

const env = envFromFile(new URL('../../.env', import.meta.url));
const url = env.DATABASE_URL;
if (!url) {
  console.error('no DATABASE_URL in .env');
  process.exit(3);
}
console.log(`database: ${url.replace(/:\/\/[^@]*@/, '://***@').replace(/\?.*$/, '')}`);

const sql = postgres(url, { prepare: false, max: 1 });

// The `hk-home-v5` select, column for column, as `src/app/(public)/page.tsx`
// issues it. If that select changes, this measurement is stale.
const SELECT = `
  select a.id, a.title, a.slug, a.excerpt,
         a.cover_image_url, a.cover_image_variants, a.cover_image_smart_crops,
         a.cover_image_lqip, a.published_at,
         c.name as category_name, c.slug as category_slug,
         m.credit as cover_credit, m.credit_url as cover_credit_url,
         m.width as cover_width, m.height as cover_height
    from articles a
    join inspire_categories c on c.id = a.primary_category_id
    left join media m on m.url = a.cover_image_url
   where a.status = 'published'
   order by a.published_at desc, a.slug asc
`;

const rows = await sql.unsafe(SELECT);
const kb = (n) => `${n.toLocaleString('en-US')} B (${(n / 1024).toFixed(1)} KiB)`;

const full = Buffer.byteLength(JSON.stringify(rows), 'utf8');
const first20 = Buffer.byteLength(JSON.stringify(rows.slice(0, 20)), 'utf8');

console.log('');
console.log('── 1. SERIALIZED unstable_cache ENTRY ────────────────────────────');
console.log(`  rows (published corpus): ${rows.length}`);
console.log(`  hk-home-v5 (whole corpus): ${kb(full)}`);
console.log(`  hk-home-v4 (.limit(20)):   ${kb(first20)}`);
console.log(`  growth factor:             ${(full / first20).toFixed(2)}x`);
console.log(
  `  vs the build note's ~1.5 MB trigger for the two-query shape: ${full > 1_500_000 ? 'OVER' : 'under'}`,
);
// The heavy columns, so a future reader knows where the bytes are.
const weigh = (pick) => Buffer.byteLength(JSON.stringify(rows.map(pick)), 'utf8');
console.log('  by column:');
for (const [name, pick] of [
  ['cover_image_lqip', (r) => r.cover_image_lqip],
  ['cover_image_variants', (r) => r.cover_image_variants],
  ['cover_image_smart_crops', (r) => r.cover_image_smart_crops],
  ['excerpt', (r) => r.excerpt],
]) {
  const b = weigh(pick);
  console.log(
    `    ${name.padEnd(24)} ${String(b).padStart(9)} B  (${((b / full) * 100).toFixed(1)}%)`,
  );
}

console.log('');
console.log('── 2. COULD RANKS 14–20 HAVE RESCUED .limit(20)? ─────────────────');
const cat = (r) => r.category_slug ?? 'artikel';
const N = 13;
const cap = Math.ceil(N / 3);
const capacity = (pool) => {
  const counts = new Map();
  for (const r of pool) counts.set(cat(r), (counts.get(cat(r)) ?? 0) + 1);
  let total = 0;
  for (const v of counts.values()) total += Math.min(v, cap);
  return { counts, capacity: total };
};

for (const [label, pool] of [
  ['ranks 1–13', rows.slice(0, 13)],
  ['ranks 1–20 (the old buffer)', rows.slice(0, 20)],
  ['the whole published corpus', rows],
]) {
  const { counts, capacity: c } = capacity(pool);
  const listed = [...counts.entries()].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1));
  console.log(`  ${label}: ${pool.length} rows, ${counts.size} categories`);
  console.log(`    ${listed.map(([k, v]) => `${k}=${v}`).join(' ')}`);
  console.log(
    `    capacity at cap ${cap} = ${c}, required ${N} -> H6.1 ${c >= N ? 'SATISFIABLE' : 'NOT satisfiable'}`,
  );
}
const in13 = new Set(rows.slice(0, 13).map(cat));
const added = [...new Set(rows.slice(13, 20).map(cat))].filter((c) => !in13.has(c));
console.log(`  ranks 14–20 are: ${rows.slice(13, 20).map(cat).join(' ')}`);
console.log(`  categories they ADD over ranks 1–13: ${added.length ? added.join(' ') : '(none)'}`);

console.log('');
console.log('── 3. publishedAt TIES (why H6.4 clauses 2–4 exist) ──────────────');
const byStamp = new Map();
for (const r of rows) {
  const k = r.published_at ? new Date(r.published_at).toISOString() : 'null';
  byStamp.set(k, (byStamp.get(k) ?? 0) + 1);
}
const ties = [...byStamp.entries()].filter(([, v]) => v > 1).sort((a, b) => b[1] - a[1]);
console.log(`  distinct timestamps: ${byStamp.size} over ${rows.length} rows`);
for (const [k, v] of ties.slice(0, 5)) console.log(`    ${k}  x${v}`);

console.log('');
console.log('── 4. media.width/height NULLS NOW INSIDE THE POOL ───────────────');
const nulls = rows.filter((r) => r.cover_width == null || r.cover_height == null);
console.log(`  null width/height: ${nulls.length} of ${rows.length}`);
console.log(
  `  their recency ranks: ${nulls.length ? `${rows.indexOf(nulls[0]) + 1}–${rows.indexOf(nulls[nulls.length - 1]) + 1}` : '(none)'}`,
);

await sql.end();
