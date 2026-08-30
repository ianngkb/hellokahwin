import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const SHOTS = process.argv[2];
fs.mkdirSync(SHOTS, { recursive: true });
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });
const log = [];

const snapshot = (label) =>
  ((label) => label)(label);

for (const w of [390, 768, 1024, 1440]) {
  const c = await b.newContext({
    viewport: { width: w, height: w < 768 ? 844 : 900 },
    isMobile: w < 768,
    hasTouch: w < 768,
    deviceScaleFactor: 1,
    userAgent: w < 768 ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36' : undefined,
  });
  const p = await c.newPage();
  await p.goto('https://hellokahwin.com/artikel#cari', { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(500);

  const readState = () =>
    p.evaluate(() => {
      const i = document.querySelector('input[type="text"], input[type="search"]');
      const box = i ? i.closest('section, div[id="cari"], #cari') || i.parentElement : null;
      const cards = Array.from(document.querySelectorAll('a')).filter((a) => /^\/artikel\/[^/]+\/[^/]+/.test(a.getAttribute('href') || ''));
      return {
        value: i ? i.value : null,
        visibleResultLinks: cards.length,
        bodyTextSample: (box ? box.innerText : document.body.innerText).replace(/\n+/g, ' | ').slice(0, 240),
        mq1023: matchMedia('(max-width:1023px)').matches,
        innerWidth: window.innerWidth,
      };
    });

  // default
  const def = await readState();
  await p.screenshot({ path: path.join(SHOTS, `search-${w}-a-default.png`) });
  log.push({ w, state: 'default', ...def });

  // query with results
  const i = p.locator('input[type="text"], input[type="search"]').first();
  await i.click();
  await i.fill('hantaran');
  await p.waitForTimeout(1200);
  const hit = await readState();
  await p.screenshot({ path: path.join(SHOTS, `search-${w}-b-results.png`) });
  log.push({ w, state: 'results:hantaran', ...hit });

  // query with no results
  await i.fill('zzzqqqxyz');
  await p.waitForTimeout(1200);
  const miss = await readState();
  await p.screenshot({ path: path.join(SHOTS, `search-${w}-c-empty.png`) });
  log.push({ w, state: 'empty:zzzqqqxyz', ...miss });

  // focus ring / keyboard reachability from the header Cari link
  const kb = await p.evaluate(() => {
    const i = document.querySelector('input[type="text"], input[type="search"]');
    i.focus();
    const cs = getComputedStyle(i);
    return { outlineWidth: cs.outlineWidth, outlineStyle: cs.outlineStyle, boxShadow: cs.boxShadow.slice(0, 60), activeIsInput: document.activeElement === i };
  });
  log.push({ w, state: 'focus', ...kb });

  await c.close();
}
await b.close();
console.log(JSON.stringify(log, null, 1));
