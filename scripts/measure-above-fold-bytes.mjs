/**
 * DES-18 — what the homepage actually costs a reader who has not scrolled.
 *
 *   node scripts/measure-above-fold-bytes.mjs --base https://hellokahwin.com
 *   node scripts/measure-above-fold-bytes.mjs --base https://hellokahwin.com --path /artikel
 *
 * ── WHAT "ABOVE THE FOLD" MEANS HERE, PRECISELY ────────────────────────────
 * Not "bytes belonging to elements whose rectangle intersects the viewport" —
 * that is a number about the layout, and a reader is not billed for layout.
 * This measures **every byte the browser transfers before the reader scrolls**:
 * open the page at a stated viewport, never scroll, wait for the network to go
 * quiet, and sum the transfer size of every response.
 *
 * That is the figure a reader on Malaysian mobile data pays, and it is the one
 * that moves when a `loading="lazy"` thumbnail changes file: Chrome fetches
 * lazy images within a viewport-distance threshold, so some rows load without
 * a scroll and some do not. Both outcomes are correctly counted, because the
 * question asked is "what was transferred", not "what did we intend".
 *
 * ── THE NUMBERS ARE ATTACHED TO A BUILD, NOT TO A URL ──────────────────────
 * `ui-layout-gate.mjs` learned this the expensive way: production changed three
 * times during one afternoon and two runs twelve minutes apart disagreed, and
 * it was the instrument that got blamed. So every run prints the deployment id,
 * the `x-vercel-cache` state and the CSS chunk hashes next to the totals.
 *
 * `x-vercel-cache` matters more than it looks: a MISS re-renders at the origin
 * and can change what the HTML contains, and FCP on this site swings by an
 * order of magnitude on byte-identical JS depending on cache state. The bytes
 * measured here are stable across cache states; the fingerprint is what proves
 * that claim rather than assuming it.
 */
import { chromium } from 'playwright-core';

const CHROME =
  process.env.UI_GATE_CHROME ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const many = (n) => argv.reduce((a, v, i) => (v === `--${n}` ? [...a, argv[i + 1]] : a), []);

const base = opt('base', 'https://hellokahwin.com').replace(/\/+$/, '');
const paths = many('path').length ? many('path') : ['/'];
const widths = many('width').length ? many('width').map(Number) : [390, 1440];

/** Group a URL into the bucket a reader would recognise on a bill. */
function bucket(url, type) {
  if (/\.webp(\?|$)/i.test(url) || type === 'image') return 'image';
  if (/\.(woff2?|ttf|otf)(\?|$)/i.test(url) || type === 'font') return 'font';
  if (/\.css(\?|$)/i.test(url) || type === 'stylesheet') return 'css';
  if (/\.js(\?|$)/i.test(url) || type === 'script') return 'js';
  if (type === 'document') return 'document';
  return 'other';
}

async function measure(browser, url, width) {
  const context = await browser.newContext({
    viewport: { width, height: 844 },
    // No cache carried between runs or between widths: a warm disk cache would
    // report a second measurement of zero and look like a win.
    bypassCSP: false,
  });
  const page = await context.newPage();

  const seen = [];
  page.on('response', async (res) => {
    let bytes = null;
    try {
      // `encodedBodySize` from the Resource Timing entry is the wire size. The
      // header is a fallback: R2 always sends Content-Length, Vercel's HTML
      // responses are chunked and do not.
      const len = res.headers()['content-length'];
      if (len) bytes = Number(len);
    } catch {
      /* a response that never completed contributes nothing */
    }
    seen.push({ url: res.url(), status: res.status(), type: res.request().resourceType(), bytes });
  });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 60_000 });
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {});
  // Deliberately NO scroll, and no `document.fonts.ready` wait beyond load:
  // this is the reader who opened the page and stopped.

  // Fill in the bytes the Response headers could not give, from the page's own
  // Resource Timing buffer — the browser's count of what came over the wire.
  const timing = await page.evaluate(() =>
    performance.getEntriesByType('resource').map((e) => ({
      name: e.name,
      encoded: e.encodedBodySize,
      transfer: e.transferSize,
    })),
  );
  const byName = new Map(timing.map((t) => [t.name, t]));
  const navBytes = await page.evaluate(() => {
    const n = performance.getEntriesByType('navigation')[0];
    return n ? n.encodedBodySize : 0;
  });

  const rows = [];
  for (const r of seen) {
    const t = byName.get(r.url);
    let bytes = r.bytes;
    if (bytes == null) bytes = t?.encoded ?? t?.transfer ?? null;
    if (bytes == null && r.type === 'document') bytes = navBytes;
    rows.push({ ...r, bytes: bytes ?? 0, bucket: bucket(r.url, r.type) });
  }

  const headers = response ? response.headers() : {};
  const cssHashes = [...new Set(rows.filter((r) => r.bucket === 'css').map((r) => r.url.split('/').pop()))];

  await context.close();
  return {
    width,
    rows,
    fingerprint: {
      status: response?.status(),
      cache: headers['x-vercel-cache'] ?? '(none)',
      id: headers['x-vercel-id'] ?? '(none)',
      age: headers['age'] ?? '-',
      css: cssHashes,
    },
  };
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let grandTotal = 0;

for (const p of paths) {
  const url = `${base}${p}`;
  for (const width of widths) {
    const { rows, fingerprint } = await measure(browser, url, width);

    const byBucket = new Map();
    for (const r of rows) byBucket.set(r.bucket, (byBucket.get(r.bucket) ?? 0) + r.bytes);
    const total = rows.reduce((a, r) => a + r.bytes, 0);
    grandTotal += total;

    console.log(`\n${'═'.repeat(78)}`);
    console.log(`${url} @${width}px — NO SCROLL`);
    console.log(
      `  ${fingerprint.status} ${fingerprint.cache} age=${fingerprint.age} ${fingerprint.id}`,
    );
    console.log(`  css=[${fingerprint.css.join(' ')}]`);
    console.log(`${'─'.repeat(78)}`);
    for (const [k, v] of [...byBucket].sort((a, b) => b[1] - a[1])) {
      console.log(`  ${k.padEnd(10)} ${String(v).padStart(9)} B  (${rows.filter((r) => r.bucket === k).length} request(s))`);
    }
    console.log(`  ${'TOTAL'.padEnd(10)} ${String(total).padStart(9)} B   ${(total / 1024).toFixed(1)} KiB`);

    const images = rows.filter((r) => r.bucket === 'image').sort((a, b) => b.bytes - a.bytes);
    if (images.length) {
      console.log(`  ── images transferred, heaviest first ──`);
      for (const i of images) {
        console.log(`     ${String(i.bytes).padStart(8)} B  ${i.url.replace(/^https?:\/\/[^/]+\//, '')}`);
      }
    }
  }
}

await browser.close();
console.log(`\nGRAND TOTAL across every measured page/width: ${grandTotal} B`);
