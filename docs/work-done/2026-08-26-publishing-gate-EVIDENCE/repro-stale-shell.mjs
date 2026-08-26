/**
 * RISK-06 — deliberately reproduce the STALE SHELL, before any fix.
 *
 * The claim under test (SEO review, 26 Aug 2026): an article page can be served
 * carrying the SITE-DEFAULT HOMEPAGE TITLE, no canonical and no og tags, while
 * its H1 and JSON-LD are correct — and the Vercel edge then holds that shell.
 *
 * Suspected mechanism, from the source rather than from a guess:
 *   src/app/(public)/artikel/[category]/[slug]/page.tsx:430-434
 *     generateMetadata() wraps its read in withDeadline(..., 1_500) and on
 *     timeout `return {}`. Empty metadata falls back to the ROOT layout's
 *     `title.default` — 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia' —
 *     with no canonical and no openGraph. The PAGE component has its own,
 *     larger budget and renders H1 + JSON-LD correctly. That is the exact
 *     asymmetry the reviewer described.
 *
 * So the trigger is a COLD DATA CACHE under CONCURRENCY: expire the `articles`
 * tag, then put more renders in flight than the 5-wide postgres pool can serve,
 * and some metadata reads lose the 1.5s race.
 *
 * Shape borrowed from the Sprint-01 cold-concurrent sweep
 * (.tmp-sweep-evidence/cold-sweep.mjs), which established that a sweep against
 * a WARM cache proves nothing because it re-renders nothing.
 *
 * `?_r06=<bust>` defeats the EDGE only. It changes no route param and no
 * content — the page component takes `params` only, never `searchParams` — but
 * it does give every probe its own CDN entry, which is what makes step 3
 * possible: re-request the SAME busted URL past s-maxage and the edge must
 * hand back whatever it stored, STALE.
 */
import fs from 'node:fs';

const REPO = 'C:/Users/Ian Ng/orca/workspaces/hellokahwin-site/pillars-ingest-redirects/';
const BASE = 'https://hellokahwin.com';
const SITE_DEFAULT_TITLE = 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia';
const OUT = new URL('.', import.meta.url);

const label = process.argv[2] ?? 'coldA';
const bust = process.argv[3] ?? String(process.hrtime.bigint());
const CONCURRENCY = Number(process.argv[4] ?? 12);

const rows = JSON.parse(fs.readFileSync(new URL('live-articles.json', OUT), 'utf8'));

const env = fs.readFileSync(REPO + '.env', 'utf8');
const CRON_SECRET = env.match(/^CRON_SECRET=(.*)$/m)[1].trim().replace(/^["']|["']$/g, '');

const pick = (re, html) => { const m = re.exec(html); return m ? m[1].trim() : null; };
const TITLE = /<title>([\s\S]*?)<\/title>/;
const CANON = /<link rel="canonical" href="([^"]*)"/;
const OG_TITLE = /<meta property="og:title" content="([^"]*)"/;
const OG_URL = /<meta property="og:url" content="([^"]*)"/;
const OG_IMAGE = /<meta property="og:image" content="([^"]*)"/;
const H1 = /<h1[^>]*>([\s\S]*?)<\/h1>/;
const JSONLD_HEADLINE = /"headline"\s*:\s*"([^"]*)"/;
const strip = (s) => s == null ? null : s.replace(/<[^>]*>/g, '')
  .replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"')
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/\s+/g, ' ').trim();

async function probe(url) {
  const started = Date.now();
  try {
    const res = await fetch(url, { redirect: 'follow',
      headers: { 'user-agent': 'hellokahwin-risk06-repro/1.0' } });
    const html = await res.text();
    return {
      url, status: res.status, ms: Date.now() - started,
      cache: res.headers.get('x-vercel-cache'),
      age: res.headers.get('age'),
      cacheControl: res.headers.get('cache-control'),
      staleTime: res.headers.get('x-nextjs-stale-time'),
      title: strip(pick(TITLE, html)),
      canonical: pick(CANON, html),
      ogTitle: strip(pick(OG_TITLE, html)),
      ogUrl: pick(OG_URL, html),
      ogImage: pick(OG_IMAGE, html),
      h1: strip(pick(H1, html)),
      jsonLdHeadline: strip(pick(JSONLD_HEADLINE, html)),
    };
  } catch (err) {
    return { url, status: 'ERR', ms: Date.now() - started,
      error: String(err?.cause?.code ?? err?.message ?? err) };
  }
}

/** A SHELL: default title, or no canonical, or no og:title, while the H1 is right. */
const isShell = (r) =>
  r.status === 200 &&
  (r.title === SITE_DEFAULT_TITLE || !r.canonical || !r.ogTitle);

const mode = process.env.R06_MODE ?? 'storm';

if (mode === 'storm') {
  const purge = await fetch(`${BASE}/api/cron/revalidate-content`, {
    method: 'POST', headers: { authorization: `Bearer ${CRON_SECRET}` },
  });
  console.log(`purge (expire the \`articles\` tag): ${purge.status} ${await purge.text()}`);
  if (purge.status !== 200) process.exit(1);
}

const urls = rows.map((r) => `${BASE}/artikel/${r.cat}/${r.slug}?_r06=${bust}`);
const queue = [...urls];
const results = [];
const t0 = Date.now();
await Promise.all(Array.from({ length: CONCURRENCY }, async () => {
  for (;;) { const u = queue.shift(); if (!u) return; results.push(await probe(u)); }
}));
results.sort((a, b) => a.url.localeCompare(b.url));
fs.writeFileSync(new URL(`${label}.json`, OUT), JSON.stringify(results, null, 2));

const shells = results.filter(isShell);
const mix = {};
for (const r of results) mix[r.cache ?? 'none'] = (mix[r.cache ?? 'none'] ?? 0) + 1;

console.log(`\n=== ${label} — mode=${mode} bust=${bust} concurrency=${CONCURRENCY} — ${new Date().toISOString()} ===`);
console.log(`requests            : ${results.length} (wall ${Date.now() - t0} ms)`);
console.log(`x-vercel-cache mix  : ${JSON.stringify(mix)}`);
console.log(`non-200             : ${results.filter((r) => r.status !== 200).length}`);
console.log(`STALE SHELLS FOUND  : ${shells.length}`);
for (const r of shells) {
  console.log(`\n  ${r.url}`);
  console.log(`    x-vercel-cache : ${r.cache}   age: ${r.age}`);
  console.log(`    cache-control  : ${r.cacheControl}`);
  console.log(`    <title>        : ${JSON.stringify(r.title)}`);
  console.log(`    canonical      : ${JSON.stringify(r.canonical)}`);
  console.log(`    og:title       : ${JSON.stringify(r.ogTitle)}`);
  console.log(`    og:url         : ${JSON.stringify(r.ogUrl)}`);
  console.log(`    og:image       : ${JSON.stringify(r.ogImage)}`);
  console.log(`    <h1>           : ${JSON.stringify(r.h1)}`);
  console.log(`    JSON-LD headline: ${JSON.stringify(r.jsonLdHeadline)}`);
}
console.log(`\nwrote ${label}.json`);
