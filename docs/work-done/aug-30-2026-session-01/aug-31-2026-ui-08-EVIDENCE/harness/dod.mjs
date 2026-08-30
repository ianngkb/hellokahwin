// UI-08 Definition of Done, asserted verbatim:
//   "The attribution link's scrollWidth <= its clientWidth at 390, 768, 1024
//    and 1440 on /artikel/idea-dan-nasihat/garden-wedding and /dewan-kahwin,
//    measured in a rendered viewport."
// The element the DoD's numbers pin (200px box / 332px & 503px text) is
// nav[aria-label="Breadcrumb"] > ol > li > span[aria-current="page"].
// Launch recipe copied from UI-04 harness/truncation.mjs.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire('C:/Users/Ian Ng/Documents/Code/thepicklebase/');
const { chromium } = require('playwright');
const b = await chromium.launch({ executablePath: 'C:/Users/Ian Ng/AppData/Local/ms-playwright/chromium-1208/chrome-win64/chrome.exe' });

const BASE = process.argv[2];
const OUT = process.argv[3];
const PATHS = ['/artikel/idea-dan-nasihat/garden-wedding', '/dewan-kahwin'];
const WIDTHS = [390, 768, 1024, 1440];

let pass = 0, fail = 0;
const rows = [];
for (const path of PATHS) {
  for (const w of WIDTHS) {
    const c = await b.newContext({ viewport: { width: w, height: w < 768 ? 844 : 900 }, isMobile: w < 768, hasTouch: w < 768, deviceScaleFactor: 1 });
    const p = await c.newPage();
    const resp = await p.goto(BASE + path, { waitUntil: 'networkidle' });
    await p.evaluate(() => document.fonts.ready);
    await p.waitForTimeout(500);
    const r = await p.evaluate((w) => {
      const el = document.querySelector('nav[aria-label="Breadcrumb"] [aria-current="page"]');
      const cs = el && getComputedStyle(el);
      return {
        // width, asserted inside the page, not in the driver
        innerWidth: window.innerWidth,
        mmExact: window.matchMedia(`(width: ${w}px)`).matches,
        // structural control — a 200 on a shell would show zeros here
        h1: (document.querySelector('h1') || {}).textContent || null,
        imgs: document.querySelectorAll('img').length,
        links: document.querySelectorAll('a').length,
        crumbLis: document.querySelectorAll('nav[aria-label="Breadcrumb"] li').length,
        kredit: (document.body.innerText.match(/Kredit:/g) || []).length,
        // the DoD measurement
        found: !!el,
        text: el ? el.textContent.trim() : null,
        clientWidth: el ? el.clientWidth : null,
        scrollWidth: el ? el.scrollWidth : null,
        clientHeight: el ? el.clientHeight : null,
        maxWidth: cs ? cs.maxWidth : null,
        textOverflow: cs ? cs.textOverflow : null,
        overflow: cs ? cs.overflow : null,
        // negative control: is anything else on the page still ellipsis-clipped?
        otherClipped: Array.from(document.querySelectorAll('body *')).filter((e) => {
          const s = getComputedStyle(e);
          return e !== el && s.textOverflow === 'ellipsis' && e.scrollWidth > e.clientWidth + 1;
        }).length,
        // does the visible crumb still equal the JSON-LD's last name?
        jsonLdLast: (() => {
          for (const s of document.querySelectorAll('script[type="application/ld+json"]')) {
            try {
              const j = JSON.parse(s.textContent);
              if (j['@type'] === 'BreadcrumbList') return j.itemListElement.at(-1).name;
            } catch {}
          }
          return null;
        })(),
      };
    }, w);
    if (r.innerWidth !== w || !r.mmExact) throw new Error(`WIDTH ASSERT FAILED ${path}@${w}: innerWidth=${r.innerWidth} mm=${r.mmExact}`);
    if (!r.found) throw new Error(`NO CRUMB ELEMENT ${path}@${w}`);
    const ok = r.scrollWidth <= r.clientWidth;
    ok ? pass++ : fail++;
    rows.push({ path, w, status: resp.status(), finalUrl: p.url(), ...r, ok });
    console.log(
      `${ok ? 'PASS' : 'FAIL'}  ${path.padEnd(42)} @${String(w).padStart(4)}  ` +
      `scrollWidth ${String(r.scrollWidth).padStart(4)} <= clientWidth ${String(r.clientWidth).padStart(4)}  ` +
      `h=${r.clientHeight}px max-width=${r.maxWidth} text-overflow=${r.textOverflow}`
    );
    console.log(`      innerWidth=${r.innerWidth} mm(width:${w}px)=${r.mmExact} status=${resp.status()} final=${p.url()}`);
    console.log(`      control: h1="${String(r.h1).slice(0,46)}" imgs=${r.imgs} links=${r.links} crumbLi=${r.crumbLis} Kredit:x${r.kredit} otherEllipsisClipped=${r.otherClipped}`);
    console.log(`      crumb  = ${JSON.stringify(r.text)}`);
    console.log(`      jsonLd = ${JSON.stringify(r.jsonLdLast)}  match=${r.text === r.jsonLdLast}`);
    await c.close();
  }
}
if (OUT) fs.writeFileSync(OUT, JSON.stringify(rows, null, 2));
console.log(`\nDoD: ${pass} pass / ${fail} fail  (8 required)`);
console.log(`DOD EXIT: ${fail === 0 && pass === 8 ? 0 : 1}`);
await b.close();
process.exit(fail === 0 && pass === 8 ? 0 : 1);
