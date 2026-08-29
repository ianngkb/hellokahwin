// DES-08 — 360px-first visual check + horizontal-overflow assertion.
// Uses playwright-core against the installed system Chrome (no bundled
// browser download), per this session's established rig.
import { chromium } from 'playwright-core';

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'http://localhost:3200';
const PAGES = [
  ['home', '/'],
  ['category-flat', '/artikel/pantai-santai'],
  ['category-pillar', '/artikel/hantaran-mas-kahwin'],
  ['article', '/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri'],
];
const VIEWPORTS = [
  { name: '360', width: 360, height: 1400 },
  { name: '1280', width: 1280, height: 1000 },
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const [slug, path] of PAGES) {
  for (const vp of VIEWPORTS) {
    const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
    await page.goto(BASE + path, { waitUntil: 'networkidle', timeout: 30000 });
    const innerWidth = await page.evaluate(() => window.innerWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const overflow = scrollWidth > innerWidth;
    const file = `docs/des-08-evidence/${slug}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(
      `${slug.padEnd(16)} ${vp.name.padEnd(5)} innerWidth=${innerWidth} scrollWidth=${scrollWidth} ` +
        `overflow=${overflow ? 'YES <<<' : 'no'}  -> ${file}`,
    );
    await page.close();
  }
}

await browser.close();
