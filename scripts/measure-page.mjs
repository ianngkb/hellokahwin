/**
 * Page performance measurement — the shared rig.
 *
 *   pnpm perf:measure <url> [--label X] [--desktop] [--runs N] [--slow3g] [--json]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE QUOTING AN FCP NUMBER FROM THIS SITE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * FCP here is set by the CDN cache state, NOT by the payload. Measured 27 Aug
 * 2026 (UX-04), twenty runs, each a fresh browser context so the JavaScript was
 * byte-identical every time:
 *
 *     x-vercel-cache: HIT   ->  docEnd  85-102ms,  FCP   172-304ms
 *     x-vercel-cache: MISS  ->  docEnd 1008-1179ms, FCP 1140-1304ms
 *     cold lambda + MISS    ->                      FCP      2816ms
 *     warm browser cache    ->                      FCP       124ms
 *
 * `jsEnc` was 177,894 bytes in ALL of them. So:
 *
 *   1. A number without its cache state is not a measurement. UX-04's brief
 *      reported "FCP 3,040ms with a warm cache". Warm was 124ms. The 3,040ms was
 *      a cache MISS. That is a 25x disagreement produced by one unstated word,
 *      and it is why this script prints x-vercel-cache next to every FCP and
 *      why you cannot turn that column off.
 *
 *   2. Bundle-size work cannot move FCP on this site. Reducing JavaScript is
 *      worth doing for parse time on cheap Android, but if the goal on the
 *      ticket is FCP, the lever is cache hit rate and server render time, not
 *      the payload. Do not spend an item re-proving this.
 *
 * Byte columns: `encoded` is what the reader downloads (compressed); `decoded`
 * is what the phone must parse. They differ by ~3.2x here. Say which one you
 * mean — UX-04's brief quoted 542KB, which was the decoded figure, for a payload
 * that costs 174KB on the wire.
 *
 * Cross-origin resources (images.hellokahwin.com) report 0 bytes without
 * Timing-Allow-Origin. Image weight is NOT measurable from this rig; measure it
 * against R2 directly.
 *
 * Requires playwright-core and the installed Chrome — deliberately not a
 * dependency of the app. Claude-in-Chrome is not connected in the worktrees.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

if (!url) {
  console.error(
    'usage: pnpm perf:measure <url> [--label X] [--desktop] [--runs N] [--slow3g] [--json]',
  );
  process.exit(1);
}

const runs = Number(opt('runs', 3));
const label = opt('label', 'measure');

// iPhone 12/13/14 logical viewport. The audience is on cheap Android and slow
// connections, so mobile is the default and desktop is the opt-in.
const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};
const DESKTOP = { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const out = [];

for (let i = 0; i < runs; i++) {
  const ctx = await browser.newContext(flag('desktop') ? DESKTOP : MOBILE);
  const page = await ctx.newPage();

  if (flag('slow3g')) {
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', {
      offline: false,
      latency: 400,
      downloadThroughput: (400 * 1024) / 8,
      uploadThroughput: (400 * 1024) / 8,
    });
  }

  // The cache header is the point of this script. Capture it off the document
  // response, not a second request, or it reports a different cache entry.
  let headers = {};
  page.on('response', (r) => {
    if (r.url() === url) headers = r.headers();
  });

  await page.goto(url, { waitUntil: 'networkidle', timeout: 180000 });
  await page.waitForTimeout(800);

  const m = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    const fcp = performance.getEntriesByName('first-contentful-paint')[0];
    const res = performance.getEntriesByType('resource');
    const isJs = (r) => /\.js(\?|$)/.test(r.name);
    const isCss = (r) => /\.css(\?|$)/.test(r.name);
    const sum = (list, k) => list.reduce((a, r) => a + (r[k] || 0), 0);
    const js = res.filter(isJs);
    const css = res.filter(isCss);
    const imgs = [...document.querySelectorAll('img')];
    return {
      ttfb: nav ? Math.round(nav.responseStart - nav.requestStart) : null,
      docEnd: nav ? Math.round(nav.responseEnd) : null,
      fcp: fcp ? Math.round(fcp.startTime) : null,
      htmlEnc: nav ? nav.encodedBodySize : null,
      jsCount: js.length,
      jsEnc: sum(js, 'encodedBodySize'),
      jsDec: sum(js, 'decodedBodySize'),
      cssEnc: sum(css, 'encodedBodySize'),
      imgCount: imgs.length,
      imgLazy: imgs.filter((i) => i.getAttribute('loading') === 'lazy').length,
      // UX-04: next/image paints placeholder="blur" as a background-image on the
      // <img> itself, and clears it once the photograph loads. So a low count on
      // a settled page is expected — to see placeholders working, use --slow3g
      // and watch this during the load, not after it.
      imgBlurred: imgs.filter((i) => getComputedStyle(i).backgroundImage.includes('data:')).length,
    };
  });

  m.cache = headers['x-vercel-cache'] || '-';
  m.age = headers['age'] ?? '-';
  out.push(m);
  await ctx.close();
}

if (flag('json')) {
  console.log(JSON.stringify({ url, label, runs: out }, null, 2));
} else {
  console.log(`### ${label} :: ${url}${flag('slow3g') ? ' :: Slow 3G' : ''}`);
  console.log(
    'run  cache        age   ttfb  docEnd    fcp  files    jsEnc    jsDec   html  imgs lazy',
  );
  for (const [i, r] of out.entries()) {
    console.log(
      String(i).padStart(3),
      String(r.cache).padEnd(12),
      String(r.age).padStart(5),
      String(r.ttfb).padStart(6),
      String(r.docEnd).padStart(7),
      String(r.fcp).padStart(6),
      String(r.jsCount).padStart(6),
      String(r.jsEnc).padStart(8),
      String(r.jsDec).padStart(8),
      String(r.htmlEnc).padStart(6),
      String(r.imgCount).padStart(5),
      String(r.imgLazy).padStart(4),
    );
  }
  const hits = out.filter((r) => r.cache === 'HIT').map((r) => r.fcp);
  const miss = out.filter((r) => r.cache === 'MISS').map((r) => r.fcp);
  if (hits.length)
    console.log(`  FCP on HIT : ${Math.min(...hits)}-${Math.max(...hits)}ms (n=${hits.length})`);
  if (miss.length)
    console.log(`  FCP on MISS: ${Math.min(...miss)}-${Math.max(...miss)}ms (n=${miss.length})`);
  if (hits.length && miss.length) {
    console.log(
      '  ^ quote BOTH. A single FCP figure from this site is ambiguous — see the header of this file.',
    );
  }
}

await browser.close();
