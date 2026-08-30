/**
 * Step 2 of the RISK-06 reproduction: prove the EDGE HOLDS the shell and hands
 * it back on a STALE response.
 *
 * Storm A left 50 shells in CDN entries keyed by `?_r06=<bust>`. The Vercel edge
 * holds those under `Vercel-CDN-Cache-Control: s-maxage=300,
 * stale-while-revalidate=600` (next.config.ts), so between age 300 and 900 the
 * entry is STALE and served as-is. Wait past 300s, re-request the SAME urls, and
 * capture what a reader — Googlebot included — actually receives.
 *
 * No purge here. Re-rendering is the opposite of the thing being measured.
 */
import fs from 'node:fs';
const OUT = new URL('.', import.meta.url);
const SITE_DEFAULT_TITLE = 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia';
const src = JSON.parse(fs.readFileSync(new URL(process.argv[2], OUT), 'utf8'));
const label = process.argv[3];
const waitS = Number(process.argv[4] ?? 0);

const pick = (re, html) => { const m = re.exec(html); return m ? m[1].trim() : null; };
const TITLE = /<title>([\s\S]*?)<\/title>/;
const CANON = /<link rel="canonical" href="([^"]*)"/;
const OG_TITLE = /<meta property="og:title" content="([^"]*)"/;
const H1 = /<h1[^>]*>([\s\S]*?)<\/h1>/;
const strip = (s) => s == null ? null : s.replace(/<[^>]*>/g, '').replace(/&amp;/g,'&')
  .replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/\s+/g,' ').trim();

const shells = src.filter((r) => r.status === 200 &&
  (r.title === SITE_DEFAULT_TITLE || !r.canonical || !r.ogTitle));
console.log(`re-requesting ${shells.length} urls that were served as SHELLS in ${process.argv[2]}`);
if (waitS > 0) {
  console.log(`waiting ${waitS}s for the edge entries to pass s-maxage=300 …`);
  await new Promise((r) => setTimeout(r, waitS * 1000));
}

const results = [];
for (const s of shells) {
  const res = await fetch(s.url, { headers: { 'user-agent': 'hellokahwin-risk06-repro/1.0' } });
  const html = await res.text();
  results.push({
    url: s.url, status: res.status,
    cache: res.headers.get('x-vercel-cache'), age: res.headers.get('age'),
    cacheControl: res.headers.get('cache-control'),
    title: strip(pick(TITLE, html)), canonical: pick(CANON, html),
    ogTitle: strip(pick(OG_TITLE, html)), h1: strip(pick(H1, html)),
  });
}
fs.writeFileSync(new URL(`${label}.json`, OUT), JSON.stringify(results, null, 2));

const staleShells = results.filter((r) => r.cache === 'STALE' &&
  (r.title === SITE_DEFAULT_TITLE || !r.canonical || !r.ogTitle));
const mix = {}; for (const r of results) mix[r.cache ?? 'none'] = (mix[r.cache ?? 'none'] ?? 0) + 1;
console.log(`\n=== ${label} — ${new Date().toISOString()} ===`);
console.log(`x-vercel-cache mix : ${JSON.stringify(mix)}`);
console.log(`SHELLS SERVED STALE: ${staleShells.length}`);
for (const r of staleShells.slice(0, 3)) {
  console.log(`\n  ${r.url}`);
  console.log(`    x-vercel-cache : ${r.cache}   age: ${r.age}`);
  console.log(`    cache-control  : ${r.cacheControl}`);
  console.log(`    <title>        : ${JSON.stringify(r.title)}`);
  console.log(`    canonical      : ${JSON.stringify(r.canonical)}`);
  console.log(`    og:title       : ${JSON.stringify(r.ogTitle)}`);
  console.log(`    <h1>           : ${JSON.stringify(r.h1)}`);
}
console.log(`\nwrote ${label}.json`);
