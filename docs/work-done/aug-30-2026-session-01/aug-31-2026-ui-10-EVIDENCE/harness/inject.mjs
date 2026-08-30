// UI-10 pre-flight: apply the EXACT rules the diff adds to the LIVE production
// page and re-measure. This is not the DoD evidence — the DoD evidence is the
// deployed build measured at an asserted viewport. This exists to prove the
// three declarations produce the numbers before spending a deploy on them, and
// to fail fast if --fs-body does not resolve inside .inspire-prose.
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const BASE = 'https://hellokahwin.com';
const URL_PATH = '/artikel/idea-dan-nasihat/garden-wedding';
const OUT = process.argv[2] || '.ui10/out';

// Byte-for-byte the declarations added in the diff.
const PATCH = `
.hk-public .inspire-prose,
.hk-public .inspire-prose p,
.hk-public .inspire-prose span,
.hk-public .inspire-prose a,
.hk-public .inspire-prose li { font-size: var(--fs-body); }
.hk-public .inspire-prose { max-width: var(--measure-prose); }
`;

const browser = await chromium.launch({
  executablePath:
    'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe',
});
const rows = [];
for (const { w, h } of [
  { w: 390, h: 844 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
  { w: 1920, h: 1080 },
]) {
  const isMobileWidth = w < 768;
  const ctx = await browser.newContext({
    viewport: { width: w, height: h },
    deviceScaleFactor: 1,
    isMobile: isMobileWidth,
    hasTouch: isMobileWidth,
    userAgent: isMobileWidth
      ? 'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/145.0.0.0 Mobile Safari/537.36'
      : undefined,
  });
  const page = await ctx.newPage();
  await page.goto(BASE + URL_PATH, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);

  const r = await page.evaluate((patch) => {
    const round = (n) => Math.round(n * 100) / 100;
    // 1. the token, declared where tokens.css declares it
    document.documentElement.style.setProperty('--measure-prose', '33em');
    // 2. the class removal the renderer diff makes
    document.querySelectorAll('.inspire-prose.max-w-none').forEach((el) => el.classList.remove('max-w-none'));
    // 3. the two rule changes
    const s = document.createElement('style');
    s.textContent = patch;
    document.head.appendChild(s);

    const prose = document.querySelector('.inspire-prose');
    const pcs = getComputedStyle(prose);
    const paras = Array.from(document.querySelectorAll('.inspire-prose p'))
      .filter((p) => (p.textContent || '').trim().length >= 40)
      .filter((p) => !p.closest('figure, figcaption, nav, aside, blockquote'));
    const stats = paras.map((p) => {
      const rr = p.getBoundingClientRect();
      const cs = getComputedStyle(p);
      const fsz = parseFloat(cs.fontSize);
      return { width: round(rr.width), fontSize: round(fsz), cpl: round(rr.width / (fsz * 0.5)), left: round(rr.left) };
    });
    const cpls = stats.map((x) => x.cpl);
    // true glyph measure, on a REAL body paragraph this time
    const p0 = paras[0];
    const cs0 = getComputedStyle(p0);
    const cv = document.createElement('canvas').getContext('2d');
    cv.font = cs0.fontStyle + ' ' + cs0.fontWeight + ' ' + cs0.fontSize + ' ' + cs0.fontFamily;
    const sample = paras.map((p) => (p.textContent || '').trim()).join(' ').slice(0, 6000);
    const avg = cv.measureText(sample).width / sample.length;
    return {
      innerWidth: window.innerWidth,
      resolvedFsBody: pcs.fontSize,
      resolvedMaxWidth: pcs.maxWidth,
      proseWidth: round(prose.getBoundingClientRect().width),
      proseLeft: round(prose.getBoundingClientRect().left),
      n: stats.length,
      paraWidth: stats[0].width,
      paraFontSize: stats[0].fontSize,
      cplMin: Math.min(...cpls),
      cplMax: Math.max(...cpls),
      trueCpl: round(stats[0].width / avg),
      avgAdvanceEm: Math.round((avg / parseFloat(cs0.fontSize)) * 10000) / 10000,
      overflowPx:
        Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth,
    };
  }, PATCH);

  if (r.innerWidth !== w) throw new Error('ASSERT FAIL innerWidth ' + r.innerWidth + ' != ' + w);
  rows.push({ viewport: w, ...r });
  console.log(
    String(w).padStart(4) +
      '  maxWidth=' + r.resolvedMaxWidth.padEnd(8) +
      ' prose=' + String(r.proseWidth).padEnd(7) +
      ' fs=' + String(r.paraFontSize).padEnd(6) +
      ' cpl ' + r.cplMin + '-' + r.cplMax +
      '  true=' + r.trueCpl + ' (avg ' + r.avgAdvanceEm + 'em)' +
      '  overflow=' + r.overflowPx,
  );
  await page.screenshot({ path: path.join(OUT, 'screens', 'inject-article-' + w + 'px-fold.png') });
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'measure-inject.json'), JSON.stringify(rows, null, 2));
