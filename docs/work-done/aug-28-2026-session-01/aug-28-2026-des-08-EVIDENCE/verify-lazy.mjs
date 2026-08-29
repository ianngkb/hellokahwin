import { chromium } from 'playwright-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage({ viewport: { width: 360, height: 1400 } });
await page.goto('http://localhost:3200/', { waitUntil: 'networkidle' });
// Force every lazy image to load, then wait for actual decode.
await page.evaluate(async () => {
  const imgs = Array.from(document.querySelectorAll('img[loading="lazy"]'));
  imgs.forEach((img) => img.setAttribute('loading', 'eager'));
  await Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((res) => {
            img.onload = res;
            img.onerror = res;
          }),
    ),
  );
});
const broken = await page.evaluate(() =>
  Array.from(document.querySelectorAll('img'))
    .filter((i) => !i.complete || i.naturalWidth === 0)
    .map((i) => i.src),
);
console.log('broken images:', broken);
await page.waitForTimeout(800);
await page.screenshot({ path: 'docs/des-08-evidence/home-360-forced.png', fullPage: true });
await page.screenshot({
  path: 'docs/des-08-evidence/home-360-row-zoom.png',
  clip: { x: 0, y: 850, width: 360, height: 200 },
});
await browser.close();
