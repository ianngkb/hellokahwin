/** Was my "mid-decode" explanation for naturalWidth=176 right, or is it the
 * srcset density division UI-03 describes? Settle it empirically. */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const b = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await b.newContext({
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true,
});
const p = await ctx.newPage();
await p.goto('https://hellokahwin.com/artikel/idea-dan-nasihat', { waitUntil: 'networkidle' });
// Fully settle: scroll everything into view, then wait for every image to report complete.
await p.evaluate(async () => {
  for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 80)); }
  window.scrollTo(0, 0);
  await Promise.all([...document.images].map(i => i.complete ? null : new Promise(r => { i.onload = i.onerror = r; })));
});
await p.waitForTimeout(3000); // well past any decode

const out = await p.evaluate(async () => {
  const rows = [];
  for (const img of [...document.images].slice(0, 4)) {
    const box = img.getBoundingClientRect();
    // Detached Image on currentSrc - the method UI-03 prescribes.
    const real = await new Promise((res) => {
      const d = new Image();
      d.onload = () => res({ w: d.naturalWidth, h: d.naturalHeight });
      d.onerror = () => res({ w: 0, h: 0 });
      d.src = img.currentSrc;
    });
    rows.push({
      complete: img.complete,
      sizes: img.sizes,
      box: `${Math.round(box.width)}x${Math.round(box.height)}`,
      elementNatural: `${img.naturalWidth}x${img.naturalHeight}`,
      detachedNatural: `${real.w}x${real.h}`,
      impliedDensity: real.w && img.naturalWidth ? (real.w / img.naturalWidth).toFixed(3) : 'n/a',
      file: img.currentSrc.split('/').pop().split('?')[0],
    });
  }
  return rows;
});
console.log(JSON.stringify(out, null, 2));
await b.close();
