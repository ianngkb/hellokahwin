import { chromium } from 'playwright-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const BASE = 'https://hellokahwin.com';
const PAGES = [
  ['live-home', '/'],
  ['live-category-flat', '/artikel/pantai-santai'],
  ['live-category-pillar', '/artikel/hantaran-mas-kahwin'],
  ['live-article', '/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri'],
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
    await page.waitForTimeout(500);
    const innerWidth = await page.evaluate(() => window.innerWidth);
    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    const overflow = scrollWidth > innerWidth;
    const file = `docs/des-08-evidence/${slug}-${vp.name}.png`;
    await page.screenshot({ path: file, fullPage: true });
    console.log(
      `${slug.padEnd(22)} ${vp.name.padEnd(5)} innerWidth=${innerWidth} scrollWidth=${scrollWidth} ` +
        `overflow=${overflow ? 'YES <<<' : 'no'}  -> ${file}`,
    );
    await page.close();
    await new Promise((r) => setTimeout(r, 1500));
  }
}

await browser.close();
