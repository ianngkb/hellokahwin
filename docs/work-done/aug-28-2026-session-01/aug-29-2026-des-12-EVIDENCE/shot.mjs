import { chromium } from 'playwright-core';

const url = process.argv[2];
const outPrefix = process.argv[3];
const widths = [
  { w: 360, dpr: 2, mobile: true },
  { w: 1400, dpr: 1, mobile: false },
];

const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
for (const { w, dpr, mobile } of widths) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 500 },
    deviceScaleFactor: dpr,
    isMobile: mobile,
    hasTouch: mobile,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.getByRole('banner').first().screenshot({ path: `${outPrefix}-${w}.png` });
  await ctx.close();
  console.log(`wrote ${outPrefix}-${w}.png`);
}
await browser.close();
