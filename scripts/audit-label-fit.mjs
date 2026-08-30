/**
 * UI-07 gate — the card category label fits, for every label that EXISTS.
 *
 *   pnpm audit:labels [base-url] [--widths 390,768,1024,1440] [--shot out.png]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY IT DOES NOT JUST READ THE PAGE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI-04 measured `p.hk-eyebrow.truncate` on `/artikel` at four widths and found
 * 10px of `Hantaran & Mas Kahwin` hidden on 9 of 11 cards at 390px, and nothing
 * wrong at 768, 1024 or 1440. That reading was correct and the conclusion drawn
 * from it — "the only mobile-only defect on the site" — was not, because the
 * check could only see the labels that happened to be on the page.
 *
 * Every article in that grid belonged to ONE category. `Hantaran & Mas Kahwin`
 * is 181px — short, against the 44 category destinations the page itself links.
 * Injecting a longer live one into the same element on production, 31 Ogos 2026:
 *
 *     width   card column   `Sebelum Nikah: Jodoh, Merisik & Tunang` (301px)
 *     390     171px         130px hidden
 *     768     352px         fits
 *     1024    220px          81px hidden      <- "not a mobile defect"
 *     1440    284px          17px hidden      <- "not a mobile defect"
 *
 * The defect was never width-bound. It was content-bound, and the content that
 * would expose it simply had no articles yet. A label-fit check that only tests
 * the labels currently rendered proves nothing about the labels that exist —
 * it re-measures the corpus, not the component.
 *
 * So this gate does two passes, and both must be green:
 *
 *   RENDERED — every card eyebrow on the page, as it actually renders:
 *              clientWidth >= scrollWidth. This is UI-07's literal DoD.
 *
 *   WORST CASE — the LONGEST candidate label injected into every distinct card
 *                column at every width, then the same assertion. This is
 *                the pass UI-04 did not have, and the only one that would have
 *                caught 1024 and 1440 before an editor filed an article there.
 *
 * The candidate list is read from the page's own one-segment `/artikel/<slug>`
 * links — the nav rail plus the "Ikut Kategori" list, 44 of them on 31 Ogos
 * 2026 — so the worst case tracks the database. Add a longer category name and
 * the gate gets harder on its own; nothing here needs editing to keep up.
 *
 * That set is a deliberate SUPERSET of the names that can actually land in a
 * card eyebrow: a few one-segment destinations are pillar/topic pages rather
 * than an article's primary category, so the longest candidate — `Ulang tahun
 * perkahwinan, pantun & adab tetamu`, 377px — may never appear there. A gate
 * should err strict, and the alternative errs the other way: reading the set
 * off the labels currently rendered is precisely the mistake this file exists
 * to prevent. So the run says "longest candidate", not "longest category".
 * Narrowing it to primary categories needs a source the page does not carry.
 *
 * ── The two DoD constraints that are NOT about width ──
 *
 * The fix may not shrink the label or hide it, so both are asserted directly:
 * computed `font-size >= 11px`, and a non-zero rendered box. A "fix" that sets
 * `font-size: 9px` or `display: none` makes every overflow assertion above go
 * green, which is exactly why they are separate checks rather than a comment.
 *
 * ── The negative control ──
 *
 * `--prove` re-applies `text-overflow: ellipsis; overflow: hidden; white-space:
 * nowrap` — the CSS UI-07 removed — and requires the gate to go RED. A checker
 * that has never been seen to fail is not evidence that anything passed. Run it
 * whenever this script changes:
 *
 *     pnpm audit:labels -- --prove     # must exit 1 and say so
 *
 * ── matchMedia, asserted, every page ──
 *
 * Same rule as `audit-srow-geometry.mjs`: the run PRINTS the viewport the page
 * itself reports and FAILS on a mismatch. A resized browser extension reports
 * success while `innerWidth` stays 1920, and a mobile finding measured at 1920
 * is a green that means nothing.
 *
 * Requires playwright-core and the installed Chrome — deliberately NOT a
 * dependency of the app, same as `scripts/measure-page.mjs` and
 * `scripts/audit-srow-geometry.mjs`.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

/** Flags that take a value, so their value is not mistaken for the base URL.
 *  `--widths 390` otherwise makes `390` the first non-`--` argument and the run
 *  navigates to "390/artikel". Caught by the `--prove` control, which is the
 *  first invocation that puts a valued flag before a positional. */
