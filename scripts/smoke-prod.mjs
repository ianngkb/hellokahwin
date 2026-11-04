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
 * previews (need a share token), and what pages look like. Only / is opened
 * in a browser (the last test), to catch JavaScript and hydration errors.
 */

import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

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

// ── Browser check: the home page runs without JavaScript errors ────────────
//
// Added 2026-11-04 after a real bug this suite could not see: every load of /
// threw React error #418 (hydration mismatch) because the hero's credit link
// sat inside the story link, and an <a> inside an <a> is invalid HTML. Every
// HTTP check above was green throughout, because the error only exists once a
// browser parses the page and React hydrates it.
//
// No dependency: it drives the system Chrome over the DevTools protocol with
// Node's built-in WebSocket (Node ≥ 22). The workflow pins `ubuntu-24.04`
// because that image ships Google Chrome (ubuntu-latest moved to 26.04); see
// .github/workflows/smoke-production.yml. Set CHROME_PATH to use another
// browser. A missing browser FAILS the check, with a message that says it is
// the test machine and not the site: a check that silently checks nothing is
// the failure mode.
//
// Still read-only: requests to the analytics collector are answered with 204
// inside the browser (Fetch domain) and also blocked (Network domain), and the
// browser is killed without unloading the page, so no pageview is recorded.

const BROWSER_TIMEOUT_MS = 20_000;
const LOAD_DEADLINE_MS = 30_000;
const QUIET_MS = 2_000;
const NOT_THE_SITE = 'TEST MACHINE, NOT THE SITE:';

