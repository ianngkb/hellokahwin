/**
 * Films the load of a page on a throttled connection and reports, frame by
 * frame, how many card plates are still flat (no image painted, no blur).
 *
 * The defect is invisible on a fast desktop connection — that is precisely why
 * it survived. Throttling to Slow 3G makes the state the reader on a Malaysian
 * mobile network actually sees observable.
 */
import { chromium } from 'playwright-core';
const url = process.argv[2];
const tag = process.argv[3] || 'strip';
const frames = Number(process.argv[4] || 8);
const gap = Number(process.argv[5] || 400);

const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
const cdp = await ctx.newCDPSession(page);
await cdp.send('Network.enable');
// Slow 3G, the Chrome DevTools preset.
await cdp.send('Network.emulateNetworkConditions', {
  offline: false, latency: 400, downloadThroughput: (400 * 1024) / 8, uploadThroughput: (400 * 1024) / 8,
});

page.goto(url, { waitUntil: 'commit', timeout: 180000 }).catch(() => {});
await page.waitForLoadState('domcontentloaded').catch(() => {});
const t0 = Date.now();
console.log('### ' + tag + ' :: ' + url + ' :: Slow 3G (400kbps, 400ms RTT)');
console.log('  ms   imgs  painted  blurred  flatPlates');
for (let i = 0; i < frames; i++) {
  await page.waitForTimeout(gap);
  // Scroll the card grid into view so the lazy cards are actually requested.
  if (i === 1) await page.evaluate(() => window.scrollTo(0, 900)).catch(() => {});
  let s;
  try {
  s = await page.evaluate(() => {
    const imgs = [...document.querySelectorAll('img')].filter((i) => !i.src.includes('favicon'));
    let painted = 0, blurred = 0, flat = 0;
    for (const img of imgs) {
      const done = img.complete && img.naturalWidth > 0;
      const hasBlur = getComputedStyle(img).backgroundImage.includes('data:');
      if (done) painted++;
      if (hasBlur) blurred++;
      // A flat plate: no photograph painted yet AND no placeholder standing in.
      if (!done && !hasBlur) flat++;
    }
    return { n: imgs.length, painted, blurred, flat };
  });
  } catch { console.log(String(Date.now()-t0).padStart(6)+"   (document not yet parsed)"); continue; }
  console.log(String(Date.now() - t0).padStart(6), String(s.n).padStart(5), String(s.painted).padStart(8), String(s.blurred).padStart(8), String(s.flat).padStart(11));
  if (process.env.SHOTS) await page.screenshot({ path: `${tag}-${String(i).padStart(2, '0')}.png`, timeout: 8000, animations: 'disabled' }).catch(() => {});
}
await browser.close();
