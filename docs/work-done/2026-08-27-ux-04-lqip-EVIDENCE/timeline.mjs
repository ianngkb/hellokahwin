import { chromium } from 'playwright-core';
const url = process.argv[2];
const browser = await chromium.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
const page = await ctx.newPage();
await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
const out = await page.evaluate(() => {
  const fcp = performance.getEntriesByName('first-contentful-paint')[0];
  const rows = performance.getEntriesByType('resource').map(r => ({
    n: r.name.replace(location.origin,'').split('?')[0].slice(-58),
    init: r.initiatorType,
    start: Math.round(r.startTime), end: Math.round(r.responseEnd), dur: Math.round(r.duration),
    enc: r.encodedBodySize, rt: r.renderBlockingStatus || '',
  })).sort((a,b)=>a.end-b.end);
  const lcpE = performance.getEntriesByType('largest-contentful-paint');
  return { fcp: fcp ? Math.round(fcp.startTime) : null,
           lcp: lcpE.length ? Math.round(lcpE[lcpE.length-1].startTime) : null,
           fonts: [...document.fonts].map(f=>({family:f.family,status:f.status,display:f.display})),
           rows };
});
console.log('FCP=' + out.fcp + '  LCP=' + out.lcp);
console.log('FONTS: ' + JSON.stringify(out.fonts));
console.log('end'.padStart(6), 'start'.padStart(6), 'enc'.padStart(7), 'block'.padStart(9), ' resource');
for (const r of out.rows) console.log(String(r.end).padStart(6), String(r.start).padStart(6), String(r.enc).padStart(7), String(r.rt).padStart(9), ' ' + r.n);
await browser.close();
