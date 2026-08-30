// UI-10: a side-by-side-able capture of the READING area — body prose, an
// in-article photograph and the sidebar in one frame — at 1440 and 1920.
// The fold capture only shows the header; the -body capture landed on the
// table of contents. This one scrolls to the first h2, which is past both.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const BASE = process.argv[2];
const OUT = process.argv[3];
const TAG = process.argv[4];
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });

const browser = await chromium.launch({
  executablePath:
    'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
for (const w of [1440, 1920]) {
  const ctx = await browser.newContext({
    viewport: { width: w, height: 1600 },
    deviceScaleFactor: 1,
    extraHTTPHeaders: process.env.VERCEL_BYPASS
      ? { 'x-vercel-protection-bypass': process.env.VERCEL_BYPASS, 'x-vercel-set-bypass-cookie': 'true' }
      : {},
  });
  const page = await ctx.newPage();
  await page.goto(BASE + '/artikel/idea-dan-nasihat/garden-wedding', { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.8);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
  });
  await page.evaluate(() => document.fonts.ready);
  const y = await page.evaluate(() => {
    const h = document.querySelector('.inspire-prose h2');
    return h.getBoundingClientRect().top + window.scrollY - 40;
  });
  await page.evaluate((yy) => window.scrollTo(0, yy), y);
  await page.waitForTimeout(1200);
  const f = path.join(OUT, 'screens', TAG + '-reading-' + w + 'px.png');
  await page.screenshot({ path: f });
  console.log('WROTE ' + f);
  await ctx.close();
}
await browser.close();