const VALUED = new Set(['widths', 'shot', 'tag']);
const consumed = new Set();
argv.forEach((a, i) => {
  if (a.startsWith('--') && VALUED.has(a.slice(2))) consumed.add(i + 1);
});
const base = (
  argv.find((a, i) => !a.startsWith('--') && !consumed.has(i)) ?? 'https://hellokahwin.com'
).replace(/\/$/, '');
const widths = String(opt('widths', '390,768,1024,1440')).split(',').map(Number);
const shot = opt('shot', null);
/** Negative control: put the truncation back and require this gate to go RED. */
const prove = argv.includes('--prove');

/** The DoD's floor. The label may wrap; it may not shrink. */
const MIN_FONT_PX = 11;

/** Two of the three surfaces that render `ArticleCard`; `/artikel/author/<slug>`
 *  is the third and needs an author slug this script has no way to discover, so
 *  it is not covered. They share the component, so a regression in one is a
 *  regression in all three — but they carry different articles, and therefore
 *  different labels, which is the whole point of checking more than one. */
const PAGES = [
  { label: 'artikel index', path: '/artikel' },
  { label: 'tag archive', path: opt('tag', '/artikel/tag/hantaran') },
];

const CARD_EYEBROW = 'p.hk-eyebrow';

const fail = [];
const note = (ok, line) => {
  console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${line}`);
  if (!ok) fail.push(line);
};

const browser = await chromium.launch({ executablePath: CHROME });

try {
  for (const page of PAGES) {
    for (const width of widths) {
      const ctx = await browser.newContext({
        viewport: { width, height: width < 768 ? 844 : 900 },
        isMobile: width < 768,
        hasTouch: width < 768,
        deviceScaleFactor: 1,
      });
      const p = await ctx.newPage();
      const url = `${base}${page.path}`;
      const res = await p.goto(url, { waitUntil: 'networkidle' });
      await p.evaluate(() => document.fonts.ready);
      await p.waitForTimeout(400);

      console.log(`\n${page.label} @${width}  ${url}  [HTTP ${res?.status()}]`);

      // ── matchMedia, asserted. A width we did not actually get invalidates
      //    everything below it, so stop this page rather than report on it.
      const seen = await p.evaluate(
        (w) => ({
          inner: window.innerWidth,
          mm: window.matchMedia(`(width: ${w}px)`).matches,
        }),
        width,
      );
      note(
        seen.mm && seen.inner === width,
        `viewport asserted: innerWidth ${seen.inner}, matchMedia(width: ${width}px) ${seen.mm}`,
      );
      if (!seen.mm || seen.inner !== width) {
        await ctx.close();
        continue;
      }

      const out = await p.evaluate(
        ({ sel, minFont, prove }) => {
          const cards = Array.from(document.querySelectorAll(sel)).filter((e) =>
            e.closest('article'),
          );
          if (prove) {
            for (const e of cards) {
              e.style.overflow = 'hidden';
              e.style.textOverflow = 'ellipsis';
              e.style.whiteSpace = 'nowrap';
            }
          }

          // Every live category name: a one-segment `/artikel/<slug>` link.
          const cats = [
            ...new Set(
              Array.from(document.querySelectorAll('a[href^="/artikel/"]'))
                .filter((a) => a.getAttribute('href').split('/').filter(Boolean).length === 2)
                .map((a) => (a.textContent || '').trim())
                .filter(Boolean),
            ),
          ];

          const measure = (e) => ({
            cw: e.clientWidth,
            sw: e.scrollWidth,
            h: Math.round(e.getBoundingClientRect().height),
            fs: parseFloat(getComputedStyle(e).fontSize),
            text: (e.textContent || '').trim(),
          });

          const rendered = cards.map(measure);

          // Longest live label, measured in the page's own eyebrow style.
          let longest = { name: '', px: 0 };
          if (cards.length && cats.length) {
            const cs = getComputedStyle(cards[0]);
            const probe = document.createElement('span');
            probe.style.cssText = `position:absolute;visibility:hidden;white-space:nowrap;font:${cs.font};letter-spacing:${cs.letterSpacing};text-transform:${cs.textTransform};`;
            document.body.appendChild(probe);
            for (const n of cats) {
              probe.textContent = n;
              const px = Math.ceil(probe.getBoundingClientRect().width);
              if (px > longest.px) longest = { name: n, px };
            }
            document.body.removeChild(probe);
          }

          // WORST CASE: inject the longest label into one card per distinct
          // column width, so every column the grid produces is covered.
          const byCol = new Map();
          for (const e of cards) if (!byCol.has(e.clientWidth)) byCol.set(e.clientWidth, e);
          const worst = [];
          for (const [col, e] of byCol) {
            const target = e.querySelector('a') || e;
            const orig = target.textContent;
            target.textContent = longest.name;
            const m = measure(e);
            worst.push({ col, ...m });
            target.textContent = orig;
          }

          return {
            cards: cards.length,
            cats: cats.length,
            longest,
            rendered,
            worst,
            tooSmall: rendered.filter((r) => r.fs < minFont).length,
            invisible: rendered.filter((r) => r.h === 0 || r.cw === 0).length,
          };
        },
        { sel: CARD_EYEBROW, minFont: MIN_FONT_PX, prove },
      );

      note(
        out.cards > 0,
        `found ${out.cards} card eyebrows (${out.cats} one-segment /artikel destinations on the page)`,
      );
      if (out.cards === 0) {
        await ctx.close();
        continue;
      }

      // RENDERED — UI-07's literal DoD.
      const clipped = out.rendered.filter((r) => r.sw - r.cw > 1);
      note(
        clipped.length === 0,
        `RENDERED: ${clipped.length} of ${out.cards} clipped` +
          (clipped.length
            ? ` — e.g. ${clipped[0].cw}px box / ${clipped[0].sw}px text, ${clipped[0].sw - clipped[0].cw}px hidden :: "${clipped[0].text}"`
            : ''),
      );

      // WORST CASE — the pass UI-04 did not have.
      const wClipped = out.worst.filter((r) => r.sw - r.cw > 1);
      note(
        wClipped.length === 0,
        `WORST CASE: longest candidate "${out.longest.name}" (${out.longest.px}px nowrap) in ${out.worst.length} distinct column(s) ` +
          `[${out.worst.map((w) => `${w.col}px`).join(', ')}] — ${wClipped.length} clipped` +
          (wClipped.length
            ? ` — ${wClipped[0].sw - wClipped[0].cw}px hidden in the ${wClipped[0].col}px column`
            : ''),
      );

      // The two constraints that are not about width.
      note(
        out.tooSmall === 0,
        `NOT SHRUNK: ${out.tooSmall} label(s) below ${MIN_FONT_PX}px (smallest ${Math.min(...out.rendered.map((r) => r.fs))}px)`,
      );
      note(out.invisible === 0, `NOT HIDDEN: ${out.invisible} label(s) with a zero box`);

      if (shot && width === widths[0] && page.path === '/artikel') {
        await p.screenshot({ path: shot, fullPage: true });
        console.log(`  ..    screenshot ${shot}`);
      }
      await ctx.close();
    }
  }
} finally {
  await browser.close();
}

console.log('');
if (prove) {
  // The control INVERTS the exit code: putting the truncation back must break
  // this gate. A green here means the gate cannot see the defect it exists for.
  if (fail.length === 0) {
    console.error('NEGATIVE CONTROL FAILED: truncation was re-applied and the gate still passed.');
    console.error(
      'This gate cannot detect the defect it was written for. Do not trust its greens.',
    );
    process.exit(1);
  }
  console.log(
    `negative control ok — truncation re-applied, gate went red on ${fail.length} assertion(s).`,
  );
  process.exit(0);
}

if (fail.length) {
  console.error(`${fail.length} assertion(s) failed:`);
  for (const f of fail) console.error(`  - ${f}`);
  process.exit(1);
}
console.log('all label-fit assertions passed.');
