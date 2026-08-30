// Verify, do not assert: what face does the article h1 actually render in, and
// is DES-13's pinned `opsz 11` reaching anything?
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({
  executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const p = await ctx.newPage();
for (const [label, url] of [
  ['article', 'https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding'],
  ['homepage', 'https://hellokahwin.com/'],
  ['category', 'https://hellokahwin.com/artikel/hantaran-mas-kahwin'],
]) {
  await p.goto(url, { waitUntil: 'networkidle', timeout: 90000 });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);
  const r = await p.evaluate(() => {
    const out = {};
    const probe = (name, sel) => {
      const el = document.querySelector(sel);
      if (!el) return (out[name] = null);
      const cs = getComputedStyle(el);
      // Does the first family in the stack actually paint? Compare the rendered
      // advance of the element's own text against the same string forced to the
      // stack's head and to a face we know is absent.
      const cv = document.createElement('canvas').getContext('2d');
      const s = (el.textContent || '').trim().slice(0, 40) || 'Perkahwinan';
      const w = (fam) => {
        cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + fam;
        return Math.round(cv.measureText(s).width * 100) / 100;
      };
      out[name] = {
        computedFamily: cs.fontFamily,
        varFontSerif: getComputedStyle(el).getPropertyValue('--font-serif').trim(),
        fontVariationSettings: cs.fontVariationSettings,
        fontSize: cs.fontSize,
        widthAsComputed: w(cs.fontFamily),
        widthAsBodoni: w('"Bodoni Moda"'),
        widthAsGeorgia: w('Georgia'),
        widthAsAbsent: w('"NoSuchFaceXYZ"'),
      };
    };
    probe('h1', 'h1');
    probe('wordmark', '.s-wm');
    return out;
  });
  console.log(label, JSON.stringify(r, null, 1));
}
await b.close();
