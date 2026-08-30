// UI-10: what face is the article body ACTUALLY set in, and what is 1ch worth?
// The token stack is 'Bodoni Moda', Didot, 'Bodoni MT', Georgia, serif.
// measure.mjs reported computed family "Georgia" at every width, which means
// the first three never resolved. Verify the CHECK before believing it:
// enumerate what document.fonts holds rather than testing for what I assume.
import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'https://hellokahwin.com';

const browser = await chromium.launch({
  executablePath:
    'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const page = await ctx.newPage();
await page.goto(BASE + '/artikel/idea-dan-nasihat/garden-wedding', { waitUntil: 'networkidle', timeout: 90000 });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(800);

const out = await page.evaluate(() => {
  const r = (n) => Math.round(n * 10000) / 10000;

  // 1. every face the document actually loaded
  const loaded = [];
  document.fonts.forEach((f) => loaded.push([f.family, f.weight, f.style, f.status].join(' | ')));

  // 2. what the browser says it can render, per family in the token stack
  const stack = ['Bodoni Moda', 'Didot', 'Bodoni MT', 'Georgia', 'Geist'];
  const check = {};
  for (const fam of stack) check[fam] = document.fonts.check('17px "' + fam + '"');

  // 3. the width test: render the same string in each family and compare.
  //    Identical width to the generic serif == the family did not resolve.
  const cv = document.createElement('canvas').getContext('2d');
  const probe = 'Perkahwinan di taman yang indah — 20 venue pilihan';
  const widths = {};
  for (const fam of [...stack, 'serif', 'monospace', 'NoSuchFaceXYZ']) {
    cv.font = '17px "' + fam + '", monospace';
    widths[fam] = r(cv.measureText(probe).width);
  }

  // 4. the ch unit for the paragraph's OWN computed font, measured not assumed
  const p = Array.from(document.querySelectorAll('.inspire-prose p')).find(
    (el) => (el.textContent || '').trim().length > 120,
  );
  const cs = getComputedStyle(p);
  const probeEl = document.createElement('div');
  probeEl.style.cssText =
    'position:absolute;visibility:hidden;width:100ch;font:' +
    cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + '/' + cs.lineHeight + ' ' + cs.fontFamily;
  p.parentElement.appendChild(probeEl);
  const chPx = probeEl.getBoundingClientRect().width / 100;
  probeEl.remove();

  // 5. this article's own average advance, in the paragraph's own font
  cv.font = cs.fontStyle + ' ' + cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
  const sample = Array.from(document.querySelectorAll('.inspire-prose p'))
    .map((el) => (el.textContent || '').trim())
    .join(' ')
    .slice(0, 6000);
  const avgPx = cv.measureText(sample).width / sample.length;

  // 6. x-height, measured
  const xEl = document.createElement('span');
  xEl.textContent = 'x';
  xEl.style.cssText = 'position:absolute;visibility:hidden;line-height:0;font:' + cs.fontSize + ' ' + cs.fontFamily;
  document.body.appendChild(xEl);
  const xh = xEl.getBoundingClientRect().height;
  xEl.remove();

  const fsz = parseFloat(cs.fontSize);
  return {
    loadedFaces: loaded,
    fontsCheck: check,
    canvasWidths: widths,
    paragraph: {
      computedFamily: cs.fontFamily,
      fontSize: cs.fontSize,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      width: r(p.getBoundingClientRect().width),
      sampleChars: sample.length,
    },
    chPx: r(chPx),
    chPerEm: r(chPx / fsz),
    avgAdvancePx: r(avgPx),
    avgAdvanceEm: r(avgPx / fsz),
    xHeightEm: r(xh / fsz),
  };
});

console.log(JSON.stringify(out, null, 2));
await browser.close();
