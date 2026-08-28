/**
 * Rendered-title sweep — measures the `<title>` a reader (and Googlebot)
 * actually receives, one URL at a time.
 *
 * ── WHY THIS SCRIPT EXISTS, AND WHY IT IS SEQUENTIAL ──────────────────────
 *
 * The Sprint 02 sweep of this same corpus reported 39 pages serving no article
 * title. That number was wrong, and it was wrong in the most expensive
 * direction: it was manufactured by the measurement. The sweep ran six
 * requests wide, and `generateMetadata` in
 * `src/app/(public)/artikel/[category]/[slug]/page.tsx` races a 1.5s deadline
 * against a 5-wide postgres pool. Six concurrent cold renders lose that race;
 * losing it used to return `{}`, which renders the ROOT layout's
 * `title.default` and then freezes it into the cache entry. So the sweep
 * created the defect it was counting, and then persisted it for the next
 * reader. The corrected pre-existing count was 3.
 *
 * A concurrent sweep of this site is therefore not a faster version of this
 * script. It is a different, destructive operation. `--concurrency` is not an
 * option here on purpose: the loop below awaits every request.
 *
 * ── WHAT IT CLASSIFIES ────────────────────────────────────────────────────
 *
 * A page "serves no article title" when its `<title>` is the root layout's
 * `title.default` — `HelloKahwin — Idea & Panduan Perkahwinan Malaysia`. That
 * is not a heuristic: Next's `mergeMetadata` iterates `for (const key_ in
 * metadata)`, so a `generateMetadata` that returns `{}` contributes no `title`
 * key and the parent's already-resolved default survives verbatim
 * (`next/dist/lib/metadata/resolve-metadata.js`). An exact string match on the
 * default is an exact match on the defect.
 *
 * The `og:title` is recorded alongside it because the two come from the SAME
 * `generateMetadata` return. They agree when the function ran and disagree
 * when it did not, which is what makes each row self-evidencing.
 *
 * ── USAGE ─────────────────────────────────────────────────────────────────
 *
 *   pnpm audit:titles                        # sitemap of production, all URLs
 *   pnpm audit:titles --base https://…       # another origin (a preview URL)
 *   pnpm audit:titles --bust                 # unique ?_t= per URL: skips the
 *                                            # Vercel edge, measures the origin
 *   pnpm audit:titles --delay 500            # ms between requests (default 300)
 *   pnpm audit:titles --only /artikel/a/b    # substring filter
 *   pnpm audit:titles --out path.json        # also write the full row set
 *
 * Every row carries `x-vercel-cache` and `age`, because a title without its
 * cache state is not a measurement of anything — the same URL answers
 * differently from HIT, STALE and MISS.
 */

import { writeFileSync } from 'node:fs';
// Imported, not copied. The audit's whole verdict is an exact match against the
// root layout's `title.default`; a local copy of that string would keep passing
// after somebody reworded the homepage title, on a corpus that was still broken.
import { SITE_DEFAULT_TITLE } from '../src/lib/seo/site-title';

interface Row {
  url: string;
  status: number;
  title: string | null;
  ogTitle: string | null;
  cache: string | null;
  age: string | null;
  ms: number;
  verdict: 'article-title' | 'site-default' | 'not-found' | 'no-title' | 'error';
}

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i === -1 ? undefined : process.argv[i + 1];
}
const flag = (name: string) => process.argv.includes(`--${name}`);

/** Minimal entity decode — the sweep only ever meets these in a `<title>`. */
function decodeTitle(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeTitle(m[1]) : null;
}

function extractOgTitle(html: string): string | null {
  const m =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]*)"/i) ??
    html.match(/<meta[^>]+content="([^"]*)"[^>]+property="og:title"/i);
  return m ? decodeTitle(m[1]) : null;
}

