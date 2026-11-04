#!/usr/bin/env node
/**
 * Standing smoke suite — layer 3 of the regression-testing standard
 * (brain/docs/regression-testing.md).
 *
 * Proves the live site still works after a deploy: the important pages load,
 * nothing answers 5xx, the database is reachable, the signed-out admin lock
 * holds, and the analytics collector is up.
 *
 * WHERE IT RUNS: automatically, by .github/workflows/smoke-production.yml,
 * when Vercel reports a successful Production deployment to GitHub. By hand:
 *
 *     node --test scripts/smoke-prod.mjs
 *
 * SMOKE_BASE_URL overrides the host (default https://hellokahwin.com). The
 * per-deploy *.vercel.app URLs sit behind Vercel Deployment Protection, so in
 * practice the override is for a local `pnpm start` (http://localhost:3200).
 *
 * READ-ONLY. Every request is a GET, except one POST of a deliberately invalid
 * body to the analytics collector, which is rejected with 400 before anything
 * is stored (src/app/api/v1/analytics/collect/route.ts validates the body
 * first). No customer data is written, so there is nothing to clean up.
 *
 * FIXTURES: none. The article and category it opens are picked from the live
 * sitemap on each run, so it needs no test rows in the production database.
 * It does need the site to have at least one published article in a
 * category, which is the site's real content, not a fixture.
 *
 * NOT COVERED: anything behind sign-in (/admin/*, the editor, uploads), draft
 * previews (need a share token), and what pages look like (no browser).
 */

import { test, before } from 'node:test';
import assert from 'node:assert/strict';

const BASE = (process.env.SMOKE_BASE_URL || 'https://hellokahwin.com').replace(/\/+$/, '');
const UA = 'hellokahwin-smoke/1.0 (+https://github.com/ianngkb/hellokahwin)';
const TIMEOUT_MS = 20_000;

/** Parse a URL, or null when it is not one (a stray `<loc>` must not crash the run). */
function tryUrl(u) {
  try {
    return new URL(u);
  } catch {
    return null;
  }
}

const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function get(path, init = {}) {
  const url = path.startsWith('http') ? path : `${BASE}${path}`;
  const res = await fetch(url, {
    redirect: 'manual',
    signal: AbortSignal.timeout(TIMEOUT_MS),
    ...init,
    headers: { 'user-agent': UA, ...(init.headers || {}) },
  });
  const body = await res.text();
  return { url, status: res.status, headers: res.headers, body };
}

function expectOk(r) {
  assert.equal(r.status, 200, `${r.url} answered ${r.status}, expected 200`);
}

let articleUrl;
let articlePath;
let categoryPath;

before(async () => {
  const r = await get('/sitemap.xml');
  expectOk(r);
  const urls = [...r.body.matchAll(/<loc>([^<]+)<\/loc>/g)]
    .map((m) => tryUrl(m[1].trim()))
    .filter(Boolean);
  // /artikel/<category>/<slug> — an article detail page.
  const articles = urls.filter((u) => /^\/artikel\/[^/]+\/[^/]+$/.test(u.pathname));
  assert.ok(articles.length > 0, 'sitemap lists no article pages');
  // Sitemap URLs are absolute on the canonical host; re-root them on BASE so a
  // run against another host tests that host, not production.
  articlePath = articles[0].pathname;
  articleUrl = `${BASE}${articlePath}`;
  categoryPath = articlePath.split('/').slice(0, 3).join('/');
});

test('home page loads with the site title', async () => {
  const r = await get('/');
  expectOk(r);
  assert.match(r.body, /<title>[^<]*HelloKahwin/, 'no HelloKahwin <title> on /');
  assert.match(r.body, /href="\/artikel\/[^"]+"/, 'home page links to no articles');
});

test('sitemap.xml lists the site', async () => {
  const r = await get('/sitemap.xml');
  expectOk(r);
  const count = (r.body.match(/<loc>/g) || []).length;
  assert.ok(count >= 10, `sitemap has only ${count} URLs`);
});

