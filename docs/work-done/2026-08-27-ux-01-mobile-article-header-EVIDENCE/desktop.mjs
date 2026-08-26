import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(1000);
console.log(JSON.stringify(await page.evaluate(() => {
  const h = document.querySelector('header');
  const bar = document.querySelector('div.fixed.bottom-0');
  const mobileCover = document.querySelector('[data-mobile-cover]');
  return {
    headerHeight: Math.round(h.getBoundingClientRect().height),
    headerVisible: getComputedStyle(h).display,
    navAnchors: [...document.querySelectorAll('header nav a')].map(a => Math.round(a.getBoundingClientRect().height)),
    bottomBarDisplay: bar ? getComputedStyle(bar).display : 'absent',
    mobileCoverHiddenOnDesktop: mobileCover ? mobileCover.getClientRects().length === 0 : 'absent',
    desktopHeroPresent: [...document.querySelectorAll('div')].some(d => getComputedStyle(d).aspectRatio === '2.4 / 1' && d.getClientRects().length > 0),
    h1: document.querySelector('h1')?.textContent?.trim().slice(0,50),
  };
})));
// hover a category to open the desktop dropdown, then measure its rows
const link = await page.$('header nav a');
await link.hover();
await page.waitForTimeout(400);
console.log('dropdown rows: ' + JSON.stringify(await page.evaluate(() => {
  const rows = [...document.querySelectorAll('header nav [role="menu"] a')].filter(a => a.getClientRects().length);
  return { count: rows.length, heights: [...new Set(rows.map(a => Math.round(a.getBoundingClientRect().height)))] };
})));
await page.screenshot({ path: process.argv[3] });
console.log('SCREENSHOT: ' + process.argv[3]);
await browser.close();
