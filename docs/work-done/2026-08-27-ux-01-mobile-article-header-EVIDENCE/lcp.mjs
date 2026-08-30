import { chromium } from 'playwright-core';
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const imageReqs = [];
page.on('request', (r) => { if (r.resourceType() === 'image') imageReqs.push(r.url()); });
await page.goto(process.argv[2], { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(800);
const rendered = await page.evaluate(() => {
  const box = document.querySelector('[data-mobile-cover]');
  const img = box.querySelector('img');
  return { currentSrc: img.currentSrc, srcAttr: img.getAttribute('src') };
});
const preload = await page.evaluate(() => [...document.querySelectorAll('link[rel="preload"][as="image"]')]
  .map((l) => ({ media: l.media, href: l.href })));
const cropOf = (u) => (u.match(/crop-[a-z0-9.x-]+/) || ['<none>'])[0];
console.log('rendered <img> currentSrc crop : ' + cropOf(rendered.currentSrc));
console.log('mobile preload crop            : ' + cropOf((preload.find(p => p.media.includes('max-width')) || {}).href || ''));
console.log('MATCH: ' + (cropOf(rendered.currentSrc) === cropOf((preload.find(p => p.media.includes('max-width')) || {}).href || '')));
const coverCrops = [...new Set(imageReqs.filter(u => /crop-(4x3-article-card|4x5-mobile-cover|16x9-og|4\.3x1)/.test(u)).map(cropOf))];
console.log('distinct COVER crops actually fetched at 390px: ' + JSON.stringify(coverCrops));
await browser.close();
