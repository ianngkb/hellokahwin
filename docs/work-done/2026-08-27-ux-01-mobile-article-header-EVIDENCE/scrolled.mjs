import { chromium } from 'playwright-core';

const url = process.argv[2];
const shot = process.argv[3];
const scrollTo = Number(process.argv[4] || 2500);

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
await page.waitForTimeout(1000);

// Prove the bar is OUT of the way on the landing screen.
const atTop = await page.evaluate(() => {
  const bar = document.querySelector('div.fixed.bottom-0');
  const r = bar.getBoundingClientRect();
  return {
    scrollY: window.scrollY,
    barTop: Math.round(r.top * 100) / 100,
    barBottom: Math.round(r.bottom * 100) / 100,
    viewportH: window.innerHeight,
    intersectsViewport: r.top < window.innerHeight,
    ariaHidden: bar.getAttribute('aria-hidden'),
  };
});

await page.evaluate((y) => window.scrollTo(0, y), scrollTo);
await page.waitForTimeout(700);

const afterScroll = await page.evaluate(() => {
  const bar = document.querySelector('div.fixed.bottom-0');
  const r = bar.getBoundingClientRect();
  const header = document.querySelector('header');
  const hr = header.getBoundingClientRect();
  const link = bar.querySelector('a');
  const lr = link ? link.getBoundingClientRect() : null;
  const galleryBtn = bar.querySelector('[role="button"]');
  const gr = galleryBtn ? galleryBtn.getBoundingClientRect() : null;
  const progress = bar.querySelector('[aria-hidden="true"] > div');
  return {
    scrollY: window.scrollY,
    viewportH: window.innerHeight,
    bar: {
      top: Math.round(r.top * 100) / 100,
      bottom: Math.round(r.bottom * 100) / 100,
      height: Math.round(r.height * 100) / 100,
      visibleInViewport: r.top < window.innerHeight && r.bottom > 0,
      ariaHidden: bar.getAttribute('aria-hidden'),
    },
    nextLink: lr
      ? {
          href: link.getAttribute('href'),
          text: link.textContent.trim(),
          height: Math.round(lr.height * 100) / 100,
          insideViewport: lr.top >= 0 && lr.bottom <= window.innerHeight,
        }
      : null,
    galleryButton: gr
      ? {
          label: galleryBtn.getAttribute('aria-label'),
          w: Math.round(gr.width * 100) / 100,
          h: Math.round(gr.height * 100) / 100,
        }
      : null,
    progressTransform: progress ? getComputedStyle(progress).transform : null,
    headerStillPinned: {
      top: Math.round(hr.top * 100) / 100,
      height: Math.round(hr.height * 100) / 100,
      position: getComputedStyle(header).position,
    },
  };
});

console.log('--- AT TOP (landing screen) ---');
console.log(JSON.stringify(atTop, null, 2));
console.log('--- AFTER SCROLL TO ' + scrollTo + ' ---');
console.log(JSON.stringify(afterScroll, null, 2));

await page.screenshot({ path: shot });
console.log('SCREENSHOT: ' + shot);
await browser.close();
