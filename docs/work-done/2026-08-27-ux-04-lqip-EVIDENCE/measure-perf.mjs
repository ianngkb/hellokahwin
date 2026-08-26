/**
 * UX-04 measurement rig. Same shape as the UX-01 rig (playwright-core +
 * the installed Chrome) so numbers are comparable across items.
 *
 * usage: node measure-perf.mjs <url> <label> [warm|cold] [viewport]
 *
 * Reports FCP/LCP, a per-file JavaScript enumeration, and — the thing this
 * item is actually about — whether every <img> carries a blur placeholder
 * or renders over a flat plate.
 */
import { chromium } from 'playwright-core';

const url = process.argv[2];
const label = process.argv[3] || 'measure';
const mode = process.argv[4] || 'warm';
const vp = process.argv[5] === 'desktop'
  ? { viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false }
  : { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' };

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await browser.newContext(vp);
const page = await ctx.newPage();

// Warm the HTTP cache first so the measured load matches the CEO's stated
// condition ("warm cache, fast connection"). Cold mode skips this.
if (mode === 'warm') {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForTimeout(800);
}

await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(1500);

const data = await page.evaluate(() => {
  const out = {};
  const nav = performance.getEntriesByType('navigation')[0];
  out.ttfbMs = nav ? Math.round(nav.responseStart - nav.requestStart) : null;
  out.domContentLoadedMs = nav ? Math.round(nav.domContentLoadedEventEnd) : null;
  out.loadMs = nav ? Math.round(nav.loadEventEnd) : null;
  out.htmlTransferBytes = nav ? nav.transferSize : null;
  out.htmlEncodedBytes = nav ? nav.encodedBodySize : null;

  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  out.fcpMs = fcp ? Math.round(fcp.startTime) : null;
  const fp = performance.getEntriesByName('first-paint')[0];
  out.fpMs = fp ? Math.round(fp.startTime) : null;

  const res = performance.getEntriesByType('resource');
  const bucket = (r) => {
    const u = r.name.split('?')[0];
    if (/\.js$/.test(u) || r.initiatorType === 'script') return 'js';
    if (/\.css$/.test(u) || r.initiatorType === 'link' && /\.css/.test(u)) return 'css';
    if (/\.(webp|png|jpe?g|avif|gif|svg)$/.test(u) || r.initiatorType === 'img' || u.includes('/_next/image')) return 'img';
    if (/\.(woff2?|ttf|otf)$/.test(u)) return 'font';
    return 'other';
  };
  const groups = {};
  for (const r of res) {
    const b = bucket(r);
    groups[b] = groups[b] || { count: 0, transferBytes: 0, encodedBytes: 0, decodedBytes: 0, files: [] };
    groups[b].count += 1;
    groups[b].transferBytes += r.transferSize || 0;
    groups[b].encodedBytes += r.encodedBodySize || 0;
    groups[b].decodedBytes += r.decodedBodySize || 0;
    groups[b].files.push({
      url: r.name.replace(location.origin, ''),
      transfer: r.transferSize || 0,
      encoded: r.encodedBodySize || 0,
      decoded: r.decodedBodySize || 0,
      durMs: Math.round(r.duration),
    });
  }
  for (const g of Object.values(groups)) g.files.sort((a, b) => b.encoded - a.encoded);
  out.resources = groups;

  // The actual defect: an <img> with no blur placeholder over a flat plate.
  // next/image paints `placeholder="blur"` as a background-image on the <img>
  // itself, so its presence is directly observable.
  out.images = [...document.querySelectorAll('img')].map((img) => {
    const cs = getComputedStyle(img);
    const parent = img.parentElement;
    const pcs = parent ? getComputedStyle(parent) : null;
    const r = img.getBoundingClientRect();
    return {
      src: (img.currentSrc || img.src).slice(0, 120),
      loading: img.getAttribute('loading'),
      fetchpriority: img.getAttribute('fetchpriority'),
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
      complete: img.complete,
      hasBlurPlaceholder: cs.backgroundImage !== 'none' && cs.backgroundImage.includes('data:'),
      backgroundImageHead: cs.backgroundImage.slice(0, 60),
      plateBg: pcs ? pcs.backgroundColor : null,
      plateClass: parent ? parent.className.toString().slice(0, 80) : null,
      rect: { top: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) },
    };
  });
  out.imgCount = out.images.length;
  out.imgsWithBlur = out.images.filter((i) => i.hasBlurPlaceholder).length;
  out.imgsLazy = out.images.filter((i) => i.loading === 'lazy').length;
  return out;
});

console.log('### ' + label + ' :: ' + url + ' :: mode=' + mode + ' :: vp=' + JSON.stringify(vp.viewport));
console.log(JSON.stringify(data, null, 2));
await browser.close();
