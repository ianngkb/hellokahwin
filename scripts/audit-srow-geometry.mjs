/**
 * UI-01 gate — `.s-row` headline geometry at desktop.
 *
 *   pnpm audit:srow [base-url] [--width 1440] [--article /artikel/a/b] [--shot out.png]
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS MEASURES, AND WHY IT EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `.s-row` declares three tracks above 1024px — 44px number / flexible
 * headline / 176px thumbnail. Grid auto-placement fills the FIRST free track,
 * so a call site that renders only two children does not lose the number
 * track: it puts the HEADLINE in it. Measured on production 31 Ogos 2026, all
 * twelve homepage Terkini rows came back 44px wide and 225-307px tall, the
 * text clipped against the thumbnail. The article and catalogue templates,
 * which pass the number, measured ~412px wide and 78px tall on the same run.
 *
 * ── The numbers behind the thresholds, so nobody has to re-derive them ──
 *
 *     `.t` at desktop            21px / 27.3px line-height
 *     a CORRECT row              412 x 78   (headline wrapper, 2 lines)
 *     a DEFECTIVE row             44 x 225-307
 *     three lines                412 x 106
 *     four lines                 412 x ~131
 *     the row's own height       173px  = 132px thumbnail + 20px padding x2
 *     the thumbnail              132px
 *
 * The row is `align-items: start`, so its height is set by the THUMBNAIL, not
 * by the text. The headline wrapper is therefore free to grow to ~132px —
 * four lines — before it adds a single pixel to the row. That is the design
 * ceiling below, and it is why a 106px row is a threshold question rather
 * than a layout defect.
 *
 * All twelve of production's real Terkini titles render 2 lines at 412x78
 * inside the shipped grid: zero rows exceed 100px on the live corpus.
 *
 * ── The two checks, kept separate on purpose ──
 *
 * LAYOUT is this item's actual claim, and it is about the grid:
 *
 *     at least one row, and EVERY row has
 *       headline width  >= 350px   (a headline in the 44px track fails)
 *       headline height <= 100px   (a headline in the 44px track fails)
 *       a `.s-idx` present
 *
 * CONTENT is context, and it is about the database:
 *
 *     the homepage renders exactly 12 rows
 *
 * `rows.length === 12` is a claim about how many articles are PUBLISHED, not
 * about whether the grid is laid out correctly, and it holds only while at
 * least 13 articles exist. Bulk-unpublish something and it goes red while
 * pointing at a grid that renders perfectly. Both must be green to ship, but
 * a red has to say WHICH — testing a proxy for the thing you mean and then
 * reading the proxy's failure as the thing is the repeat failure this whole
 * gate is a response to.
 *
 * Two things this script refuses to let you get wrong:
 *
 *   1. It prints `matchMedia('(min-width:1024px)')` for every page and FAILS if
 *      it is false. `.s-idx` is `display:none` below 1024px and the mobile grid
 *      is two tracks for two children and is CORRECT — so a run taken at a
 *      mobile width measures a different, working component and reports a
 *      green that means nothing. That is the exact failure the first audit hit.
 *
 *   2. It measures an ARTICLE page as a negative control in the same run, and
 *      ASSERTS the control's first row still reads `01` in a 44x26-ish box —
 *      not merely that a `.s-idx` element exists. The article related-list has
 *      always rendered its number correctly. If a change repairs the homepage
 *      by breaking the shared `.s-row` rule — collapsing or restyling the
 *      number track while keeping the span — the homepage goes green and the
 *      control goes red. That is the only reason the homepage's green is worth
 *      anything, and a printout a human is expected to eyeball is not a gate.
 *
 * Requires playwright-core and the installed Chrome — deliberately NOT a
 * dependency of the app, same as `scripts/measure-page.mjs`. Install it out of
 * tree and point NODE_PATH at it, or `pnpm add -D playwright-core` locally and
 * do not commit the manifest change. Claude-in-Chrome is not connected in the
 * worktrees.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const base = (argv.find((a) => !a.startsWith('--')) ?? 'https://hellokahwin.com').replace(
  /\/$/,
  '',
);
const width = Number(opt('width', 1440));
const shot = opt('shot', null);

/** A headline placed in the 44px number track measures ~44 x 225-307. A
 *  headline in its own track measures ~412 x 78. These thresholds sit in the
 *  gap between those two populations, not near either edge. */
const MIN_HEADLINE_W = 350;
const MAX_HEADLINE_H = 100;

/** NOT asserted. The thumbnail is 132px and the row is `align-items: start`,
 *  so the headline wrapper can reach this height — four lines — before it
 *  makes the row any taller. A row between MAX_HEADLINE_H and here still
 *  fails the gate (100px is the DoD's number and holds on the live corpus),
 *  but it is a title that grew a line, not a broken grid, and the printed
 *  row says so. */
