#!/usr/bin/env node
/**
 * measure-h6-pool.mjs — UI-13. The two numbers the build note asks for, taken
 * off the database rather than asserted.
 *
 *   1. The serialized byte size of the widened `unstable_cache` entry for
 *      `hk-home-v5`, against Vercel's Data Cache per-entry ceiling.
 *   2. Whether ranks 14–20 by `publishedAt` would have rescued the old
 *      `.limit(20)` — i.e. whether the 20-row buffer could have satisfied H6.1
 *      at N=13 by accident.
 *
 * READ-ONLY. Every statement here is a SELECT; there is no write path in this
 * file. It is pointed at PRODUCTION on purpose, because the local database is
 * not a copy of it — measured 01 Sept 2026, local serves 3 masthead categories
 * where production serves 9 — so a byte measurement taken locally is a
 * measurement of the wrong corpus.
 *
 *   node scripts/measure/measure-h6-pool.mjs
 *
 * DATABASE_URL comes from `.env` (the production session pooler). `.env.local`
 * overrides it in Next but is not read here; the host is printed so the reader
 * can see which database produced the numbers.
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
