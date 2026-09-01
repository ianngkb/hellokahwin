/**
 * UI-17 — the article rail's COMPUTED geometry, measured in a real browser.
 *
 *   node scripts/measure-article-rail.mjs --base https://hellokahwin.com
 *   node scripts/measure-article-rail.mjs --url https://hellokahwin.com/artikel/…
 *   node scripts/measure-article-rail.mjs --base http://127.0.0.1:3210 --json out.json
 *
 * Prints `RAIL EXIT: <n>` at the start of a line and exits with that code.
 * 0 = every asserted relationship held; 1 = at least one did not; 2 = the run
 * could not be trusted (wrong page, fetch error, nothing to measure).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY NO STRUCTURAL CHECK COULD HAVE REPLACED IT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DES-03 §5.1 draws a 300px right rail beside the article body and says it in
 * words: "On desktop the panel is the 300 px rail; on a phone it is a
 * full-width block in the same place in the reading order." The frame it draws
 * is literal — `grid-template-columns: minmax(0,756px) 300px; gap: 64px`.
 *
 * Production on 31 Aug 2026 rendered the MOBILE composition at every width.
 * The markup for the panel was already there and had been for weeks: the
 * server HTML carries `<aside>` twice and `Rekod` on every article. Grepping
 * for the markup returns a healthy number and proves nothing, because the
 * defect is not a missing element — it is an element in the wrong COLUMN.
 * `rail.left > body.right` is a relationship between two boxes that do not
 * exist until CSS is applied at a real width in a real browser.
 *
 * So the observable this script asserts on is a computed geometry
 * relationship, and the one thing it must never do is accept the presence of a
 * node as evidence about its position.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT IT ASSERTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * At every width >= 1024 (the site's desktop breakpoint):
 *
 *   R1  RAIL RIGHT OF BODY — `rail.left >= body.right`. The DoD's own
 *       formulation. Strict `>` would pass on a 1px overlap and fail on a
 *       zero-gap layout that is visually correct, so the comparison is
 *       `>=` and the GAP is printed beside it rather than folded into a
 *       boolean.
 *   R2  RAIL WIDTH — 300px, +/- 1px for sub-pixel layout. DES-03 §5.1.
 *   R3  ORDER IN THE RAIL — Rekod, then Dalam artikel ini, then Sumber, by
 *       ascending `top`, over whichever of the three are present. A missing
 *       block is REPORTED as missing and never silently reorders the two
 *       that remain.
 *
 * Below 1024 (390 is the audience's phone, and the width the DoD names):
 *
 *   R4  FULL WIDTH — each present block shares the body column's LEFT EDGE
 *       and is not narrower than it. Deliberately NOT width-equality: the
 *       header block and the prose column have different widths at 768 on
 *       purpose (UI-10's ragged right), and a check that goes red on a
 *       decision somebody made on purpose gets switched off within a week.
 *   R5  READING ORDER — the same three blocks in the same relative order as
 *       on desktop, by ascending `top`.
 *
 * At every width:
 *
 *   R8  NOT EMPTY — a block that is present but 0px tall is an empty
 *       wrapper, not a block, and it still costs a `gap` in the rail's flex
 *       column. Shipped to a preview and caught only because block HEIGHT is
 *       recorded: a React element is truthy even when it renders nothing.
 *
 *   R6  ONE MOUNT — each block appears EXACTLY ONCE in the DOM. The article
 *       template shipped two `<h1>`s on 85 of 85 articles (DES-09 G01) by
 *       rendering a mobile block and a desktop block side by side, and the
 *       obvious way to build a responsive rail reintroduces exactly that.
 *       Counted in the DOM, never in the HTML: a Next.js page carries its
 *       markup TWICE in the served bytes (once in the stream, once in the
 *       flight payload), so a text count over the response is exactly double
 *       and means nothing.
 *
 *   R7  TOC RELOCATION — no `nav.article-toc` outside `[data-hk-rail]`, and
 *       never more than one anywhere. A table of contents ALREADY renders on
 *       this site, inline inside `.inspire-prose`, carrying its own
 *       `Isi Kandungan` eyebrow; UI-18 moves it into the rail. R7 exists so
 *       that moving it WITHOUT deleting the inline render fails a build
 *       instead of shipping two. It reports non-zero on production today,
 *       which is the honest pre-relocation state and not a regression.
 *
 *       The signal is the CLASS, never a label string. The census that
 *       started this — "DALAM ARTIKEL INI on 0 of 85 articles" — was a TRUE
 *       number answering the WRONG QUESTION: the component exists, its
 *       heading just reads `Isi Kandungan`. Testing for the label you expect
 *       can only ever return a number about your expectation.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THREE TRAPS THIS FILE IS BUILT AROUND, EACH ONE MEASURED HERE BEFORE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. A NULL IS A CLAIM ABOUT THE SELECTOR. If `[data-hk-rail]` is absent this
 *    script does NOT print "no rail". It enumerates every plausible rail
 *    candidate it can see — `aside`, `.s-rekod`, the sidebar class — with each
 *    one's box, so a wrong selector looks like a wrong selector and not like a
 *    missing feature. UI-06's clipped-text check returned ZERO on the exact
 *    page where nine clipped labels had been counted by hand four hours
 *    earlier, and the number was completely calm.
 *
 * 2. `innerWidth` IS NOT THE LAYOUT VIEWPORT. It includes the scrollbar
 *    gutter. Every width printed here is `document.documentElement.clientWidth`
 *    — written down in `scripts/measure-nav-overflow.mjs`, on master, while a
 *    neighbouring item was busy getting it wrong.
 *
 * 3. A WEBFONT CHANGES EVERY ADVANCE WIDTH ON THE PAGE. Nothing is read until
 *    `document.fonts.ready` resolves. A measure taken before it is a measure
 *    of a fallback stack no reader ever sees.
 *
 * And the provenance rule: a rendered measurement belongs to a BUILD, not to a
 * URL. Production changed three times during one afternoon and two runs twelve
 * minutes apart disagreed about the nav. Every row carries the deployment id,
 * the cache state and the CSS chunk hashes, and there is no flag to turn that
 * off.
 *
 * Requires playwright-core and the installed Chrome — deliberately not a
 * dependency of the app, same arrangement as `scripts/ui-layout-gate.mjs`.
 */
