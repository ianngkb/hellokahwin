import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(800);

const box = await page.evaluate(() => {
  const a = document.querySelector('header nav a svg').closest('a');
  a.scrollIntoView({ block: 'center', inline: 'center' });
  window.__log = [];
  for (const t of ['pointerdown','touchstart','mouseover','mouseenter','mousedown','focus','click','mouseleave','mouseout','blur','pointerup','touchend']) {
    (t.includes('enter')||t.includes('leave') ? a.parentElement : a).addEventListener(t, (e) => {
      window.__log.push(t + ' | defaultPrevented=' + e.defaultPrevented +
        ' | aria-expanded=' + a.getAttribute('aria-expanded'));
    }, true);
  }
  const r = a.getBoundingClientRect();
  return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
});
await page.touchscreen.tap(box.x, box.y);
await page.waitForTimeout(900);
console.log((await page.evaluate(() => window.__log)).join('\n'));
console.log('final aria-expanded: ' + await page.evaluate(() =>
  document.querySelector('header nav a svg').closest('a').getAttribute('aria-expanded')));
await browser.close();
