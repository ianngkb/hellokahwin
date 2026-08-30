import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const LONG = ['Sebelum Nikah: Jodoh, Merisik & Tunang','Pelamin, Kad & Cenderahati Majlis','Hantaran & Mas Kahwin'];
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
for (const w of [390,768,1024,1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w<768?844:900 }, isMobile: w<768, hasTouch: w<768, deviceScaleFactor: 1 });
  const p = await c.newPage();
  await p.goto('https://hellokahwin.com/artikel', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const out = await p.evaluate((LONG) => {
    // the LAST grid on the page is the 2-up/4-up card grid
    const els = Array.from(document.querySelectorAll('p.hk-eyebrow.truncate'));
    const el = els[els.length-1];
    const box = el.clientWidth;
    const link = el.querySelector('a') || el;
    const orig = link.textContent;
    const r = LONG.map(t => { link.textContent = t; return { t, box, sw: el.scrollWidth, hidden: el.scrollWidth - box }; });
    link.textContent = orig;
    return { box, r };
  }, LONG);
  console.log(`@${String(w).padStart(4)}  card eyebrow box = ${out.box}px`);
  out.r.forEach(x => console.log(`        ${String(x.hidden>1?'CLIPS':'fits ')}  needs ${String(x.sw).padStart(4)}px, ${String(x.hidden).padStart(4)}px hidden — "${x.t}"`));
  await c.close();
}
await b.close();
