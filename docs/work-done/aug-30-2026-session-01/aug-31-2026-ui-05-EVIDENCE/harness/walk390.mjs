/**
 * UI-05 measurement rig — walks category templates at 390px.
 * Scratchpad only. Not production code.
 *
 * Measures, per URL: full scroll height, image count, article-link count,
 * per-link tap-target height, headline wrap line count, and the longest
 * rendered Malay headline. Writes a full-page screenshot.
 *
 * ⚠ THE `imgRendered` FIELD IS WRONG ON ANY `srcset` IMAGE, AND KNOWINGLY SO.
 * It reports `img.naturalWidth`, which on an element carrying a `srcset` with
 * `w` descriptors returns the intrinsic width DIVIDED by the pixel density the
 * browser derived from `sizes` - even when the image is fully loaded. Measured
 * live: `sizes="176px"` on a genuinely 1200px asset reports 176, because
 * 1200 / (1200/176) = 176.
 *
 * Left in place rather than deleted because this file is the record of what was
 * run, but DO NOT quote that field, and do not copy this pattern. Read intrinsic
 * size from a detached `Image()` on `currentSrc` - see `dims.mjs`, which does.
 * Any upscale check written as `boxWidth / img.naturalWidth` returns ~1.0 by
 * construction and can never fire.
 *
 * Every other field here - scroll height, tap targets, wrap counts, overflow -
 * is read from geometry and is sound.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUT = process.argv[2];
const urls = process.argv.slice(3);

const MOBILE = {
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
};

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const url of urls) {
  const ctx = await browser.newContext(MOBILE);
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
  // force every lazy image to commit so heights are real
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);

  const m = await page.evaluate(() => {
    const main = document.querySelector('main') ?? document.body;
    const links = [...main.querySelectorAll('a[href*="/artikel/"]')].filter((a) =>
      /\/artikel\/[a-z0-9-]+\/[a-z0-9-]+/.test(a.getAttribute('href') || ''),
    );
    const lineH = (el) => {
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.2;
      return Math.round(el.getBoundingClientRect().height / lh);
    };
    const heads = [...main.querySelectorAll('h2.t, .t')].filter((e) => e.textContent.trim());
    const imgs = [...document.querySelectorAll('img')];
    return {
      scrollHeight: document.documentElement.scrollHeight,
      viewportH: window.innerHeight,
      screens: +(document.documentElement.scrollHeight / window.innerHeight).toFixed(1),
      imgCount: imgs.length,
      imgRendered: imgs.map((i) => `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}@nat${i.naturalWidth}x${i.naturalHeight}`).slice(0, 4),
      articleLinks: links.length,
      tapHeights: links.map((a) => Math.round(a.getBoundingClientRect().height)),
      minTap: Math.min(...links.map((a) => Math.round(a.getBoundingClientRect().height))),
      headlineLines: heads.map(lineH),
      maxHeadlineLines: Math.max(0, ...heads.map(lineH)),
      longestHeadline: heads
        .map((e) => e.textContent.trim())
        .sort((a, b) => b.length - a.length)[0],
      h1: main.querySelector('h1')?.textContent?.trim(),
      h2s: [...main.querySelectorAll('h2')].length,
      bodyOverflowX: document.documentElement.scrollWidth > window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    };
  });

  const slug = url.split('/').filter(Boolean).pop();
  await page.screenshot({ path: `${OUT}/${slug}-390.png`, fullPage: true });
  console.log(JSON.stringify({ url, ...m }, null, 2));
  await ctx.close();
}
await browser.close();
