/**
 * DES-15 — does a design-system class actually WIN its own declarations?
 *
 *   node scripts/audit-class-wins.mjs <url> [url...] [--width 390,1280]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY IT IS NOT THE SAME CHECK AS UI-14's
 * ─────────────────────────────────────────────────────────────────────────────
 * UI-14 catches a class that matches NO rule. This catches a rule that matches
 * and never wins — `.s-h2` at specificity (0,1,0) losing every one of its own
 * declarations to `.hk-public h2` at (0,1,1) on every public page, for as long
 * as both existed. A check for one cannot catch the other: the markup is right,
 * the CSS is right, and the cascade throws the answer away in between. Nothing
 * but a COMPUTED read on a rendered page can see it.
 *
 * So the contract is not hand-typed here — it is PARSED OUT OF THE CSS. The
 * gate asks the source what the class claims, then asks the browser what the
 * reader gets, and fails when they disagree. A hand-typed expectation would
 * drift the day someone edits the rule, which is the same class of silence this
 * gate exists to end.
 *
 * ⚠ A ZERO IS A CLAIM ABOUT THE CHECK. If a page carries none of the classes
 * under contract, that is reported as UNPROVEN and exits non-zero — never as a
 * pass. `/artikel/hantaran-mas-kahwin` carries five `.s-h2`; use it.
 *
 * ⚠ READ THE EXIT CODE DIRECTLY, NOT THROUGH A PIPE. `node … | tee log` reports
 * TEE's status, which is how UI-06's CI job printed SUCCESS over a red gate.
 *
 * Requires playwright-core and the installed Chrome — deliberately not a
 * dependency of the app, exactly as scripts/measure-page.mjs has it.
 */
import { readFileSync } from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const CSS = new URL('../src/design-system/components.css', import.meta.url);

const argv = process.argv.slice(2);
const urls = argv.filter((a) => /^https?:/.test(a));
const widths = (argv.includes('--width') ? argv[argv.indexOf('--width') + 1] : '390,1280')
  .split(',')
  .map(Number);

if (!urls.length) {
  console.error('usage: node scripts/audit-class-wins.mjs <url> [url...] [--width 390,1280]');
  process.exit(2);
}

/* ── The classes this gate FAILS on. Seeded with the one DES-15 decided.
   `.s-h1` and `.s-h3` lose declarations to the same `.hk-public h1,h2,h3,h4`
   rule TODAY — measured, and listed as REPORT rather than ENFORCE because
   promoting them moves the h1 tracking on every article and category page, and
   that is an art-direction call DES-15 did not own. Move a class from REPORT to
   ENFORCE in the same change that fixes it, never before. ── */
const ENFORCE = ['s-h2'];
const REPORT = ['s-h1', 's-h3'];

