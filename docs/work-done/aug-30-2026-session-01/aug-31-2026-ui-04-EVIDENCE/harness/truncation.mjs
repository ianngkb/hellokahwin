import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

const PAGES = [
  ['homepage', 'https://hellokahwin.com/'],
  ['article', 'https://hellokahwin.com/artikel/idea-dan-nasihat/garden-wedding'],
  ['category', 'https://hellokahwin.com/artikel/hantaran-mas-kahwin'],
  ['artikel-index', 'https://hellokahwin.com/artikel'],
  ['dewan-kahwin', 'https://hellokahwin.com/dewan-kahwin'],
];

const FN = () => {
  const round = (n) => Math.round(n * 100) / 100;
  const out = [];
  // WARNING, 31 Aug 2026 (UI-04): this check has two blind spots, both of which
  // hid a REAL truncation on /artikel at 390px.
  //   1. `scrollWidth`/`clientWidth` are 0 on `display: inline` elements. The
  //      clipped label is an inline <a>; the box that clips is its <p> parent.
  //   2. The leaf filter below drops any element whose child holds >=90% of the
  //      text — which is exactly the `<p class="hk-eyebrow truncate"><a>…</a></p>`
  //      shape that does the clipping.
  // eyebrow3.mjs is the version that finds it: select on computed
  // `text-overflow: ellipsis` + non-visible overflow, and do NOT filter to leaves.
  const els = Array.from(document.querySelectorAll('body *')).filter((el) => {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const t = (el.textContent || '').trim();
    if (t.length < 6) return false;
    const kids = Array.from(el.children);
    if (kids.some((k) => (k.textContent || '').trim().length >= t.length * 0.9)) return false;
    return true;
  });
  for (const el of els) {
    const cs = getComputedStyle(el);
    const clippedX = el.scrollWidth > el.clientWidth + 1 && (cs.textOverflow === 'ellipsis' || cs.overflow === 'hidden' || cs.overflowX === 'hidden');
    const clampLines = cs.webkitLineClamp && cs.webkitLineClamp !== 'none' ? parseInt(cs.webkitLineClamp, 10) : null;
    const clippedY = el.scrollHeight > el.clientHeight + 1 && (cs.overflow === 'hidden' || cs.overflowY === 'hidden');
    if (clippedX || (clippedY && clampLines)) {
      out.push({
        kind: clippedX ? 'ellipsis-x' : 'line-clamp-' + clampLines,
        sel: el.tagName.toLowerCase() + (typeof el.className === 'string' && el.className ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : ''),
        clientWidth: el.clientWidth,
        scrollWidth: el.scrollWidth,
        overflowPx: el.scrollWidth - el.clientWidth,
        clientHeight: el.clientHeight,
        scrollHeight: el.scrollHeight,
        fontSize: cs.fontSize,
        full: (el.textContent || '').trim().slice(0, 70),
      });
    }
  }
  const seen = new Set();
  return out.filter((o) => {
    const k = o.kind + o.sel + o.full;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
};

const all = {};
for (const [key, url] of PAGES) {
  all[key] = {};
  for (const w of [390, 768, 1024, 1440]) {
    const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
    const p = await c.newPage();
    await p.goto(url, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const t = await p.evaluate(FN);
    all[key][w] = t;
    console.log(`${key.padEnd(14)} @${String(w).padStart(4)}  truncated: ${t.length}`);
    t.slice(0, 5).forEach((x) => console.log(`    ${x.kind}  ${x.clientWidth}px box / ${x.scrollWidth}px text (+${x.overflowPx})  ${x.fontSize}  :: ${x.full.slice(0, 55)}`));
    await c.close();
  }
}
fs.writeFileSync(process.argv[2], JSON.stringify(all, null, 2));
await b.close();