const DESIGN_CEILING_H = 132;

/** The control's number must read exactly this, in a box this size. */
const IDX_MIN_W = 40;
const IDX_MAX_W = 48;
const IDX_MAX_H = 40;

if (width < 1024) {
  console.error(
    `refusing to run at ${width}px: this gate measures the >=1024px layout, and ` +
      '`.s-idx` is display:none below it. Pass --width 1024 or wider.',
  );
  process.exit(1);
}

const pages = [
  { label: 'homepage', path: '/', expectRows: 12 },
  {
    label: 'article (control)',
    path: opt('article', '/artikel/idea-dan-nasihat/garden-wedding'),
    expectRows: null,
    assertFirstIndex: '01',
  },
];

/** Runs in the page. Returns one record per `.s-row`: how many children the
 *  row actually has, what the grid resolved to, and the measured box of the
 *  wrapper that holds the `.t` headline — the element the defect moves. */
function readRows() {
  return [...document.querySelectorAll('.s-row')].map((row, i) => {
    const idx = row.querySelector('.s-idx');
    const t = row.querySelector('.t');
    const wrap = t?.parentElement ?? null;
    const box = wrap?.getBoundingClientRect() ?? null;
    const idxBox = idx?.getBoundingClientRect() ?? null;
    return {
      n: i + 1,
      children: row.children.length,
      cols: getComputedStyle(row).gridTemplateColumns,
      rowH: Math.round(row.getBoundingClientRect().height),
      idx: idx?.textContent?.trim() ?? null,
      idxW: idxBox ? Math.round(idxBox.width) : null,
      idxH: idxBox ? Math.round(idxBox.height) : null,
      headW: box ? Math.round(box.width) : null,
      headH: box ? Math.round(box.height) : null,
      title: t?.textContent?.trim().slice(0, 44) ?? null,
    };
  });
}

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width, height: 1000 },
  deviceScaleFactor: 1,
});

/** Every failure lands in one of these buckets so the final line can say
 *  which kind of thing broke. */
const failed = { LAYOUT: [], CONTENT: [], CONTROL: [], RIG: [] };
const fail = (bucket, msg) => {
  failed[bucket].push(msg);
  console.log(`  !! [${bucket}] ${msg}`);
};

