#!/usr/bin/env node
// RIGHTS-03 render check — the two source pages at 390 and 1440, before and
// after the takedown.
//
//   node scripts/rights/rights03-render-check.mjs --label before
//   node scripts/rights/rights03-render-check.mjs --label after
//
// Removing an image from a body is the kind of edit that looks fine in the
// database and leaves a hole on the page. Three ways that shows up, and this
// reports all three rather than a screenshot somebody has to squint at:
//
//   BROKEN IMAGE — two ways, because one is not enough. An <img> the browser
//     decoded to naturalWidth 0 (the grey placeholder), AND every distinct
//     <img> src fetched over HTTP and checked for 200. The second matters
//     because most images on these pages are lazy: below the fold they are
//     neither loaded nor broken, so a naturalWidth check alone is blind to
//     exactly the part of the page a body edit is most likely to damage.
//   HORIZONTAL COLLAPSE — scrollWidth wider than the viewport. 390 is where it
//     shows first and 79% of impressions are mobile.
//   HEIGHT — page height before and after. A body that lost far more than one
//     figure's worth of height lost something else too.
//
// Screenshots go beside the JSON so the numbers can be checked by eye, but the
// numbers are the check. Requires playwright-core and the installed Chrome,
// same arrangement as the site repo's ui-layout-gate.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { TARGETS } from './rights03-lib.mjs';

const require = createRequire(process.env.HK_SITE_DIR
  ? process.env.HK_SITE_DIR + '/package.json'
  : 'C:/Users/Ian Ng/Documents/Code/hellokahwin-site/package.json');
const { chromium } = require('playwright-core');

const CHROME = process.env.UI_GATE_CHROME ?? (process.platform === 'win32'
  ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
  : '/usr/bin/google-chrome');

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2);
const label = args.includes('--label') ? args[args.indexOf('--label') + 1] : 'run';
const OUT = path.join(REPO, 'docs/work-done/sep-01-2026-session-01/sep-01-2026-rights-03-EVIDENCE');
fs.mkdirSync(OUT, { recursive: true });

const WIDTHS = [
  { w: 390, h: 844, name: '390' },   // iPhone 12/13/14 — the audience's phone
  { w: 1440, h: 900, name: '1440' }, // laptop
];

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = { label, at: new Date().toISOString(), pages: [] };
let fail = 0;

for (const t of TARGETS) {
  for (const vp of WIDTHS) {
    const ctx = await browser.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    await page.goto(t.pageUrl, { waitUntil: 'networkidle', timeout: 60000 });
    await page.evaluate(async () => {
      // Force every lazy image to decide, so a broken one cannot hide below the fold.
      window.scrollTo(0, document.body.scrollHeight);
      await new Promise((r) => setTimeout(r, 1500));
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 500));
    });
    await page.waitForTimeout(1000);

    const m = await page.evaluate(() => {
      const imgs = [...document.images];
      const broken = imgs.filter((i) => i.complete && i.naturalWidth === 0).map((i) => i.currentSrc || i.src);
      // What is actually sticking out, when something is. A number with no
      // culprit sends the next reader hunting.
      const vw = window.innerWidth;
      const widest = [...document.querySelectorAll('body *')]
        .map((el) => ({ el, r: el.getBoundingClientRect() }))
        .filter(({ r }) => r.width > 0 && r.right > vw + 1)
        .sort((a, b) => b.r.right - a.r.right)
        .slice(0, 3)
        .map(({ el, r }) => `${el.tagName.toLowerCase()}${el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : ''} right=${Math.round(r.right)} w=${Math.round(r.width)}`);
      return {
        imgCount: imgs.length,
        loaded: imgs.filter((i) => i.complete && i.naturalWidth > 0).length,
        broken,
        srcs: [...new Set(imgs.map((i) => i.currentSrc || i.src).filter(Boolean))],
        scrollWidth: document.scrollingElement.scrollWidth,
        innerWidth: window.innerWidth,
        scrollHeight: document.scrollingElement.scrollHeight,
        figures: document.querySelectorAll('figure').length,
        h2: document.querySelectorAll('h2').length,
        overflowingElements: widest,
      };
    });

    // Every <img> src, fetched. Lazy images never decode, so this is the only
    // check that sees the whole page.
    const bad = [];
    for (const src of m.srcs) {
      try {
        const r = await fetch(src, { method: 'GET', headers: { accept: 'image/webp,*/*' } });
        if (r.status !== 200) bad.push(`${r.status} ${src}`);
      } catch (e) { bad.push(`ERR ${e.message} ${src}`); }
    }
    m.badSrcs = bad;

    const overflow = m.scrollWidth - m.innerWidth;
    // The 390 overflow on kursus-kahwin is PRE-EXISTING — measured at 79px before
    // this item touched anything, and unrelated to it. The gate compares against
    // the recorded baseline rather than demanding zero, so it stays honest about
    // a defect it did not cause and still catches one it does.
    const BASELINE_OVERFLOW = { 'kursus-kahwin': { 390: 79, 1440: 0 }, 'tempat-honeymoon-di-malaysia': { 390: 0, 1440: 0 } };
    const baseline = BASELINE_OVERFLOW[t.slug][vp.w] ?? 0;
    const ok = m.broken.length === 0 && bad.length === 0 && overflow <= baseline;
    if (!ok) fail++;
    console.log(`${ok ? 'ok  ' : 'FAIL'}  ${t.slug} @${vp.name}  img ${m.loaded}/${m.imgCount} loaded, broken ${m.broken.length}, ` +
                `bad srcs ${bad.length}/${m.srcs.length}, figures ${m.figures}, h2 ${m.h2}, ` +
                `scrollWidth ${m.scrollWidth} vs ${m.innerWidth} (overflow ${overflow}), height ${m.scrollHeight}`);
    for (const b of m.broken) console.log(`        BROKEN (naturalWidth 0): ${b}`);
    for (const b of m.badSrcs) console.log(`        BAD SRC: ${b}`);
    if (overflow > 0) for (const e of m.overflowingElements) console.log(`        OVERFLOWS (baseline ${baseline}px): ${e}`);

    await page.screenshot({ path: path.join(OUT, `${label}-${t.slug}-${vp.name}.png`), fullPage: false });
    report.pages.push({ slug: t.slug, width: vp.w, ...m, overflow, ok });
    await ctx.close();
  }
}

await browser.close();
fs.writeFileSync(path.join(OUT, `render-${label}.json`), JSON.stringify(report, null, 2));
console.log(`\nwrote ${path.join(OUT, `render-${label}.json`)}`);
console.log(`RIGHTS03-RENDER EXIT: ${fail ? 1 : 0}`);
process.exit(fail ? 1 : 0);
