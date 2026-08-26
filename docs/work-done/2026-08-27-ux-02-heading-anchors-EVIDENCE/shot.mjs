// 390px capture + anchor-jump probe. playwright-core drives the Chrome that is
// already installed — see memory `hellokahwin-390px-rig-playwright-core-system-chrome`.
// Usage: node shot.mjs <url> <out.png> [#anchor]
import { chromium } from 'playwright-core';

const [url, out, anchor] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(600);

if (anchor) {
  // Click the TOC link rather than setting location.hash: this proves the link
  // a reader (and a crawler) actually sees is the thing that works.
  const link = page.locator(`nav[aria-label="Isi kandungan"] a[href="${anchor}"]`).first();
  console.log(JSON.stringify({ tocLinkVisible: await link.isVisible() }));
  // Put the link in the UPPER half of the viewport before tapping it: the
  // fixed "Baca Seterusnya" bar owns the bottom of the screen on mobile and
  // otherwise intercepts the tap, which reports as a false failure.
  await link.evaluate((el) => el.scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(400);
  const box = await link.boundingBox();
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await page.waitForTimeout(700);
  const probe = await page.evaluate((sel) => {
    const el = document.getElementById(sel.slice(1));
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    return {
      found: true,
      text: el.textContent.trim().slice(0, 60),
      topPx: Math.round(r.top),
      hash: location.hash,
      scrollMarginTop: getComputedStyle(el).scrollMarginTop,
    };
  }, anchor);
  console.log(JSON.stringify(probe, null, 2));
}

await page.screenshot({ path: out, fullPage: false });
console.log('wrote ' + out);
await browser.close();
