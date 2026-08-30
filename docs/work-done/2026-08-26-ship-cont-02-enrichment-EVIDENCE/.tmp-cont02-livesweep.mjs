/**
 * The reader's view. Fetches every one of the 33 pillar articles and both
 * halves of the navigation, and counts only the images that belong to THAT
 * article — an `/inspire/<slug>/…` key under its own slug. The related-articles
 * block puts sibling thumbnails on every page, and counting those is how the
 * brief's own sample table came to read 4/2/4 for pages carrying one image.
 *
 *   node .tmp-cont02-livesweep.mjs
 */
import { readFileSync, writeFileSync } from 'node:fs';

const BASE = 'https://hellokahwin.com';
const after = JSON.parse(readFileSync('.tmp-cont02/audit-AFTER.json', 'utf8'));
const before = new Map(
  JSON.parse(readFileSync('.tmp-cont02/audit-BEFORE.json', 'utf8')).rows.map((r) => [r.slug, r]),
);
const rows = after.rows.filter((r) => r.draftFile);

const stem = (u) => {
  const p = new URL(u).pathname.replace(/^\/+/, '').split('?')[0].split('/');
  const last = p[p.length - 1];
  if (/^(high|low|original|crop-)/.test(last)) p.pop();
  else p[p.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return p.join('/');
};

const out = [];
let fail = 0;
for (const r of rows) {
  const url = `${BASE}/artikel/${r.cat}/${r.slug}`;
  const res = await fetch(url, { redirect: 'manual' });
  const html = await res.text();
  const own = [
    ...new Set(
      [...html.matchAll(/https:\/\/images\.hellokahwin\.com\/[^"'\s\\)]+/g)]
        .map((m) => stem(m[0]))
        .filter((s) => s.startsWith(`inspire/${r.slug}/`)),
    ),
  ];
  const ok = res.status === 200 && own.length === r.liveCount;
  if (!ok) fail++;
  out.push({ url, status: res.status, ownImages: own.length, expected: r.liveCount, ok });
  console.log(
    `${String(res.status).padEnd(4)} ${String(before.get(r.slug).liveCount).padStart(2)} -> ` +
      `${String(own.length).padStart(2)} (db ${r.liveCount})  ${ok ? '  ' : 'XX'}  ${url}`,
  );
}

console.log('\n--- navigation ---');
const navs = [
  '/',
  '/artikel',
  '/artikel/nikah-undang-undang',
  '/artikel/hantaran-mas-kahwin',
  '/artikel/ucapan-doa',
  '/artikel/busana-pengantin',
  '/artikel/pelamin-kad-cenderahati',
  '/artikel/venue-perancangan',
  '/artikel/sebelum-nikah',
  '/sitemap.xml',
];
for (const p of navs) {
  const res = await fetch(BASE + p, { redirect: 'manual' });
  const html = await res.text();
  const cards = [...html.matchAll(/\/artikel\/[a-z0-9-]+\/[a-z0-9-]+/g)].length;
  if (res.status !== 200) fail++;
  console.log(`${res.status}  ${String(html.length).padStart(7)}B  ${String(cards).padStart(4)} article links  ${BASE}${p}`);
}

writeFileSync('.tmp-cont02/livesweep.json', JSON.stringify(out, null, 1));
console.log(`\n${rows.length} articles + ${navs.length} navigation URLs; ${fail} problem(s).`);
