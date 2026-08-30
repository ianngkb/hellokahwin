// UI-10 composition check at 1440 and 1920, before and after the measure cap.
// The DoD is a number; this asks the question the number cannot: once the body
// column is 594px, where does its left edge sit relative to the headline, the
// deck, the cover and the in-prose figures? Captures a tall crop that contains
// the h1 AND the first body paragraph in one frame, so the edges are comparable
// in a single image rather than across two.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');

const BASE = 'https://hellokahwin.com';
const URL_PATH = '/artikel/idea-dan-nasihat/garden-wedding';
const OUT = process.argv[2] || '.ui10/out';
const APPLY = process.argv[3] === 'after';
fs.mkdirSync(path.join(OUT, 'screens'), { recursive: true });

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

for (const w of [1440, 1920]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 2400 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  await page.goto(BASE + URL_PATH, { waitUntil: 'networkidle', timeout: 90000 });
  await page.evaluate(() => document.fonts.ready);
  if (APPLY) {
    await page.evaluate((patch) => {
      document.documentElement.style.setProperty('--measure-prose', '33em');
      document.querySelectorAll('.inspire-prose.max-w-none').forEach((el) => el.classList.remove('max-w-none'));
      const s = document.createElement('style');
      s.textContent = patch;
      document.head.appendChild(s);
    }, PATCH);
  }
  await page.waitForTimeout(500);

  const edges = await page.evaluate(() => {
    const r = (n) => Math.round(n * 100) / 100;
    const L = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: r(b.left), right: r(b.right), width: r(b.width) };
    };
    const fig = document.querySelector('.inspire-prose figure, .inspire-prose img');
    const fb = fig ? fig.getBoundingClientRect() : null;
    const p = Array.from(document.querySelectorAll('.inspire-prose p')).find(
      (el) => (el.textContent || '').trim().length >= 40 && !el.closest('figure,figcaption,nav'),
    );
    const pb = p.getBoundingClientRect();
    return {
      shell: L('.hk.container'),
      header: L('.inspire-editorial > header'),
      h1: L('.s-h1'),
      coverFigure: L('.inspire-editorial > figure'),
      articleCell: L('.inspire-editorial article'),
      prose: L('.inspire-prose'),
      bodyPara: { left: r(pb.left), right: r(pb.right), width: r(pb.width) },
      proseFigure: fb ? { left: r(fb.left), right: r(fb.right), width: r(fb.width) } : null,
      sidebar: L('.inspire-editorial .grid > div:last-child'),
    };
  });

  const tag = APPLY ? 'after' : 'before';
  await page.screenshot({ path: path.join(OUT, 'screens', 'compose-' + tag + '-' + w + 'px.png') });
  console.log('--- ' + tag + ' @ ' + w + ' ---');
  for (const [k, v] of Object.entries(edges)) {
    console.log('  ' + k.padEnd(13) + (v ? 'left ' + String(v.left).padStart(7) + '  width ' + String(v.width).padStart(7) + '  right ' + String(v.right).padStart(7) : 'null'));
  }
  await ctx.close();
}
await browser.close();
