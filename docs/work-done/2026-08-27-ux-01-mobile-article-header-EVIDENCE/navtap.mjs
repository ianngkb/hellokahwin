import { chromium } from 'playwright-core';
const url = process.argv[2];
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(800);

const state = () => page.evaluate(() => {
  const as = [...document.querySelectorAll('header nav a')];
  return {
    url: location.pathname,
    anchors: as.length,
    expanded: as.map((a) => a.getAttribute('aria-expanded')),
    activeItem: document.querySelectorAll('.inspire-nav-item-active').length,
    accordionMenus: document.querySelectorAll('header nav [role="menu"]').length,
  };
});
console.log('initial: ' + JSON.stringify(await state()));

// Real touch tap (dispatchEvent path a phone would take)
const box = await page.evaluate(() => {
  const a = document.querySelector('header nav a svg')?.closest('a');
  a.scrollIntoView({ block: 'center', inline: 'center' });
  const r = a.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: a.textContent.trim() };
});
console.log('tapping "' + box.text + '" at ' + Math.round(box.x) + ',' + Math.round(box.y));
await page.touchscreen.tap(box.x, box.y);
await page.waitForTimeout(800);
console.log('after touch tap: ' + JSON.stringify(await state()));

await page.waitForTimeout(1000);
console.log('after 1s settle:  ' + JSON.stringify(await state()));
await browser.close();
