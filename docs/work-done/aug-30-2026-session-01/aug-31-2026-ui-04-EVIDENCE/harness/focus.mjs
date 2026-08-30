import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

for (const [url, w] of [
  ['https://hellokahwin.com/artikel#cari', 390],
  ['https://hellokahwin.com/artikel#cari', 1440],
  ['https://hellokahwin.com/', 390],
]) {
  const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto(url, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  await p.evaluate(() => document.body.focus());
  console.log(`\n=== TAB ORDER  ${url}  @${w} ===`);
  for (let n = 0; n < 14; n++) {
    await p.keyboard.press('Tab');
    const info = await p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return { tag: 'body' };
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        t: (el.textContent || el.placeholder || '').trim().slice(0, 34),
        href: el.getAttribute('href'),
        outline: cs.outlineStyle === 'none' ? 'NONE' : `${cs.outlineStyle} ${cs.outlineWidth} ${cs.outlineColor}`,
        shadow: cs.boxShadow === 'none' ? 'none' : cs.boxShadow.slice(0, 45),
        matchesFocusVisible: el.matches(':focus-visible'),
        inView: r.top >= 0 && r.bottom <= innerHeight && r.left >= 0 && r.right <= innerWidth,
        rect: `${Math.round(r.width)}x${Math.round(r.height)} @${Math.round(r.left)},${Math.round(r.top)}`,
      };
    });
    console.log(`${String(n + 1).padStart(2)} ${info.tag.padEnd(6)} ${String(info.t).padEnd(35)} outline=${info.outline} fv=${info.matchesFocusVisible} inView=${info.inView} ${info.rect || ''}`);
  }
  await c.close();
}
await b.close();
