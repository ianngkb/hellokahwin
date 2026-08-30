import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto('https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const r = await p.evaluate(() => {
    const li = document.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]').closest('li');
    const svg = li.querySelector('svg');
    const span = li.querySelector('[aria-current="page"]');
    // first line box of the wrapping label
    const range = document.createRange();
    range.selectNodeContents(span);
    const lines = [...range.getClientRects()];
    const b1 = lines[0];
    const s = svg.getBoundingClientRect();
    return {
      innerWidth: window.innerWidth,
      lines: lines.length,
      firstLine: { top: +b1.top.toFixed(1), bottom: +b1.bottom.toFixed(1), mid: +((b1.top + b1.bottom) / 2).toFixed(1) },
      chevron: { top: +s.top.toFixed(1), bottom: +s.bottom.toFixed(1), mid: +((s.top + s.bottom) / 2).toFixed(1) },
      liHeight: +li.getBoundingClientRect().height.toFixed(1),
    };
  });
  const delta = +(r.chevron.mid - r.firstLine.mid).toFixed(1);
  console.log(`@${w}: lines=${r.lines} liHeight=${r.liHeight}  firstLine.mid=${r.firstLine.mid}  chevron.mid=${r.chevron.mid}  delta=${delta}px`);
  await c.close();
}
await b.close();
