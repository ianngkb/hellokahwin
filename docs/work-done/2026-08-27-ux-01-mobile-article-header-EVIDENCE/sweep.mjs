import { chromium } from 'playwright-core';
import fs from 'fs';
const urls = fs.readFileSync(process.argv[2], 'utf8').trim().split('\n')
  .map(u => u.replace('localhost:3200', 'localhost:3201'));
const browser = await chromium.launch({
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
let pass = 0, fail = 0;
console.log('slug'.padEnd(42) + 'hdr  navMin  cover      ratio  firstP  bar');
for (const u of urls) {
  try {
    await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 90000 });
    await page.waitForTimeout(450);
    const r = await page.evaluate(() => {
      const h = document.querySelector('header');
      const hv = h ? getComputedStyle(h).display !== 'none' && h.getBoundingClientRect().height > 0 : false;
      const as = [...document.querySelectorAll('header nav a')];
      const navMin = as.length ? Math.min(...as.map(a => parseFloat(getComputedStyle(a).minHeight))) : null;
      const box = document.querySelector('[data-mobile-cover]');
      const br = box ? box.getBoundingClientRect() : null;
      const crop = box ? ((box.querySelector('img')?.currentSrc || '').match(/crop-[a-z0-9.x-]+/) || ['orig'])[0] : null;
      const art = document.querySelector('article');
      const ps = art ? [...art.querySelectorAll('p')].filter(p => p.textContent.trim().length > 60 && p.offsetParent !== null) : [];
      const fp = ps.length ? Math.round(ps[0].getBoundingClientRect().top) : null;
      const bar = document.querySelector('div.fixed.bottom-0');
      const barLink = bar?.querySelector('a')?.getAttribute('href') || null;
      return { hv, navMin, ratio: br ? Math.round((br.width / br.height) * 1000) / 1000 : null,
               h: br ? Math.round(br.height) : null, crop, fp, barLink };
    });
    const slug = u.split('/artikel/')[1];
    const ok = r.hv && r.navMin >= 44 && (r.ratio === null || r.ratio >= 1.5) && (r.fp === null || r.fp < 844);
    ok ? pass++ : fail++;
    console.log(
      (ok ? '  ' : 'XX') + slug.slice(0, 40).padEnd(40) +
      String(r.hv).padEnd(5) + String(r.navMin).padEnd(8) +
      String(r.crop || '-').replace('crop-', '').replace('.webp', '').slice(0, 10).padEnd(11) +
      String(r.ratio ?? '-').padEnd(7) + String(r.fp ?? '-').padEnd(8) +
      (r.barLink ? 'next' : 'gallery/none'));
  } catch (e) { fail++; console.log('XX ' + u + ' ERROR ' + e.message.slice(0, 60)); }
}
console.log(`\nPASS ${pass}  FAIL ${fail}`);
await browser.close();
