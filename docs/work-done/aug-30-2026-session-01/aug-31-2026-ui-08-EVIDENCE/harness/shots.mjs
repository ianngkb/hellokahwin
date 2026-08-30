// UI-08 evidence shots. AFTER is live production. BEFORE is a LABELLED
// RECONSTRUCTION: the same live page with the exact CSS the fix removed
// (`max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap`)
// re-applied to the crumb, because production no longer carries the defect.
// Both are stamped with the numbers measured in that same page.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const OUT = process.argv[2];
const SEL = 'nav[aria-label="Breadcrumb"]';
const PAGES = [
  ['article', 'https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding'],
  ['dewan-kahwin', 'https://hellokahwin.com/dewan-kahwin'],
];
for (const [key, url] of PAGES) {
  for (const w of [390, 768, 1024, 1440]) {
    for (const state of ['before-reconstructed', 'after-live']) {
      const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 2 });
      const p = await c.newPage();
      await p.goto(url, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      if (state === 'before-reconstructed') {
        await p.addStyleTag({ content: `${SEL} [aria-current="page"]{max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}` });
      }
      await p.waitForTimeout(400);
      const m = await p.evaluate((sel) => {
        const el = document.querySelector(sel + ' [aria-current="page"]');
        return { cw: el.clientWidth, sw: el.scrollWidth, iw: window.innerWidth };
      }, SEL);
      const el = await p.$(SEL);
      await el.screenshot({ path: `${OUT}/${key}-${w}px-${state}.png` });
      console.log(`${key}-${w}px-${state}: innerWidth=${m.iw} clientWidth=${m.cw} scrollWidth=${m.sw} hidden=${Math.max(0, m.sw - m.cw)}px`);
      await c.close();
    }
  }
}
await b.close();
