// DES-12: measure the header wordmark + search fit at 360px, and desktop.
import { chromium } from 'playwright-core';

const url = process.argv[2] || 'http://localhost:3200/brand';
const widths = [360, 390, 1400];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});

for (const width of widths) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: width <= 390 ? 2 : 1,
    isMobile: width <= 390,
    hasTouch: width <= 390,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });

  const data = await page.evaluate(() => {
    const header = document.querySelector('header');
    const markLink = header.querySelector('a[href="/"]');
    const mark = markLink.querySelector('svg');
    const searchLink = header.querySelector('a[href="/artikel#cari"]');
    const mr = mark.getBoundingClientRect();
    const sr = searchLink.getBoundingClientRect();
    const hr = header.getBoundingClientRect();

    const toRGB = (css) => {
      const c = document.createElement('canvas');
      c.width = c.height = 1;
      const g = c.getContext('2d');
      g.fillStyle = '#000';
      g.fillStyle = css;
      g.fillRect(0, 0, 1, 1);
      const d = g.getImageData(0, 0, 1, 1).data;
      return [d[0], d[1], d[2]];
    };
    const lum = ([r, g, b]) => {
      const f = (v) => {
        v /= 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contrast = (a, b) => {
      const la = lum(a), lb = lum(b);
      const [hi, lo] = la > lb ? [la, lb] : [lb, la];
      return (hi + 0.05) / (lo + 0.05);
    };

    const headerBgCss = getComputedStyle(header).backgroundColor;
    const markColorCss = getComputedStyle(mark).color;
    const markRGB = toRGB(markColorCss);
    const bgRGB = toRGB(headerBgCss);

    return {
      viewportWidth: window.innerWidth,
      markWidth: mr.width,
      markHeight: mr.height,
      markRight: mr.right,
      searchLeft: sr.left,
      searchWidth: sr.width,
      searchRight: sr.right,
      gap: sr.left - mr.right,
      headerWidth: hr.width,
      overlaps: mr.right > sr.left,
      offscreen: sr.right > window.innerWidth || mr.left < 0,
      headerBgCss,
      markColorCss,
      markRGB,
      bgRGB,
      contrastMarkVsHeaderBg: contrast(markRGB, bgRGB),
      documentScrollWidth: document.documentElement.scrollWidth,
      hasHorizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });

  console.log(`\n=== width=${width} ===`);
  console.log(JSON.stringify(data, null, 2));
  await ctx.close();
}

await browser.close();
