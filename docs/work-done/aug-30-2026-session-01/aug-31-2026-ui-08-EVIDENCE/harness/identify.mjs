// UI-08 — identify the truncating box precisely, in a rendered viewport.
// Adapted from UI-04 harness/truncation.mjs + eyebrow3.mjs (same launch recipe,
// same viewport/isMobile matrix, same fonts.ready wait).
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

const BASE = process.argv[2] || 'https://hellokahwin.com';
const OUT = process.argv[3];
const PAGES = [
  ['article', '/artikel/idea-dan-nasihat/garden-wedding'],
  ['dewan-kahwin', '/dewan-kahwin'],
];

const FN = () => {
  // Do NOT filter to leaves (UI-04 recorded that filter as a blind spot).
  // Enumerate every element that clips horizontally, then describe it fully.
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') continue;
    const clipsX =
      el.scrollWidth > el.clientWidth + 1 &&
      (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.overflowX === 'hidden');
    if (!clipsX) continue;
    const chain = [];
    for (let p = el; p && p !== document.body; p = p.parentElement) {
      chain.push(
        p.tagName.toLowerCase() +
          (p.id ? '#' + p.id : '') +
          (typeof p.className === 'string' && p.className ? '.' + p.className.trim().split(/\s+/).join('.') : '') +
          (p.getAttribute('aria-label') ? `[aria-label="${p.getAttribute('aria-label')}"]` : '') +
          (p.getAttribute('aria-current') ? `[aria-current="${p.getAttribute('aria-current')}"]` : '') +
          (p.tagName === 'A' ? `[href="${p.getAttribute('href')}"]` : '')
      );
    }
    out.push({
      tag: el.tagName.toLowerCase(),
      cls: typeof el.className === 'string' ? el.className : String(el.className),
      ariaCurrent: el.getAttribute('aria-current'),
      isLink: el.closest('a') ? el.closest('a').getAttribute('href') : null,
      clientWidth: el.clientWidth,
      scrollWidth: el.scrollWidth,
      overflowPx: el.scrollWidth - el.clientWidth,
      maxWidth: cs.maxWidth,
      width: cs.width,
      fontSize: cs.fontSize,
      textOverflow: cs.textOverflow,
      text: (el.textContent || '').trim(),
      ancestors: chain,
      outerHTML: el.outerHTML.slice(0, 400),
    });
  }
  return out;
};

const all = {};
for (const [key, path] of PAGES) {
  all[key] = {};
  for (const w of [390, 768, 1024, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
    const p = await c.newPage();
    const resp = await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    // ASSERT the width actually took, in the page, not in the driver.
    const asserted = await p.evaluate((w) => ({
      innerWidth: window.innerWidth,
      mmExact: window.matchMedia(`(width: ${w}px)`).matches,
      dpr: window.devicePixelRatio,
      // structural control: prove this is the real page, not a shell
      h1: (document.querySelector('h1') || {}).textContent || null,
      imgs: document.querySelectorAll('img').length,
      links: document.querySelectorAll('a').length,
      crumbs: document.querySelectorAll('nav[aria-label="Breadcrumb"] li').length,
      kredit: (document.body.innerText.match(/Kredit:/g) || []).length,
    }), w);
    if (asserted.innerWidth !== w || !asserted.mmExact) {
      throw new Error(`WIDTH ASSERT FAILED ${key}@${w}: innerWidth=${asserted.innerWidth} mmExact=${asserted.mmExact}`);
    }
    const clipped = await p.evaluate(FN);
    all[key][w] = { status: resp.status(), asserted, clipped };
    console.log(`\n### ${key} @${w}  (innerWidth=${asserted.innerWidth}, mm(width:${w}px)=${asserted.mmExact}, status=${resp.status()})`);
    console.log(`    h1="${String(asserted.h1).slice(0, 60)}"  imgs=${asserted.imgs} links=${asserted.links} crumbLis=${asserted.crumbs} Kredit:x${asserted.kredit}`);
    for (const x of clipped) {
      console.log(`    CLIP ${x.tag}.${String(x.cls).split(/\s+/).slice(0,3).join('.')}  ${x.clientWidth}px box / ${x.scrollWidth}px text (+${x.overflowPx})  max-width:${x.maxWidth}  aria-current=${x.ariaCurrent}  href=${x.isLink}`);
      console.log(`         text: ${JSON.stringify(x.text.slice(0, 90))}`);
      console.log(`         chain: ${x.ancestors.slice(0, 4).join('  <  ')}`);
    }
    await c.close();
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(all, null, 2));
await b.close();
