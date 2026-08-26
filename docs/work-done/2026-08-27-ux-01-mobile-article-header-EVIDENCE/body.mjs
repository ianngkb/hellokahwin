import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
await page.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(700);
console.log((await page.evaluate(() => {
  const art = document.querySelector('article');
  const rows = [];
  const walk = (el, depth) => {
    for (const c of el.children) {
      const r = c.getBoundingClientRect();
      if (r.height === 0) continue;
      rows.push('  '.repeat(depth) + c.tagName.toLowerCase() +
        (c.className ? '.' + String(c.className).split(' ').slice(0,2).join('.') : '') +
        ' top=' + Math.round(r.top) + ' h=' + Math.round(r.height) +
        ' :: ' + c.textContent.trim().slice(0, 40).replace(/\s+/g,' '));
      if (depth < 2 && r.top < 1100) walk(c, depth + 1);
    }
  };
  walk(art, 0);
  return rows.slice(0, 22).join('\n');
})));
await browser.close();