import fs from 'node:fs';
import { chromium } from 'playwright-core';

const CHROME =
  process.env.UI_GATE_CHROME ??
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '/usr/bin/google-chrome');

// 390 is the audience's phone and the width the DoD names for the full-width
// case. 1024 is the site's desktop breakpoint and therefore the first width at
// which the rail is REQUIRED to exist — a gate that started at 1440 would pass
// a layout that collapses on every laptop between the two.
const WIDTHS = [390, 768, 1024, 1440, 1920];
const DESKTOP_BREAKPOINT = 1024;
const RAIL_WIDTH_PX = 300; // DES-03 §5.1
const RAIL_WIDTH_TOLERANCE = 1;
const FULL_WIDTH_TOLERANCE = 8;
const SITE_LANG = 'ms';

// The DoD's own comfortable band. The ceiling is a hard assertion; the floor is
// printed and never asserted, for the reason UI-10 wrote down: a 390px phone
// leaves ~41 characters by arithmetic and no cap can widen it, so a floor would
// fire on every mobile page and be switched off within a week. This script only
// asserts the measure at the three DESKTOP widths the DoD names.
const MEASURE_MIN_CPL = 45;
const MEASURE_MAX_CPL = 75;
const MEASURE_WIDTHS = [1024, 1440, 1920];

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (has(n) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const many = (n) => argv.reduce((a, v, i) => (v === `--${n}` ? [...a, argv[i + 1]] : a), []);

// Three article URLs of different lengths, as the DoD requires, chosen by
// measurement rather than by eye and named here so a run cannot silently
// discover an empty set. Body character counts measured on production
// 01 Sep 2026 with `extractTextContent` over the served page.
//
// ⚠ REVISED BY UI-19, BECAUSE THE OLD THREE COULD NOT EXERCISE R3. Not one of
// them carried Rekod, the contents list and Sumber at the same time — measured
// 02 Sep 2026, `mas-kahwin-ikut-negeri` has Sumber and no contents list, and
// the other two have a contents list and no Sumber. R3 asserts the ORDER of the
// three blocks "over whichever of the three are present", so on that set it had
// never compared more than two, and the specified composition had never once
// been observed whole. Only 7 of 92 live articles carry all three.
//
// The set below is chosen against the CEO ruling UI-19 ships under — Sumber
// renders where sources exist and nowhere else — so it spans BOTH sides of it
// and different lengths, and the first entry is the one that actually tests
// the order:
const DEFAULT_PATHS = [
  // all three blocks; the order case. 136,185 bytes.
  '/artikel/hantaran-mas-kahwin/hantaran-wajib-atau-adat',
  // all three, a different pillar and a different length. 131,131 bytes.
  '/artikel/ucapan-doa/doa-pengantin-baru',
  // Sumber, no contents list — the article DES-03 §5.1 drew its frames from.
  '/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri',
  // no Sumber; the longest page on the site. 212,315 bytes.
  '/artikel/idea-dan-nasihat/garden-wedding',
  // no Sumber; the shortest. 90,686 bytes.
  '/artikel/glamor-eksklusif/grand-hyatt-kuala-lumpur',
];

// ─────────────────────────────────────────────────────────────────────────────
// Runs INSIDE the page. Everything it returns is a number the browser computed,
// never a value this file assumed.
// ─────────────────────────────────────────────────────────────────────────────
function collect() {
  const box = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    return {
      left: Math.round(r.left * 100) / 100,
      right: Math.round(r.right * 100) / 100,
      top: Math.round(r.top + window.scrollY),
      width: Math.round(r.width * 100) / 100,
      height: Math.round(r.height),
      display: cs.display,
      // The content box, which is the width a child actually lays out in —
      // 300px of column minus the rail's own horizontal padding. UI-18 needs
      // this number for its 24px tap-target floor and must be given the
      // MEASURED one, not the intended one.
      innerWidth:
        Math.round((r.width - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)) * 100) /
        100,
      tag: el.tagName.toLowerCase(),
      cls: el.className && typeof el.className === 'string' ? el.className.slice(0, 80) : '',
    };
  };

  const all = (sel) => [...document.querySelectorAll(sel)];

  // ── the three blocks, and the count of each ──────────────────────────────
  // Counted, not found-first. A responsive layout built as a mobile copy plus
  // a desktop copy renders two of everything and `querySelector` would return
  // the first one and look perfectly healthy.
  // ⚠ OUTERMOST ONLY. `[data-hk-rail-block="rekod"], .s-rekod` counted TWO on
  // the first preview build and reported `R6-double-mount` on all three
  // articles — a page defect that did not exist. `RekodPanel` renders
  // `<div class="s-rekod">` INSIDE the rail's `<div data-hk-rail-block>`, so
  // the union selector matched one nested pair twice. Same shape as the
  // `hk-navrail-item` count that returned 10 on a rail with nine links: a
  // selector that can match an element and its own ancestor is counting the
  // markup, not the page. Discard any match contained by another.
  const outermost = (els) => els.filter((el) => !els.some((o) => o !== el && o.contains(el)));
  const rekodEls = outermost(all('[data-hk-rail-block="rekod"], .s-rekod'));
  const tocEls = all('[data-hk-rail-block="toc"]');
  const sumberEls = all('[data-hk-rail-block="sumber"]');
  const railEls = all('[data-hk-rail]');

  // ── the relocation guard, UI-17/UI-18 ────────────────────────────────────
  // A table of contents ALREADY renders on this site, inline inside
  // `.inspire-prose`, as `<nav class="article-toc">` with its own
  // `<p class="hk-eyebrow">Isi Kandungan</p>`. Measured 01 Sep 2026 on the
  // three DoD articles: present on garden-wedding and duit-hantaran-kahwin,
  // absent on mas-kahwin-ikut-negeri.
  //
  // So UI-18 is a RELOCATION, not a build, and the failure mode is the one
  // that has already cost this template once: move the component into the rail
  // and forget to delete the inline render, and production carries two.
  // Counted here rather than hoped for. The signal is the CLASS, never a label
  // string — the string census that started this ("DALAM ARTIKEL INI on 0 of
  // 85") was a true number answering the wrong question, because the existing
  // component's heading reads `Isi Kandungan`.
  const tocInRail = all('[data-hk-rail] nav.article-toc, [data-hk-rail] .article-toc').length;
  const tocAnywhere = all('nav.article-toc, .article-toc').length;

  // The body column: the element the prose lays out in. Identified by the
  // article template's own structure rather than by a class that could be
  // renamed out from under this script.
  const proseEl = document.querySelector('.inspire-prose') ?? document.querySelector('article');
  const bodyColEl = document.querySelector('[data-hk-body-col]') ?? proseEl?.closest('article');

  // ── reading measure, by the DoD's own formula ────────────────────────────
  // width / (font-size * 0.5), on the block the prose is laid out in, over the
  // longest continuous paragraph. The 0.5em is an assumption and is stated
  // rather than corrected: measured through canvas measureText over 6,000
  // characters of this site's own Malay prose in its own rendered face, the
  // true average advance is 0.4636em, so this formula UNDER-reports by ~8%.
  let measure = null;
  if (proseEl) {
    const paras = [...proseEl.querySelectorAll('p')].filter(
      (p) => (p.textContent ?? '').trim().length >= 80,
    );
    if (paras.length) {
      const p = paras.reduce((a, b) =>
        (a.textContent ?? '').length >= (b.textContent ?? '').length ? a : b,
      );
      const r = p.getBoundingClientRect();
      const fs = parseFloat(getComputedStyle(p).fontSize);
      measure = {
        widthPx: Math.round(r.width * 100) / 100,
        fontSizePx: fs,
        cpl: Math.round((r.width / (fs * 0.5)) * 10) / 10,
        sampleChars: (p.textContent ?? '').trim().length,
      };
    }
  }

  // ── ENUMERATE WHAT IS THERE ──────────────────────────────────────────────
  // Printed unconditionally, present or absent. This is the half that stops a
  // wrong selector from being reported as a missing feature.
  const candidates = [
    ...all('aside').map((el) => ({ how: 'aside', ...box(el) })),
    ...all('.inspire-sidebar').map((el) => ({ how: '.inspire-sidebar', ...box(el) })),
    ...all('.s-rekod').map((el) => ({ how: '.s-rekod', ...box(el) })),
    ...all('[data-hk-rail]').map((el) => ({ how: '[data-hk-rail]', ...box(el) })),
  ];

  return {
    // `innerWidth` includes the scrollbar gutter and is not the layout
    // viewport. `scripts/measure-nav-overflow.mjs` had this written down on
    // master while a neighbouring item was getting it wrong.
    // `<h2>`s in the BODY, excluding the contents list's own markup, so the
    // TOC assertion is made against the page's real section count rather than
    // against a tolerance.
    bodyH2: [...(proseEl?.querySelectorAll('h2') ?? [])].filter(
      (h) => !h.closest('nav.article-toc'),
    ).length,
    layoutViewport: document.documentElement.clientWidth,
    innerWidth: window.innerWidth,
    counts: {
      rail: railEls.length,
      rekod: rekodEls.length,
      toc: tocEls.length,
      sumber: sumberEls.length,
      h1: all('h1').length,
    },
    toc_relocation: { inRail: tocInRail, anywhere: tocAnywhere },
    rail: box(railEls[0]),
    bodyCol: box(bodyColEl),
    prose: box(proseEl),
    rekod: box(rekodEls[0]),
    toc: box(tocEls[0]),
    sumber: box(sumberEls[0]),
    measure,
    candidates,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
async function run() {
  const base = opt('base', 'https://hellokahwin.com').replace(/\/$/, '');
  const urls = many('url').length ? many('url') : DEFAULT_PATHS.map((p) => base + p);
  const jsonOut = opt('json', null);

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const rows = [];
  let hardError = null;

  for (const url of urls) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        extraHTTPHeaders: process.env.UI_GATE_BYPASS
          ? {
              'x-vercel-protection-bypass': process.env.UI_GATE_BYPASS,
              'x-vercel-set-bypass-cookie': 'true',
            }
          : {},
      });
      const page = await ctx.newPage();
      let error = null;
      let provenance = null;
      let data = null;
      try {
        const resp = await page.goto(url, { waitUntil: 'load', timeout: 60000 });
        if (resp && resp.status() >= 400) error = `HTTP ${resp.status()}`;
        // IS THIS EVEN OUR PAGE? A Vercel preview answers an unauthenticated
        // request with a well-formed 200 login page that has no rail, no body
        // column and no images — i.e. a clean run over somebody else's
        // document. Two markers, both absent from any foreign page.
        if (!error) {
          const id = await page.evaluate(() => ({
            origin: location.origin,
            href: location.href,
            lang: document.documentElement.lang,
          }));
          const want = new URL(url).origin;
          if (id.origin !== want)
            error = `NOT THIS SITE — asked ${want}, got ${id.origin} (${id.href})`;
          else if (id.lang !== SITE_LANG)
            error = `NOT THIS SITE — <html lang="${id.lang}">, expected "${SITE_LANG}"`;
        }
        const h = resp ? resp.headers() : {};
        provenance = {
          status: resp?.status() ?? null,
          vercelId: h['x-vercel-id'] ?? null,
          cache: h['x-vercel-cache'] ?? null,
          age: h['age'] ?? null,
        };
        if (!error) {
          // A webfont changes every advance width on the page. Nothing is read
          // before this resolves.
          await page.evaluate(() => document.fonts.ready).catch(() => {});
          await page.waitForTimeout(300);
          data = await page.evaluate(collect);
          provenance.css = await page
            .evaluate(() =>
              [...document.querySelectorAll('link[rel=stylesheet]')].map(
                (l) => l.href.split('/').pop().split('?')[0],
              ),
            )
            .catch(() => []);
        }
      } catch (e) {
        error = e.message.split('\n')[0];
      }
      if (error) hardError = hardError ?? error;
      rows.push({ url, width, error, provenance, ...(data ?? {}) });
      await ctx.close();
    }
  }
  await browser.close();

  // ── verdicts ─────────────────────────────────────────────────────────────
  const fail = [];
  // Two sinks, deliberately. `note` is a violation and fails the run. `report`
  // is an observation that must never be silent and must never be fatal — a
  // finding whose cause is content rather than code. Folding the second into
  // the first would make this instrument permanently red and therefore
  // ignored; dropping it would hide the 52 articles that carry no sources.
  const observed = [];
  const note = (r, code, msg) => fail.push({ url: r.url, width: r.width, code, msg });
  const observe = (r, code, msg) => observed.push({ url: r.url, width: r.width, code, msg });

  for (const r of rows) {
    if (r.error) continue;
    const desktop = r.width >= DESKTOP_BREAKPOINT;

    // R6 — ONE MOUNT, at every width. Checked first because a doubled block
    // makes every geometry number below it a number about an arbitrary one of
    // two elements.
    for (const [k, n] of Object.entries(r.counts)) {
      if (k === 'h1') continue;
      if (n > 1) note(r, 'R6-double-mount', `${k} appears ${n}x in the DOM (expected 0 or 1)`);
    }

    if (!r.bodyCol) {
      note(r, 'R0-no-body-column', 'could not locate the body column — every check below is void');
      continue;
    }

    if (desktop) {
      if (!r.rail) {
        note(r, 'R1-no-rail', `no [data-hk-rail] at ${r.width}px`);
      } else {
        // R1 — the DoD's own relationship.
        const gap = Math.round((r.rail.left - r.bodyCol.right) * 100) / 100;
        if (!(r.rail.left >= r.bodyCol.right))
          note(
            r,
            'R1-rail-not-right-of-body',
            `rail.left ${r.rail.left} < body.right ${r.bodyCol.right} (gap ${gap})`,
          );
        // R2 — the specified width.
        if (Math.abs(r.rail.width - RAIL_WIDTH_PX) > RAIL_WIDTH_TOLERANCE)
          note(
            r,
            'R2-rail-width',
            `rail.width ${r.rail.width} != ${RAIL_WIDTH_PX} +/- ${RAIL_WIDTH_TOLERANCE}`,
          );
      }
    } else {
      // R4 — full width in the same column, not a sidebar.
      //
      // Stated as LEFT EDGE + NOT NARROWER, not as width-equality, and the
      // difference is not cosmetic. The first version of this check compared
      // `block.width` to `bodyCol.width` and fired three times on the PRE-FIX
      // capture at 768px — where the header block is 704px (the container) and
      // the prose column is 581px (the reading measure). Both numbers were
      // right and the verdict was wrong: that gap is UI-10's deliberate
      // composition, "a ragged right: the headline may run wider than the
      // reading column, and the photograph wider still". A check that goes red
      // on a decision somebody made on purpose gets switched off within a week,
      // and takes the four real assertions beside it with it.
      //
      // What DES-03 §5.1 actually says is "a full-width block in the same place
      // in the reading order" — i.e. it shares the body column's left edge and
      // is not a narrow sidebar pushed to one side. That is what this asserts.
      for (const k of ['rekod', 'toc', 'sumber']) {
        const b = r[k];
        if (!b) continue;
        if (Math.abs(b.left - r.bodyCol.left) > 1)
          note(
            r,
            'R4-not-in-body-column',
            `${k}.left ${b.left} != body column left ${r.bodyCol.left} at ${r.width}px`,
          );
        if (b.width < r.bodyCol.width - FULL_WIDTH_TOLERANCE)
          note(
            r,
            'R4-narrower-than-body',
            `${k}.width ${b.width} < body column ${r.bodyCol.width} at ${r.width}px — a sidebar, not a full-width block`,
          );
      }
    }

    // R7 — TOC RELOCATION. Not a duplicate of R6: R6 counts the rail's own
    // slot, this counts the pre-existing inline component that UI-18 has to
    // move. Two failure shapes, both real, both reported by name:
    //   - a TOC still rendering outside the rail (relocation not done, or done
    //     without deleting the inline render);
    //   - more than one TOC anywhere (the two-copy defect, shipped).
    // Advisory until UI-18 lands: on production today this is 1 outside / 0
    // inside on two of the three articles, which is the honest pre-relocation
    // state and not a regression this item introduced. It is printed as
    // `R7-toc-…` and counted, so the day UI-18 merges the number moves without
    // anyone having to remember the rule.
    const rel = r.toc_relocation ?? { inRail: 0, anywhere: 0 };
    if (rel.anywhere > 1)
      note(
        r,
        'R7-toc-duplicated',
        `${rel.anywhere} article-toc nodes in the DOM (expected 0 or 1)`,
      );
    if (rel.anywhere > rel.inRail)
      note(
        r,
        'R7-toc-outside-rail',
        `${rel.anywhere - rel.inRail} article-toc outside [data-hk-rail] (UI-18 relocation pending)`,
      );

    // R8 — A BLOCK THAT RENDERS NOTHING IS NOT A BLOCK. Its wrapper still
    // exists, still matches every presence check above, and still costs a
    // `gap` in the rail's flex column. The first preview build shipped exactly
    // that: `toc h0` on mas-kahwin-ikut-negeri at every width, an empty
    // wrapper worth 56px of dead space between Rekod and Sumber, because
    // `<ArticleToc>` returns null below its heading floor while the React
    // ELEMENT holding it stays truthy. Presence was green; the page was wrong.
    for (const k of ['rekod', 'toc', 'sumber']) {
      const b = r[k];
      if (b && b.height === 0)
        note(r, 'R8-empty-block', `${k} is present but 0px tall — an empty wrapper, not a block`);
    }

    // R3 / R5 — the order, over whichever blocks are present. A missing block
    // is reported as missing and never silently reorders the rest.
    const present = ['rekod', 'toc', 'sumber'].filter((k) => r[k]);

    // Each block gets the assertion its data-dependency actually allows, and
    // none of them is silently skipped.
    //
    // `rekod` is unconditional — every article holds a category, an author and
    // a reviewed date, so an absent Rekod is always a defect.
    //
    // `toc` is required exactly when UI-18's floor says so: two or more `<h2>`
    // in the body. Asserted against the page's own heading count rather than
    // tolerated, so an article that SHOULD carry a contents list and does not
    // still fails.
    //
    // `sumber` cannot be asserted, and saying so is the honest half of this
    // check. `articles` has no sources column; the block is built from the
    // article's own `Sumber:` citations, and measured across all 86 sitemap
    // articles on 01 Sep 2026, 34 carry one and 52 carry none. On those 52
    // there is nothing true to put under the heading, and inventing one on a
    // site whose whole claim is that its numbers carry sources is the worst
    // outcome available. So its absence is REPORTED with the corpus figure
    // every time — loud, permanent, impossible to read as "fine" — and does
    // not fail the run. That is a CONTENT gap owned by the editorial seat, and
    // this item's DoD is not narrowed by naming it.
    if (!r.rekod) note(r, 'R3-rekod-missing', 'the Rekod panel is not in the rail');
    if (!r.toc && r.bodyH2 >= 2)
      note(
        r,
        'R3-toc-missing',
        `no contents list in the rail on an article with ${r.bodyH2} h2 (UI-18's floor is 2)`,
      );
    if (!r.sumber)
      observe(
        r,
        'R3-sumber-absent',
        `no Sumber block — this article carries no standalone "Sumber:" citation. Most ` +
          `articles carry none (79 of 92 on 02 Sep 2026; re-measure with \`pnpm ui:sources\`, ` +
          `never from this string); a CONTENT gap, not a layout one, never invented. That the ` +
          `heading is ABSENT rather than empty is enforced by ui-layout-gate check 14`,
      );
    for (let i = 1; i < present.length; i++) {
      const a = r[present[i - 1]];
      const b = r[present[i]];
      if (!(a.top <= b.top))
        note(
          r,
          desktop ? 'R3-order' : 'R5-reading-order',
          `${present[i - 1]}.top ${a.top} is below ${present[i]}.top ${b.top}`,
        );
    }

    // The reading measure, asserted only at the three widths the DoD names.
    if (MEASURE_WIDTHS.includes(r.width) && r.measure) {
      if (r.measure.cpl > MEASURE_MAX_CPL)
        note(
          r,
          'measure-too-wide',
          `${r.measure.cpl} cpl > ${MEASURE_MAX_CPL} (${r.measure.widthPx}px / ${r.measure.fontSizePx}px)`,
        );
      if (r.measure.cpl < MEASURE_MIN_CPL)
        note(
          r,
          'measure-too-narrow',
          `${r.measure.cpl} cpl < ${MEASURE_MIN_CPL} (${r.measure.widthPx}px / ${r.measure.fontSizePx}px)`,
        );
    }
  }

  // ── report ───────────────────────────────────────────────────────────────
  for (const r of rows) {
    const path = r.url.replace(/^https?:\/\/[^/]+/, '') || '/';
    if (r.error) {
      console.log(`\n${path} @${r.width}  ERROR  ${r.error}`);
      continue;
    }
    console.log(
      `\n${path} @${r.width}  (layout viewport ${r.layoutViewport}, innerWidth ${r.innerWidth})`,
    );
    const fmt = (n, b) =>
      b
        ? `${n.padEnd(8)} left ${String(b.left).padStart(7)}  right ${String(b.right).padStart(7)}  width ${String(b.width).padStart(7)}  top ${String(b.top).padStart(6)}  inner ${b.innerWidth}`
        : `${n.padEnd(8)} — absent`;
    console.log('  ' + fmt('body', r.bodyCol));
    console.log('  ' + fmt('rail', r.rail));
    console.log('  ' + fmt('rekod', r.rekod));
    console.log('  ' + fmt('toc', r.toc));
    console.log('  ' + fmt('sumber', r.sumber));
    if (r.rail && r.bodyCol)
      console.log(
        `  VERDICT rail.left ${r.rail.left} ${r.rail.left >= r.bodyCol.right ? '>=' : '<'} body.right ${r.bodyCol.right}   gap ${Math.round((r.rail.left - r.bodyCol.right) * 100) / 100}px`,
      );
    if (r.measure)
      console.log(
        `  measure ${r.measure.cpl} cpl  (${r.measure.widthPx}px / ${r.measure.fontSizePx}px, longest para ${r.measure.sampleChars} chars)`,
      );
    console.log(`  counts ${JSON.stringify(r.counts)}`);
    // Enumerated unconditionally — an absence above must be readable as a
    // wrong selector rather than as a missing feature.
    console.log('  candidates seen:');
    for (const c of r.candidates)
      console.log(
        `    ${String(c.how).padEnd(18)} ${c.tag}.${c.cls || '(no class)'}  left ${c.left} width ${c.width} top ${c.top} display ${c.display}`,
      );
  }

  console.log('\nbuild fingerprint (per target, last width measured):');
  const fp = new Map();
  for (const r of rows)
    if (r.provenance)
      fp.set(
        r.url,
        `HTTP ${r.provenance.status}  x-vercel-id ${r.provenance.vercelId}  cache ${r.provenance.cache}  age ${r.provenance.age}  css [${(r.provenance.css ?? []).join(' ')}]`,
      );
  for (const [k, v] of fp) console.log(`  ${k}\n    ${v}`);

  if (observed.length) {
    console.log(`\n${observed.length} observation(s) — reported, never fatal:`);
    for (const f of observed)
      console.log(
        `  ${f.code.padEnd(28)} ${f.url.replace(/^https?:\/\/[^/]+/, '')} @${f.width}  ${f.msg}`,
      );
  }

  console.log(`\n${fail.length} violation(s)`);
  for (const f of fail)
    console.log(
      `  ${f.code.padEnd(28)} ${f.url.replace(/^https?:\/\/[^/]+/, '')} @${f.width}  ${f.msg}`,
    );

  if (jsonOut) fs.writeFileSync(jsonOut, JSON.stringify({ rows, fail, observed }, null, 1));

  const code = hardError ? 2 : fail.length ? 1 : 0;
  console.log(`RAIL EXIT: ${code}`);
  process.exit(code);
}

run().catch((e) => {
  console.error(e);
  console.log('RAIL EXIT: 2');
  process.exit(2);
});