function findChrome() {
  if (process.env.CHROME_PATH) {
    assert.ok(
      existsSync(process.env.CHROME_PATH),
      `${NOT_THE_SITE} CHROME_PATH=${process.env.CHROME_PATH} does not exist`,
    );
    return process.env.CHROME_PATH;
  }
  const local = process.env.LOCALAPPDATA;
  const candidates = [
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/snap/bin/chromium',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    local && join(local, 'Google/Chrome/Application/chrome.exe'),
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  assert.ok(
    found,
    `${NOT_THE_SITE} no Chrome found (tried ${candidates.join(', ')}); set CHROME_PATH`,
  );
  return found;
}

function killChrome(proc) {
  if (proc.exitCode !== null || proc.signalCode !== null) return;
  if (process.platform === 'win32') {
    // proc.kill() ends only the parent chrome.exe; its helpers keep the
    // profile open. Kill the tree.
    spawnSync('taskkill', ['/PID', String(proc.pid), '/T', '/F'], { stdio: 'ignore' });
  } else {
    proc.kill('SIGKILL');
  }
}

const RENDERED_EXPRESSION = `(() => {
  const h1 = document.querySelector('h1');
  const hydrated = [...document.querySelectorAll('body *')].some((el) =>
    Object.keys(el).some((k) => k.startsWith('__reactFiber$')));
  return { h1: (h1 && h1.textContent ? h1.textContent : '').trim(), hydrated };
})()`;

/**
 * Open `url` in headless Chrome. Returns every uncaught error and
 * console.error, plus facts about what actually rendered.
 */
async function openInChrome(url) {
  const chrome = findChrome();
  const profile = mkdtempSync(join(tmpdir(), 'hk-smoke-'));
  let proc;
  let ws;
  try {
    proc = spawn(
      chrome,
      [
        '--headless=new',
        '--remote-debugging-port=0',
        `--user-data-dir=${profile}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--no-sandbox',
        '--disable-gpu',
        'about:blank',
      ],
      { stdio: ['ignore', 'ignore', 'pipe'] },
    );
    const wsUrl = await new Promise((resolve, reject) => {
      let buf = '';
      const timer = setTimeout(
        () => reject(new Error(`${NOT_THE_SITE} Chrome did not start in 20s`)),
        BROWSER_TIMEOUT_MS,
      );
      proc.on('error', (e) => {
        clearTimeout(timer);
        reject(new Error(`${NOT_THE_SITE} could not start ${chrome}: ${e.message}`));
      });
      proc.stderr.on('data', (d) => {
        buf += d;
        const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
        if (m) {
          clearTimeout(timer);
          resolve(m[1]);
        }
      });
      proc.on('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`Chrome exited (${code}) before DevTools came up: ${buf.slice(-300)}`));
      });
    });

    ws = new WebSocket(wsUrl);
    await new Promise((resolve, reject) => {
      ws.onopen = resolve;
      ws.onerror = () => reject(new Error('could not connect to Chrome DevTools'));
    });

    let nextId = 1;
    let closedReason = null;
    // Filled in once the page target is attached; read by onmessage.
    const page = { sessionId: null };
    const pending = new Map();
    const events = [];
    const failAll = (reason) => {
      closedReason ??= reason;
      for (const { reject } of pending.values()) reject(new Error(reason));
      pending.clear();
    };
    ws.onclose = () => failAll('Chrome DevTools connection closed (browser crashed?)');
    proc.on('exit', (code) => failAll(`Chrome exited (${code}) mid-check`));

    const send = (method, params = {}, session) =>
      new Promise((resolve, reject) => {
        if (closedReason) {
          reject(new Error(closedReason));
          return;
        }
        const id = nextId++;
        const timer = setTimeout(() => {
          pending.delete(id);
          reject(new Error(`DevTools ${method} got no answer in ${BROWSER_TIMEOUT_MS} ms`));
        }, BROWSER_TIMEOUT_MS);
        pending.set(id, {
          resolve: (v) => {
            clearTimeout(timer);
            resolve(v);
          },
          reject: (e) => {
            clearTimeout(timer);
            reject(e);
          },
        });
        ws.send(JSON.stringify({ id, method, params, ...(session ? { sessionId: session } : {}) }));
      });

    ws.onmessage = (msg) => {
      const m = JSON.parse(msg.data);
      if (m.id && pending.has(m.id)) {
        const { resolve, reject } = pending.get(m.id);
        pending.delete(m.id);
        if (m.error) reject(new Error(m.error.message));
        else resolve(m.result);
        return;
      }
      if (!m.method) return;
      if (m.method === 'Fetch.requestPaused' && m.sessionId === page.sessionId) {
        // The only paused pattern is the analytics collector: answer locally.
        send(
          'Fetch.fulfillRequest',
          { requestId: m.params.requestId, responseCode: 204 },
          page.sessionId,
        ).catch(() => {});
        return;
      }
      events.push({ ...m, at: Date.now() });
    };

    const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
    page.sessionId = (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
    const { sessionId } = page;
    await send('Runtime.enable', {}, sessionId);
    await send('Page.enable', {}, sessionId);
    await send('Page.setLifecycleEventsEnabled', { enabled: true }, sessionId);
    await send('Network.enable', {}, sessionId);
    await send('Network.setBlockedURLs', { urls: ['*/api/v1/analytics/collect*'] }, sessionId);
    await send(
      'Fetch.enable',
      { patterns: [{ urlPattern: '*/api/v1/analytics/collect*' }] },
      sessionId,
    );

    const nav = await send('Page.navigate', { url }, sessionId);
    assert.ok(!nav.errorText, `${url} did not load: ${nav.errorText}`);

    // Wait for THIS navigation's load event, matched by loaderId, so the
    // initial about:blank load cannot satisfy it.
    const deadline = Date.now() + LOAD_DEADLINE_MS;
    const loaded = () =>
      events.some(
        (e) =>
          e.sessionId === sessionId &&
          e.method === 'Page.lifecycleEvent' &&
          e.params.name === 'load' &&
          e.params.loaderId === nav.loaderId,
      );
    while (!loaded()) {
      assert.ok(!closedReason, closedReason);
      assert.ok(Date.now() < deadline, `${url} did not finish loading in 30s`);
      await new Promise((r) => setTimeout(r, 100));
    }
    // Then a quiet period: no new page event for QUIET_MS, bounded by the same
    // deadline, so a slow hydration still reports its error.
    for (;;) {
      const mine = events.filter((e) => e.sessionId === sessionId);
      const last = mine.length ? mine[mine.length - 1].at : 0;
      if (Date.now() - last >= QUIET_MS) break;
      assert.ok(!closedReason, closedReason);
      assert.ok(Date.now() < deadline, `${url} never went quiet in 30s`);
      await new Promise((r) => setTimeout(r, 200));
    }

    // A positive fact, so a page whose JavaScript never ran cannot pass with
    // "no errors": the h1 has text, and React has attached to the DOM.
    const { result } = await send(
      'Runtime.evaluate',
      { returnByValue: true, expression: RENDERED_EXPRESSION },
      sessionId,
    );

    const errors = [];
    for (const e of events) {
      if (e.sessionId !== sessionId) continue;
      if (e.method === 'Runtime.exceptionThrown') {
        const d = e.params.exceptionDetails;
        errors.push(`uncaught: ${(d.exception?.description || d.text || '').split('\n')[0]}`);
      } else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        const text = e.params.args.map((a) => a.value ?? a.description ?? '').join(' ');
        errors.push(`console.error: ${text.split('\n')[0]}`);
      }
    }
    return { errors, rendered: result.value };
  } finally {
    ws?.close();
    if (proc) {
      const exited = new Promise((r) => proc.once('exit', r));
      killChrome(proc);
      await Promise.race([exited, new Promise((r) => setTimeout(r, 5_000))]);
    }
    // Best effort: a leftover temp folder is not a site defect.
    try {
      rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    } catch {
      /* ignore */
    }
  }
}

test('the home page runs in a real browser without JavaScript errors', async () => {
  const { errors, rendered } = await openInChrome(`${BASE}/`);
  assert.ok(rendered.h1.length > 0, `${BASE}/ rendered no <h1> text in the browser`);
  assert.ok(rendered.hydrated, `React never hydrated ${BASE}/ (did its JavaScript load?)`);
  assert.deepEqual(errors, [], `errors on ${BASE}/:\n${errors.join('\n')}`);
});
