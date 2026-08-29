import { chromium } from 'playwright-core';

const url = process.argv[2] || 'https://hellokahwin.com/';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
});
await page.goto(url, { waitUntil: 'networkidle' });

const info = await page.evaluate(() => {
  const homeLink = document.querySelector('header a[href="/"]');
  const svg = homeLink.querySelector('svg');
  return {
    homeLinkAriaLabel: homeLink.getAttribute('aria-label'),
    homeLinkAccessibleTextGuess: homeLink.textContent.trim(),
    svgRole: svg.getAttribute('role'),
    svgAriaLabel: svg.getAttribute('aria-label'),
    svgViewBox: svg.getAttribute('viewBox'),
  };
});
console.log(JSON.stringify(info, null, 2));
console.log('console/page errors:', errors);
await browser.close();
