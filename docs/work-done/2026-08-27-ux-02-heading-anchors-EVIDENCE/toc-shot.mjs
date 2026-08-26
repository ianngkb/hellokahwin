// Screenshot the table of contents itself, at a given viewport width.
// Usage: node toc-shot.mjs <url> <out.png> <width>
import { chromium } from 'playwright-core';
const [url, out, width = '390'] = process.argv.slice(2);
const w = Number(width);
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  headless: true,
});
const ctx = await browser.newContext({
  viewport: { width: w, height: 900 },
  deviceScaleFactor: 2,
  isMobile: w < 700,
  hasTouch: w < 700,
});
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
const nav = page.locator('nav[aria-label="Isi kandungan"]');
await nav.scrollIntoViewIfNeeded();
await page.waitForTimeout(500);
const links = await nav.locator('a').evaluateAll((els) =>
  els.map((a) => ({ href: a.getAttribute('href'), text: a.textContent.trim() })),
);
console.log(JSON.stringify({ width: w, count: links.length, links }, null, 1));
await nav.screenshot({ path: out });
console.log('wrote ' + out);
await browser.close();