for (const p of pages) {
  const url = base + p.path;
  const page = await ctx.newPage();
  const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 60_000 });
  const desktop = await page.evaluate(() => matchMedia('(min-width:1024px)').matches);
  const rows = await page.evaluate(readRows);

  console.log(`\n=== ${p.label} — ${url} @ ${width}px ===`);
  console.log(`status: ${res?.status() ?? '—'}   (min-width:1024px) matches: ${desktop}`);
  if (!desktop)
    fail('RIG', 'viewport did not match (min-width:1024px) — measurement is meaningless');

  console.log(`rows: ${rows.length}`);
  console.log('   #  chld  idx  idx WxH   headline W x H   rowH   grid-template-columns');
  for (const r of rows) {
    const wideEnough = r.headW !== null && r.headW >= MIN_HEADLINE_W;
    const shortEnough = r.headH !== null && r.headH <= MAX_HEADLINE_H;
    const ok = wideEnough && shortEnough;
    // A row that is wide enough but taller than the DoD allows, while still
    // under the height at which the thumbnail stops setting the row height.
    const thresholdOnly =
      wideEnough && !shortEnough && r.headH !== null && r.headH <= DESIGN_CEILING_H;
    const note = thresholdOnly
      ? `  (over the ${MAX_HEADLINE_H}px DoD threshold, under the ${DESIGN_CEILING_H}px design ` +
        'ceiling — threshold question, not a layout defect)'
      : '';
    console.log(
      `  ${String(r.n).padStart(2)}  ${String(r.children).padStart(4)}  ` +
        `${String(r.idx ?? '—').padStart(3)}  ` +
        `${String(r.idxW ?? '—').padStart(3)}x${String(r.idxH ?? '—').padEnd(4)}  ` +
        `${String(r.headW ?? '—').padStart(5)} x ${String(r.headH ?? '—').padEnd(4)} ` +
        `${ok ? 'PASS' : thresholdOnly ? 'FAIL-DoD' : 'FAIL'}  ` +
        `${String(r.rowH).padStart(4)}  ${r.cols}   ${r.title}${note}`,
    );
  }

  // ── LAYOUT — the grid. This is the item's claim. ────────────────────────
  if (rows.length === 0) {
    fail('LAYOUT', `${p.label}: no \`.s-row\` on this page — nothing was measured`);
  }
  const badBox = rows.filter(
    (r) => r.headW === null || r.headW < MIN_HEADLINE_W || r.headH > MAX_HEADLINE_H,
  );
  const unnumbered = rows.filter((r) => r.idx === null);
  if (badBox.length) {
    fail(
      'LAYOUT',
      `${p.label}: ${badBox.length} row(s) outside the headline box ` +
        `[w >= ${MIN_HEADLINE_W}, h <= ${MAX_HEADLINE_H}]: ` +
        badBox.map((r) => `#${r.n} ${r.headW}x${r.headH}`).join(', '),
    );
  }
  if (unnumbered.length) {
    fail(
      'LAYOUT',
      `${p.label}: rows without a rank number: ${unnumbered.map((r) => r.n).join(', ')}`,
    );
  }
  console.log(
    `  LAYOUT : ${badBox.length === 0 && unnumbered.length === 0 && rows.length > 0 ? 'PASS' : 'FAIL'}` +
      `  — ${rows.length - badBox.length}/${rows.length} rows in the headline box, ` +
      `${rows.length - unnumbered.length}/${rows.length} numbered`,
  );

  // ── CONTENT — how many articles are published. Context, not layout. ─────
  if (p.expectRows !== null && p.expectRows !== undefined) {
    const okCount = rows.length === p.expectRows;
    if (!okCount) {
      fail(
        'CONTENT',
        `${p.label}: expected ${p.expectRows} rows, found ${rows.length} — this is a published-article ` +
          'count, not a grid defect; check the layout line above before touching CSS',
      );
    }
    console.log(
      `  CONTENT: ${okCount ? 'PASS' : 'FAIL'}  — ${rows.length} rows, expected ${p.expectRows}`,
    );
  }

  // ── CONTROL — the numbered variant must STILL render `01`. ──────────────
  if (p.assertFirstIndex) {
    const r = rows[0];
    const got = r
      ? `idx="${r.idx ?? '—'}" ${r.idxW ?? '—'}x${r.idxH ?? '—'}`
      : 'no rows on the control page';
    const okCtl =
      !!r &&
      r.idx === p.assertFirstIndex &&
      r.idxW !== null &&
      r.idxW >= IDX_MIN_W &&
      r.idxW <= IDX_MAX_W &&
      r.idxH !== null &&
      r.idxH <= IDX_MAX_H;
    console.log(
      `  CONTROL: ${okCtl ? 'PASS' : 'FAIL'}  — asserted first row idx="${p.assertFirstIndex}" ` +
        `w ${IDX_MIN_W}-${IDX_MAX_W}px, h <= ${IDX_MAX_H}px; got ${got}`,
    );
    if (!okCtl) {
      fail(
        'CONTROL',
        `${p.label}: the numbered variant no longer renders "${p.assertFirstIndex}" in a ` +
          `${IDX_MIN_W}-${IDX_MAX_W} x <=${IDX_MAX_H} box; got ${got}`,
      );
    }
  }

  // Clipped to the rows themselves, never the viewport: a viewport shot of this
  // page is the hero, which is not what the gate is about and would let a
  // "before/after screenshot" show nothing that changed.
  if (shot && rows.length) {
    const clip = await page.evaluate(() => {
      const boxes = [...document.querySelectorAll('.s-row')].map((r) => r.getBoundingClientRect());
      const top = Math.min(...boxes.map((b) => b.top)) + scrollY;
      const left = Math.min(...boxes.map((b) => b.left)) + scrollX;
      return {
        x: Math.max(0, left - 16),
        y: Math.max(0, top - 16),
        width: Math.max(...boxes.map((b) => b.right)) + scrollX - left + 32,
        height: Math.max(...boxes.map((b) => b.bottom)) + scrollY - top + 32,
      };
    });
    await page.screenshot({
      path: shot.replace(/\.png$/, `-${p.label.split(' ')[0]}.png`),
      fullPage: true,
      clip,
    });
  }
  await page.close();
}

await browser.close();

const order = ['LAYOUT', 'CONTENT', 'CONTROL', 'RIG'];
const total = order.reduce((n, k) => n + failed[k].length, 0);
console.log('\n─────────────────────────────────────────────────────────────');
for (const k of order) {
  console.log(
    `  ${k.padEnd(7)}: ${failed[k].length === 0 ? 'PASS' : `FAIL (${failed[k].length})`}`,
  );
}
console.log(
  `GATE: ${total === 0 ? 'PASS' : `FAIL — ${order.filter((k) => failed[k].length).join(', ')}`}` +
    `  [headline width >= ${MIN_HEADLINE_W}px, height <= ${MAX_HEADLINE_H}px, every row numbered;` +
    ` control renders 01]`,
);
process.exit(total === 0 ? 0 : 1);
