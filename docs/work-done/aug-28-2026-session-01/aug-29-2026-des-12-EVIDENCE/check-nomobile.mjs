import { chromium } from 'playwright-core';
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
for (const url of ['https://hellokahwin.com/', 'https://hellokahwin.com/artikel', 'https://hellokahwin.com/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri']) {
  const page = await browser.newPage({ viewport: { width: 1400, height: 900 } });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(url, { waitUntil: 'networkidle' });
  console.log(url, '->', errors.length ? errors : 'no errors');
  await page.close();
}
await browser.close();