async function sitemapUrls(base: string): Promise<string[]> {
  const res = await fetch(`${base}/sitemap.xml`, { headers: { 'user-agent': UA } });
  if (!res.ok) throw new Error(`sitemap ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
}

const UA = 'hellokahwin-title-audit/1.0 (+sequential; scripts/audit-rendered-titles.mts)';

async function probe(url: string): Promise<Row> {
  const started = Date.now();
  try {
    const res = await fetch(url, { headers: { 'user-agent': UA }, redirect: 'follow' });
    const html = await res.text();
    const ms = Date.now() - started;
    const title = extractTitle(html);
    const ogTitle = extractOgTitle(html);
    const cache = res.headers.get('x-vercel-cache');
    const age = res.headers.get('age');
    let verdict: Row['verdict'];
    if (!title) verdict = 'no-title';
    else if (title === SITE_DEFAULT_TITLE) verdict = 'site-default';
    else if (title.startsWith('Not Found')) verdict = 'not-found';
    else verdict = 'article-title';
    return { url, status: res.status, title, ogTitle, cache, age, ms, verdict };
  } catch {
    // A transport failure is a row, not a crash: one unreachable URL must not
    // end a sweep that has already cost 100 sequential requests.
    return {
      url,
      status: 0,
      title: null,
      ogTitle: null,
      cache: null,
      age: null,
      ms: Date.now() - started,
      verdict: 'error',
    };
  }
}

async function main() {
  const base = (arg('base') ?? 'https://hellokahwin.com').replace(/\/$/, '');
  const delay = Number(arg('delay') ?? 300);
  const only = arg('only');
  const out = arg('out');
  const bust = flag('bust');

  let urls = await sitemapUrls(base);
  urls = urls.map((u) => u.replace(/^https?:\/\/[^/]+/, base));
  if (only) urls = urls.filter((u) => u.includes(only));

  console.log(`# rendered-title sweep`);
  console.log(`# base=${base} urls=${urls.length} sequential delay=${delay}ms bust=${bust}`);
  console.log(`# started=${new Date().toISOString()}`);
  console.log('');

  const rows: Row[] = [];
  for (const [i, url] of urls.entries()) {
    const target = bust ? `${url}${url.includes('?') ? '&' : '?'}_t=${Date.now()}-${i}` : url;
    const row = await probe(target);
    row.url = url; // report the canonical URL, not the busted one
    rows.push(row);
    const mark = row.verdict === 'article-title' ? 'ok  ' : 'FAIL';
    console.log(
      `${mark} ${String(i + 1).padStart(3)}/${urls.length} ` +
        `[${row.status} ${row.cache ?? '-'} age=${row.age ?? '-'} ${row.ms}ms] ` +
        `${row.url.replace(base, '')}\n       <title> ${row.title ?? '(none)'}`,
    );
    if (delay > 0 && i < urls.length - 1) await new Promise((r) => setTimeout(r, delay));
  }

  const articles = rows.filter((r) => /\/artikel\/[^/]+\/[^/]+$/.test(r.url));
  const count = (rs: Row[], v: Row['verdict']) => rs.filter((r) => r.verdict === v).length;

  console.log('');
  console.log('# ── SUMMARY ────────────────────────────────────────────────');
  console.log(`# finished=${new Date().toISOString()}`);
  for (const [label, rs] of [
    ['ALL sitemap URLs', rows],
    ['article pages only', articles],
  ] as const) {
    console.log(`# ${label}: ${rs.length}`);
    console.log(`#   article-title : ${count(rs, 'article-title')}`);
    console.log(`#   site-default  : ${count(rs, 'site-default')}   <- serves NO article title`);
    console.log(`#   not-found     : ${count(rs, 'not-found')}`);
    console.log(`#   no-title      : ${count(rs, 'no-title')}`);
    console.log(`#   error         : ${count(rs, 'error')}`);
  }
  const failed = rows.filter((r) => r.verdict !== 'article-title');
  if (failed.length > 0) {
    console.log('#');
    console.log('# pages serving no article title:');
    for (const r of failed) console.log(`#   ${r.verdict.padEnd(13)} ${r.url}  <title> ${r.title}`);
  }

  if (out) {
    writeFileSync(out, JSON.stringify({ base, bust, delay, rows }, null, 2));
    console.log(`#\n# rows written to ${out}`);
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(2);
});