/* Only properties whose computed form can be compared without guessing. */
const COMPARABLE = new Set(['font-weight', 'letter-spacing', 'line-height', 'text-transform']);
const css = readFileSync(CSS, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
const claims = {};
for (const cls of [...ENFORCE, ...REPORT]) {
  // `.s-h2` or the doubled `.s-h2.s-h2` — one selector, no descendant part.
  const re = new RegExp(`(^|\\})\\s*\\.${cls}(\\.${cls})?\\s*\\{([^}]*)\\}`, 'm');
  const m = css.match(re);
  if (!m) {
    console.error(`FATAL: no bare rule for .${cls} in components.css — VERIFY THE CHECK`);
    process.exit(2);
  }
  claims[cls] = { doubled: Boolean(m[2]), props: {} };
  for (const decl of m[3].split(';')) {
    const [k, v] = decl.split(':').map((x) => x && x.trim());
    if (k && v && COMPARABLE.has(k)) claims[cls].props[k] = v;
  }
}

const near = (a, b) => Math.abs(a - b) < 0.05;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
let fail = 0;
let checked = 0;

for (const width of widths) {
  for (const url of urls) {
    const ctx = await browser.newContext({
      viewport: { width, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await ctx.newPage();
    const cssFiles = new Set();
    page.on('response', (r) => {
      if (/\.css(\?|$)/.test(r.url())) cssFiles.add(r.url().split('/').pop());
    });
    const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
    const h = resp.headers();
    await page.evaluate(() => document.fonts.ready); // a webfont moves every advance width

    /* The reading belongs to a BUILD, not to a URL. No flag turns this off. */
    console.log(`\n-- ${url}  @${width}px`);
    console.log(
      `   clientWidth=${await page.evaluate(() => document.documentElement.clientWidth)}` +
        `  x-vercel-cache=${h['x-vercel-cache'] ?? '-'}  x-vercel-id=${h['x-vercel-id'] ?? '-'}`,
    );
    console.log(`   css=${[...cssFiles].join(' ') || '(none seen — inline or cached)'}`);

    const found = await page.evaluate(
      (cs) => {
        const out = {};
        for (const cls of cs) {
          out[cls] = [...document.querySelectorAll('.' + cls)].map((el) => {
            const c = getComputedStyle(el);
            return {
              tag: el.tagName.toLowerCase(),
              text: (el.textContent || '').trim().slice(0, 32),
              fontSizePx: parseFloat(c.fontSize),
              got: {
                'font-weight': c.fontWeight,
                'letter-spacing': c.letterSpacing,
                'line-height': c.lineHeight,
                'text-transform': c.textTransform,
              },
            };
          });
        }
        return out;
      },
      [...ENFORCE, ...REPORT],
    );

    for (const cls of [...ENFORCE, ...REPORT]) {
      const mode = ENFORCE.includes(cls) ? 'ENFORCE' : 'REPORT ';
      const els = found[cls];
      if (!els.length) {
        console.log(`   ${mode} .${cls}: absent on this page`);
        continue;
      }
      for (const el of els) {
        for (const [prop, want] of Object.entries(claims[cls].props)) {
          const got = el.got[prop];
          let ok;
          let expect = want;
          if (prop === 'letter-spacing') {
            // The computed form is px; an em claim resolves against this
            // element's OWN font-size, which is a fluid clamp() here.
            const em = /^(-?[\d.]+)em$/.exec(want);
            const px = em ? Number(em[1]) * el.fontSizePx : NaN;
            expect = em ? `${px.toFixed(4)}px (${want} of ${el.fontSizePx}px)` : want;
            ok = em ? near(parseFloat(got), px) : got === want;
          } else if (prop === 'line-height') {
            const n = /^[\d.]+$/.test(want) ? Number(want) * el.fontSizePx : NaN;
            expect = Number.isNaN(n) ? want : `${n.toFixed(4)}px (${want} x ${el.fontSizePx}px)`;
            ok = Number.isNaN(n) ? got === want : near(parseFloat(got), n);
          } else {
            ok = String(got) === String(want);
          }
          checked++;
          if (!ok) {
            if (mode === 'ENFORCE') fail++;
            console.log(
              `   ${mode} FAIL .${cls} ${el.tag} "${el.text}" ${prop}: ` +
                `claimed ${expect} — reader gets ${got}`,
            );
          }
        }
      }
      console.log(
        `   ${mode} .${cls}: ${els.length} element(s), ` +
          `${Object.keys(claims[cls].props).length} claim(s) each` +
          (claims[cls].doubled ? ' [doubled selector]' : ''),
      );
    }
    await ctx.close();
  }
}
await browser.close();

if (!checked) {
  console.log('\nCLASSWINS: UNPROVEN — no element under contract was found on any page given.');
  console.log('A zero here is a claim about the CHECK, not about the site. Point it at a page');
  console.log('that carries the class (/artikel/hantaran-mas-kahwin carries five .s-h2).');
  console.log('CLASSWINS EXIT: 2');
  process.exit(2);
}
console.log(`\n${checked} claim(s) compared. ENFORCE failures: ${fail}.`);
console.log(`CLASSWINS EXIT: ${fail ? 1 : 0}`);
process.exit(fail ? 1 : 0);
