import { chromium } from 'playwright-core';
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const browser = await chromium.launch({ executablePath: CHROME, headless: true });

for (const [name, width] of [
  ['360', 360],
  ['1280', 1280],
]) {
  const page = await browser.newPage({ viewport: { width, height: 1400 } });
  await page.goto('http://localhost:3200/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri', {
    waitUntil: 'networkidle',
  });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: `docs/des-08-evidence/article-top-${name}.png`,
    clip: { x: 0, y: 0, width, height: Math.min(1400, width === 360 ? 1400 : 1200) },
  });
}
await browser.close();
