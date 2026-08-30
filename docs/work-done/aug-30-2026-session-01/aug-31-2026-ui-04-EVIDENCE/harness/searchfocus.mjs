import { createRequire } from 'node:module';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

const desc = () =>
  ((el) => el)();

for (const w of [390, 1440]) {
  const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
  const p = await c.newPage();

  // Arrive the way a reader does: land on the homepage, click "Cari" in the header.
  await p.goto('https://hellokahwin.com/', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.getByRole('link', { name: /Cari/i }).first().click();
  await p.waitForLoadState('networkidle');
  await p.waitForTimeout(900);

  const after = await p.evaluate(() => {
    const i = document.querySelector('input[type="text"], input[type="search"]');
    const anchor = document.getElementById('cari');
    const ae = document.activeElement;
    // DOM order of the input vs the #cari anchor
    let rel = 'n/a';
    if (i && anchor) rel = anchor.contains(i) ? 'input INSIDE #cari' : anchor.compareDocumentPosition(i) & Node.DOCUMENT_POSITION_FOLLOWING ? 'input AFTER #cari' : 'input BEFORE #cari';
    return {
      url: location.href,
      activeElement: ae ? ae.tagName.toLowerCase() + ' :: ' + (ae.textContent || ae.placeholder || '').trim().slice(0, 30) : null,
      activeIsSearchInput: ae === i,
      anchorExists: !!anchor,
      anchorTag: anchor ? anchor.tagName.toLowerCase() + '.' + String(anchor.className).slice(0, 40) : null,
      relation: rel,
      inputTop: i ? Math.round(i.getBoundingClientRect().top) : null,
      scrollY: Math.round(scrollY),
    };
  });
  console.log(`\n=== @${w} after clicking header "Cari" ===`);
  console.log(JSON.stringify(after, null, 1));

  const seq = [];
  for (let n = 0; n < 4; n++) {
    await p.keyboard.press('Tab');
    seq.push(
      await p.evaluate(() => {
        const el = document.activeElement;
        const i = document.querySelector('input[type="text"], input[type="search"]');
        return { tag: el.tagName.toLowerCase(), isInput: el === i, t: (el.textContent || el.placeholder || '').trim().slice(0, 32) };
      }),
    );
  }
  console.log('Tab x4 after the jump: ' + JSON.stringify(seq));

  // Shift+Tab back to see whether the input sits behind the starting point
  const back = [];
  for (let n = 0; n < 6; n++) {
    await p.keyboard.press('Shift+Tab');
    back.push(
      await p.evaluate(() => {
        const el = document.activeElement;
        const i = document.querySelector('input[type="text"], input[type="search"]');
        return { tag: el.tagName.toLowerCase(), isInput: el === i, t: (el.textContent || el.placeholder || '').trim().slice(0, 32) };
      }),
    );
  }
  console.log('Shift+Tab x6: ' + JSON.stringify(back));

  // focus ring on the input, reached by keyboard
  const ring = await p.evaluate(() => {
    const i = document.querySelector('input[type="text"], input[type="search"]');
    i.focus();
    const cs = getComputedStyle(i);
    return { outlineStyle: cs.outlineStyle, outlineWidth: cs.outlineWidth, outlineColor: cs.outlineColor, boxShadow: cs.boxShadow.slice(0, 70), border: cs.border, focusVisible: i.matches(':focus-visible') };
  });
  console.log('input focus ring: ' + JSON.stringify(ring));
  await c.close();
}
await b.close();
