/**
 * Masthead category-rail overflow measurement — UI-02's rig.
 *
 *   node scripts/measure-nav-overflow.mjs <url> [--widths 1280,1440,1920] [--json]
 *
 * Requires playwright-core and the installed Chrome, neither of which is a
 * dependency of the app (same contract as `scripts/measure-page.mjs`). If
 * playwright-core is not in this checkout, install it anywhere and point
 * NODE_PATH at that node_modules:
 *
 *   npm i playwright-core --prefix /some/scratch
 *   NODE_PATH=/some/scratch/node_modules node scripts/measure-nav-overflow.mjs https://hellokahwin.com/
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT MEASURES, AND WHY IT ENUMERATES RATHER THAN LOOKS UP
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * It finds the masthead rail's <nav> by its accessible name, then enumerates
 * EVERY top-level anchor inside it and prints text + getBoundingClientRect()
 * for each. It does not search for nine names it expects to find. Sprint 04's
 * own audit was burned by the opposite habit: a grep for `Kredit` returned zero
 * on a page carrying forty credits, because they were labelled in English. A
 * lookup can only confirm what you already believed; an enumeration can
 * surprise you, and the surprise is the finding.
 *
 * `right` is compared against the LAYOUT viewport width (documentElement
 * .clientWidth), not window.innerWidth: innerWidth includes the classic
 * scrollbar gutter on Windows Chrome, so a link ending at 1905px in a 1920px
 * window with a 15px scrollbar is flush against the visible edge, not 15px
 * clear of it. Using innerWidth would silently pass an element that is in fact
 * under the scrollbar.
 *
 * Top-level anchors only: a dropdown's children are inside the same <nav> but
 * are display:none until opened, and an anchor in a closed dropdown reports a
 * meaningless rect. The rail's own items are the ones the DoD counts.
 *
 * TWO VERDICTS PER LINK, because the viewport edge is the weaker test. `OVER`
 * means the link's right edge is past the viewport — the UI-02 definition of
 * done. `CLIP` means it is past the right edge of its own scroll container,
 * which is a box with no visible boundary: on production at 1920px, three
 * links were inside the viewport and still invisible, because the rail was
 * capped at a 1264px scroller. A rig that only checked the viewport would have
 * reported two failures where there were three.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const url = argv.find((a) => !a.startsWith('--'));
const flag = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

if (!url) {
  console.error('usage: node scripts/measure-nav-overflow.mjs <url> [--widths 1280,1440,1920]');
  process.exit(1);
}

const widths = opt('widths', '1280,1440,1920')
  .split(',')
  .map((w) => Number(w.trim()));

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const report = [];

for (const width of widths) {
  const ctx = await browser.newContext({
    viewport: { width, height: 900 },
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  // Webfonts change every advance width in the rail. Measuring before they land
  // measures a fallback stack nobody sees.
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(400);

  const result = await page.evaluate(() => {
    const navs = Array.from(document.querySelectorAll('nav'));
    const named = navs.map((n) => ({
      el: n,
      name: n.getAttribute('aria-label') || n.getAttribute('aria-labelledby') || '(unnamed)',
    }));
    // The masthead rail is the <nav> inside <header>. Identify it structurally
    // rather than by label, then print every nav's name so a rename is visible
    // in the output instead of silently selecting nothing.
    const inHeader = named.filter((n) => n.el.closest('header'));
    const target = inHeader[0] ?? named[0];
    if (!target) return { error: 'no <nav> on page', navNames: [] };

    const scroller = target.el.closest('[class*="overflow-x"], .hk-edge') ?? null;
    const anchors = Array.from(target.el.querySelectorAll('a')).filter((a) => {
      // Exclude anchors inside an open dropdown/accordion panel.
      return !a.closest('[role="menu"]');
    });

    return {
      navNames: named.map((n) => n.name),
      targetName: target.name,
      layoutWidth: document.documentElement.clientWidth,
      innerWidth: window.innerWidth,
      navScrollWidth: target.el.scrollWidth,
      navClientWidth: target.el.clientWidth,
      scroller: scroller
        ? {
            className: scroller.className,
            overflowX: getComputedStyle(scroller).overflowX,
            scrollWidth: scroller.scrollWidth,
            clientWidth: scroller.clientWidth,
          }
        : null,
      docScrollWidth: document.documentElement.scrollWidth,
      clipRight: scroller ? Math.round(scroller.getBoundingClientRect().right * 100) / 100 : null,
      rows: new Set(anchors.map((a) => Math.round(a.getBoundingClientRect().top))).size,
      headerHeight: document.querySelector('header')
        ? Math.round(document.querySelector('header').getBoundingClientRect().height * 100) / 100
        : null,
      items: anchors.map((a) => {
        const r = a.getBoundingClientRect();
        return {
          text: (a.textContent || '').replace(/\s+/g, ' ').trim(),
          left: Math.round(r.left * 100) / 100,
          right: Math.round(r.right * 100) / 100,
          width: Math.round(r.width * 100) / 100,
          top: Math.round(r.top * 100) / 100,
        };
      }),
    };
  });

  report.push({ width, ...result });
  await ctx.close();
}

await browser.close();

if (flag('json')) {
  console.log(JSON.stringify({ url, report }, null, 2));
} else {
  console.log(`\nURL: ${url}\n`);
  for (const r of report) {
    console.log(`── viewport ${r.width} CSS px ──────────────────────────────`);
    if (r.error) {
      console.log(`  ERROR: ${r.error}`);
      continue;
    }
    console.log(
      `  navs on page: ${r.navNames.join(' | ')}   measured: "${r.targetName}"\n` +
        `  layout width ${r.layoutWidth} (innerWidth ${r.innerWidth})   ` +
        `nav scrollWidth ${r.navScrollWidth} / clientWidth ${r.navClientWidth}` +
        (r.scroller
          ? `\n  scroller overflow-x: ${r.scroller.overflowX}  ` +
            `scrollWidth ${r.scroller.scrollWidth} / clientWidth ${r.scroller.clientWidth}`
          : '\n  scroller: none found') +
        `\n  document scrollWidth ${r.docScrollWidth}  rail rows ${r.rows}  ` +
        `header height ${r.headerHeight}px`,
    );
    console.log(`  ${r.items.length} top-level anchors:`);
    for (const [i, it] of r.items.entries()) {
      const over = it.right > r.layoutWidth;
      const clipped = r.clipRight !== null && it.right > r.clipRight + 0.5;
      console.log(
        `   ${String(i + 1).padStart(2)}. right ${String(it.right).padStart(8)}  ` +
          `left ${String(it.left).padStart(8)}  top ${String(it.top).padStart(6)}  ` +
          `${over ? 'OVER' : ' ok '} ${clipped ? 'CLIP' : '    '}  ${it.text}`,
      );
    }
    const over = r.items.filter((it) => it.right > r.layoutWidth);
    const clip = r.items.filter((it) => r.clipRight !== null && it.right > r.clipRight + 0.5);
    console.log(
      `  => ${over.length} of ${r.items.length} past the viewport edge; ` +
        `${clip.length} of ${r.items.length} clipped by the scroller (its right edge ${r.clipRight})\n`,
    );
  }
}
