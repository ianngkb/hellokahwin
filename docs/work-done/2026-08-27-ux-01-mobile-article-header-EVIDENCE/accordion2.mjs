import { chromium } from 'playwright-core';
const url = process.argv[2], shot = process.argv[3];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(800);

console.log('chevrons (categories with children): ' +
  await page.evaluate(() => document.querySelectorAll('header nav a svg').length));

// scroll the rail so the chevron link is reachable, then tap it
const handle = await page.evaluateHandle(() => {
  const svg = document.querySelector('header nav a svg');
  return svg ? svg.closest('a') : null;
});
const el = handle.asElement();
if (el) {
  console.log('tapping: ' + (await el.evaluate((a) => a.textContent.trim())));
  await el.evaluate((a) => a.scrollIntoView({ block: 'center', inline: 'center' }));
  await page.waitForTimeout(300);
  await el.click({ force: true });
  await page.waitForTimeout(600);
}
console.log('url after tap: ' + page.url());

const res = await page.evaluate(() => {
  const as = [...document.querySelectorAll('header nav a')];
  const rendered = as.filter((a) => a.getClientRects().length > 0);
  return {
    total: as.length,
    rendered: rendered.length,
    allDeclareMinHeight44: as.every((a) => parseFloat(getComputedStyle(a).minHeight) >= 44),
    minRenderedHeight: rendered.length
      ? Math.round(Math.min(...rendered.map((a) => a.getBoundingClientRect().height)) * 100) / 100
      : null,
    offenders: as.filter((a) => parseFloat(getComputedStyle(a).minHeight) < 44)
      .map((a) => ({ t: a.textContent.trim().slice(0, 30), mh: getComputedStyle(a).minHeight })),
    all: as.map((a) => ({
      t: a.textContent.trim().slice(0, 30),
      mh: getComputedStyle(a).minHeight,
      h: Math.round(a.getBoundingClientRect().height * 100) / 100,
      shown: a.getClientRects().length > 0,
    })),
  };
});
console.log(JSON.stringify(res, null, 2));
await page.screenshot({ path: shot });
console.log('SCREENSHOT: ' + shot);
await browser.close();