test('robots.txt keeps admin out of search and points at the sitemap', async () => {
  const r = await get('/robots.txt');
  expectOk(r);
  assert.match(r.body, /Disallow: \/admin\//);
  assert.match(r.body, /Sitemap: https?:\/\/\S+\/sitemap\.xml/);
});

test('article index /artikel loads', async () => {
  expectOk(await get('/artikel'));
});

test('an article page renders its content, structured data and share image', async () => {
  const r = await get(articleUrl);
  expectOk(r);
  assert.match(r.body, /<h1[\s>]/, `no <h1> on ${articleUrl}`);
  assert.match(r.body, /application\/ld\+json/, `no JSON-LD on ${articleUrl}`);
  // The canonical always names the public site, whichever host served it.
  assert.match(
    r.body,
    new RegExp(`<link rel="canonical" href="https?://[^"/]+${escapeRegExp(articlePath)}"`),
    `canonical on ${articleUrl} does not point at the article`,
  );
  const og = r.body.match(/<meta property="og:image" content="([^"]+)"/);
  assert.ok(og, `no og:image on ${articleUrl}`);
  // Image hosts may redirect to a CDN copy; only the final answer matters.
  const img = await get(og[1].replace(/&amp;/g, '&'), { redirect: 'follow' });
  assert.equal(img.status, 200, `share image ${og[1]} answered ${img.status}`);
  assert.match(img.headers.get('content-type') || '', /^image\//);
});

test('a category page lists articles (not the empty or degraded state)', async () => {
  const r = await get(categoryPath);
  expectOk(r);
  // Relative or absolute links both count.
  const linkToArticle = new RegExp(
    `href="(?:https?://[^"/]+)?${escapeRegExp(categoryPath)}/[^"/]+"`,
  );
  assert.match(r.body, linkToArticle, `${categoryPath} links to none of its articles`);
});

test('search reaches the database and returns articles', async () => {
  // Search for a word from the article picked above, so a hit depends on the
  // database answering, not on any particular wording across the site. The
  // route matches titles with ILIKE '%word%'.
  const page = await get(articleUrl);
  const title = (page.body.match(/<title>([^<|]+)/)?.[1] ?? '').trim();
  const word =
    title
      .split(/\s+/)
      .filter((w) => /^[A-Za-z]{4,}$/.test(w))
      .sort((a, b) => b.length - a.length)[0] ?? 'kahwin';
  const r = await get(`/api/v1/search?q=${encodeURIComponent(word)}`);
  expectOk(r);
  let json;
  try {
    json = JSON.parse(r.body);
  } catch {
    assert.fail(`search answered 200 with a non-JSON body: ${r.body.slice(0, 120)}`);
  }
  // The route answers 200 with an empty list when the query throws, so an
  // empty list for a word taken from a live title means the database is down.
  assert.ok(json?.data?.articles?.length > 0, `search for "${word}" returned no articles`);
});

test('/admin is locked when signed out', async () => {
  const r = await get('/admin');
  assert.ok([302, 303, 307, 308].includes(r.status), `/admin answered ${r.status}`);
  assert.match(r.headers.get('location') || '', /\/login/, '/admin does not send to /login');
});

test('the login page loads', async () => {
  expectOk(await get('/login'));
});

test('an unknown page is a 404, not a server error', async () => {
  const r = await get('/smoke-test-page-that-does-not-exist');
  assert.equal(r.status, 404);
  const a = await get('/artikel/smoke-test-missing/smoke-test-missing');
  assert.equal(a.status, 404);
});

test('the analytics collector is up and rejects junk without storing it', async () => {
  const r = await get('/api/v1/analytics/collect', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ smoke: 'invalid-on-purpose' }),
  });
  // 400 = validated and rejected. 429 = the per-IP limit (it runs before
  // validation, and CI runners share egress IPs) — still up, still no write.
  assert.ok([400, 429].includes(r.status), `collector answered ${r.status} to an invalid body`);
});
