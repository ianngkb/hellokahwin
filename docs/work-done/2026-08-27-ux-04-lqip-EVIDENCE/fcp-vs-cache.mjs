/**
 * Is the article FCP a client payload cost or a server render cost?
 * Each run is a FRESH cold browser context, so the JS/CSS payload is
 * identical every time. If FCP tracks x-vercel-cache rather than bytes,
 * the payload is not the blocking dependency.
 */
import { chromium } from 'playwright-core';
const urls = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
console.log('run  cache        age   ttfb  docEnd    fcp   jsEnc  url');
for (const url of urls) {
  for (let i = 0; i < 5; i++) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
    const page = await ctx.newPage();
    let hdrs = {};
    page.on('response', (r) => { if (r.url() === url) hdrs = r.headers(); });
    await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
    const m = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const fcp = performance.getEntriesByName('first-contentful-paint')[0];
      const js = performance.getEntriesByType('resource').filter(r => /\.js(\?|$)/.test(r.name));
      return { ttfb: Math.round(nav.responseStart - nav.requestStart), docEnd: Math.round(nav.responseEnd),
               fcp: fcp ? Math.round(fcp.startTime) : null, jsEnc: js.reduce((a, r) => a + r.encodedBodySize, 0) };
    });
    console.log(String(i).padStart(3),
      (hdrs['x-vercel-cache'] || '?').padEnd(12),
      String(hdrs['age'] ?? '-').padStart(5),
      String(m.ttfb).padStart(6), String(m.docEnd).padStart(7), String(m.fcp).padStart(6),
      String(m.jsEnc).padStart(7), ' ' + url.replace('https://hellokahwin.com', ''));
    await ctx.close();
  }
}
await browser.close();
