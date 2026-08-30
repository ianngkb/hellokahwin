/**
 * UILINT — the rendered-layout regression gate.
 *
 *   pnpm ui:gate --fixtures                 # the committed pre-fix fixtures (known-bad)
 *   pnpm ui:gate --fixtures --green         # the same fixtures + the green-control override
 *   pnpm ui:gate --base https://hellokahwin.com
 *   pnpm ui:gate --url https://…/artikel --url https://…/brand
 *   pnpm ui:gate:selftest                   # asserts the gate fires AND clears (CI)
 *
 * Prints `UILINT EXIT: <n>` at the start of a line and exits with that code.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * On 31 Aug 2026 all 12 homepage cards rendered their headline in a 44-pixel
 * column, 225–307px tall, one word per line. Every automated check this company
 * owns was green, because every one of them compares STRUCTURE: the DOM was
 * valid, the HTML diffed clean, every element was present, the page threw no
 * error. Sprint 03's retrospective had already written the sentence — "NO
 * AUTOMATED CHECK IN THIS COMPANY COMPARES A COMPUTED COLOUR OR A CONTRAST
 * RATIO" — and one sprint later the same class of defect shipped to the front
 * page and stayed there.
 *
 * A 44px column is a COMPUTED LAYOUT VALUE. You cannot grep for it. It does not
 * exist until CSS is applied at >= 1024px. So this script does the one thing
 * nothing else here does: it loads the real pages in a real browser at real
 * widths and asserts numbers.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SIX CHECKS, AND THE RULE EACH ONE ACTUALLY APPLIES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * 1. NARROW TEXT COLUMN — no text column narrower than 120px.
 *
 *    A single line of text in a 44px box is a LABEL (a rank number, a badge, a
 *    date). Text that WRAPS in a 44px box is a column, and a 44px column is
 *    broken. So the rule is: text that occupies >= 2 line boxes, whose block
 *    container's content width is < 120px.
 *
 *    That two-line clause is the whole discriminator and it is load-bearing.
 *    The `.s-row` component's first cell is a 44px-wide rank number — `01` —
 *    and it is CORRECT. The article page renders it and must stay green; the
 *    homepage omitted the number, CSS Grid auto-placed the HEADLINE into the
 *    number's 44px slot, and it wrapped to nine lines. Measured on the
 *    committed fixtures: 13 violations on homepage.html at 1024/1440,
 *    ZERO on article.html at every width.
 *
 * 2. VIEWPORT OVERFLOW — nothing painted past the right edge of the viewport.
 *
 *    The nearest ancestor that decides the fate of the overflow answers the
 *    question. If it CLIPS (`overflow-x: hidden|clip`) and sits inside the
 *    viewport, nothing is painted past the edge and this check says nothing —
 *    losing that text is a real defect, and it is check 5's, reported in pixels
 *    lost. If it SCROLLS (`auto|scroll`) and sits inside the viewport, the
 *    overflow is exempt below 1024px, because a swipeable rail is a legitimate
 *    mobile pattern and the content is reachable. At >= 1024px it is not
 *    exempt: a mouse user has no swipe, this site hides the scrollbar
 *    (`scrollbar-width:none`), and that is exactly how `Venue, Kos &
 *    Perancangan` — which contains the site's third-best-converting article —
 *    became invisible on desktop.
 *
 * 3. IMAGE UPSCALE — no image painted at more than 1.1x its decoded pixels.
 *
 *    Scale is measured the way the browser paints it: `cover` and `fill` take
 *    the larger of the two axis factors, `contain` the smaller. Contexts run at
 *    deviceScaleFactor 1 so a CSS pixel is a device pixel and the ratio means
 *    what it says.
 *
 * 4. ASPECT DEVIATION — rendered aspect within 25% of the decoded source's.
 *
 *    The homepage hero on 31 Aug: a 1200x1800 PORTRAIT source painted into a
 *    landscape frame, 28% of the photograph visible. "Source" here means the
 *    variant the browser actually decoded, not the original upload — that is
 *    the honest comparison, and on this site it is also the useful one, because
 *    the hero's `srcset` carries a purpose-built 4.3:1 desktop crop that the
 *    `sizes` attribute never selects.
 *
 * 5. CLIPPED TEXT — no string truncated by its own box.
 *
 *    Not one of the four the item specified; added because UI-04's rendered
 *    audit, run the same day, found two defects of exactly this shape and
 *    neither is reachable by any structural check. Scoped to the truncation
 *    idiom (`text-overflow: ellipsis`, or `overflow-x: hidden|clip` with
 *    `white-space: nowrap`) so that clipping wrappers and deliberate vertical
 *    line-clamps stay out of it.
 *
 * 6. READING MEASURE — no column of continuous prose past 75 characters.
 *
 *    Counted with the DoD's own formula, `width / (font-size * 0.5)`, on the
 *    BLOCK the text is laid out in, and only for a run of >= 80 characters that
 *    occupies >= 2 line boxes. A CEILING with no floor: 45 is the bottom of the
 *    comfortable band but a 390px phone leaves a 350px column, about 41
 *    characters, which no cap can widen — a floor would fire on every mobile
 *    page and be switched off within a week. Columns too narrow are check 1's.
 *
 *    On the committed fixtures the pre-fix article fires 3x at 768 and 3x at
 *    1440 (the body at 888px/17px = 104.5) and is silent at 390 and at 1024,
 *    where 632px/17px = 74.4 sits under the ceiling. homepage.html and
 *    category.html are silent at all four widths: cards and labels are not
 *    prose.
 *
 * THE PRECONDITION, added by UI-08: every target must prove it IS this site
 * before a single check runs — same final origin as the URL we asked for, and
 * <html lang="ms">. Pointed at a protected Vercel preview, this gate used to
 * print `0 violation(s)` at three widths over vercel.com's login page: a
 * well-formed 200 with no clipped text, no narrow columns and no images. The
 * fingerprint below already showed eight Vercel-hashed stylesheets instead of
 * our three, but nothing asserted on it. Failing this is an ERROR (exit 2),
 * never a clean run.
 *
 * DELIBERATELY NOT HERE, and named rather than left silent: tap targets under
 * 24x24 (UI-11) and missing `:focus-visible` indicators (UI-09). Both are WCAG
 * conformance and want a different report shape. Each is a real open finding
 * owned by its own item.
 *
 * Line length past ~75 characters WAS on that list, excused as "a measure the
 * creative director sets, not a defect threshold". UI-10 set it the same day,
 * which turned the excuse into a gap. It is now CHECK 6.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT THIS GATE WILL NOT REPORT, BECAUSE MEASUREMENT KILLED IT FIRST
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The 31 Aug audit formed five findings and then disproved them. Two of the
 * five would have sent someone to fix something that was working. They are
 * designed out of this file, not filtered afterwards:
 *
 *   - An image below the fold reports `naturalWidth: 0` because it has not
 *     loaded. It is NOT broken. Every page is scrolled end to end and given
 *     time to decode; anything still at 0 is counted and PRINTED as skipped,
 *     and can never become a violation.
 *   - Empty `alt` on a card thumbnail inside a link that already carries the
 *     headline is CORRECT. There is no alt check here.
 *   - A centred `h1` sharing its left edge with left-aligned body text is
 *     deliberate. There is no alignment check here.
 *   - `order: 3` on the `.s-row` image was never the bug; computed style put
 *     the image in column 3 already. There is no `order` check here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * TWO TEMPLATES THIS GATE DOES NOT COVER, AND WHY — READ BEFORE TRUSTING IT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   - `/[slug]` never renders. It is the legacy WordPress resolver and 301s.
 *   - `/artikel/author/[slug]` has no reachable instance. Measured 31 Aug 2026:
 *     no page on the site links to an author archive, articles carry
 *     `"author": {"@type":"Organization"}` rather than a person, and four
 *     probed slugs all 404. Pass `--author-slug <slug>` the day one exists;
 *     until then the gate PRINTS the gap rather than hiding it.
 *
 * Requires playwright-core and the installed Chrome — deliberately not a
 * dependency of the app, same arrangement as `scripts/measure-page.mjs`.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const FIXTURES_ROOT = path.join(REPO, 'tests', 'ui-layout-gate', 'fixtures');
const FIXTURE_DIR = path.join(FIXTURES_ROOT, '2026-08-31-pre-ui-fix');
const GREEN_CSS = path.join(FIXTURES_ROOT, 'green-control.css');

const CHROME =
  process.env.UI_GATE_CHROME ??
  (process.platform === 'win32'
    ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
    : '/usr/bin/google-chrome');

// The four widths are not negotiable and not a flag: 390 (iPhone 12/13/14, the
// audience's phone), 768 (tablet / the site's own breakpoint), 1024 (the exact
// breakpoint the 44px bug lives behind — a gate that skipped it would have
// missed the defect it was built for), 1440 (laptop).
const WIDTHS = [390, 768, 1024, 1440];

const MIN_TEXT_COLUMN_PX = 120;
const MAX_UPSCALE = 1.1;
const MAX_ASPECT_DEVIATION = 0.25;
const DESKTOP_BREAKPOINT = 1024;
// UI-10. A CEILING only, never a floor. Reading research puts the comfortable
// band at 45-75 characters, but the floor is unreachable on a phone by
// arithmetic rather than by design: a 390px viewport leaves a 350px column,
// which at any legible type size is about 41 characters. A floor here would
// fire on every mobile page on the site and be switched off within a week.
// Columns too NARROW to read are already caught by `narrow-text-column`.
// Characters are counted with the DoD's own formula, `width / (font-size *
// 0.5)`. That 0.5em is an assumption: measured through canvas `measureText`
// over 6,000 characters of the garden-wedding article's own Malay prose in its
// own rendered face on 31 Ogos 2026, the true average advance is 0.4636em, so
// this formula UNDER-reports by about 8% — 75 by the formula is 81 in fact.
// The threshold stays at the DoD's number and the bias is stated rather than
// silently corrected, because the DoD is the contract; the design target
// `--measure-prose` sits at 66, which is where the headroom comes from.
const MAX_MEASURE_CPL = 75;
// Below this many characters a wrapped run is a headline, a label or a caption,
// not continuous prose, and its column width is a composition decision rather
// than a reading measure.
const MIN_PROSE_CHARS = 80;
// Every public template on this site renders <html lang="ms">. Used as an
// identity marker, not a content check — see "IS THIS EVEN OUR PAGE?" below.
const SITE_LANG = 'ms';

// ── the public template manifest ────────────────────────────────────────────
// Every public template, with a real instance of each. Slugs are checked into
// the repo on purpose: a manifest that discovers its own targets can silently
// discover none and report a green run over an empty set.
const TEMPLATES = [
  { template: 'homepage', path: '/' },
  { template: 'catalogue index', path: '/artikel' },
  { template: 'category archive', path: '/artikel/hantaran-mas-kahwin' },
  { template: 'article', path: '/artikel/idea-dan-nasihat/garden-wedding' },
  // One instance per template is not a manifest, it is a sample — UI-08.
  // The defect UI-08 fixed was CONTENT-LENGTH DEPENDENT: the same breadcrumb
  // component hid 132px of the title above and 303px of another article's,
  // and no structural difference between the two pages existed to find. A
  // template's worst case lives in its longest string, so the article
  // template carries a second, deliberately extreme instance.
  //
  // Chosen by measurement, not by eye: every one of the 86 article URLs in
  // sitemap.xml was fetched on 31 Ogos 2026 and its <h1> counted. This is the
  // longest at 95 characters; garden-wedding above is 48, so the manifest had
  // been exercising roughly half the string the template must survive.
  // Re-measure when the corpus grows — the command is in this item's
  // work-done entry, and a stale "longest" silently becomes an ordinary one.
  {
    template: 'article (longest title on the site, 95 chars)',
    path: '/artikel/fotografi-videografi/lokasi-pre-wedding-photoshoot-terbaik',
  },
  { template: 'tag archive', path: '/artikel/tag/hantaran' },
  { template: 'brand page', path: '/brand' },
];

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (has(n) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const many = (n) => argv.reduce((a, v, i) => (v === `--${n}` ? [...a, argv[i + 1]] : a), []);

// ═══════════════════════════════════════════════════════════════════════════
// The in-page measurement. Everything below `collect` runs inside Chrome.
// ═══════════════════════════════════════════════════════════════════════════
function collect(limits) {
  const {
    MIN_TEXT_COLUMN_PX,
    MAX_UPSCALE,
    MAX_ASPECT_DEVIATION,
    DESKTOP_BREAKPOINT,
    MAX_MEASURE_CPL,
    MIN_PROSE_CHARS,
  } = limits;
  const vw = window.innerWidth;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'META', 'LINK']);
  const violations = [];
  const notes = { imagesTotal: 0, imagesNotDecoded: 0, imagesSkippedZeroBox: 0, textRuns: 0 };

  const sel = (el) => {
    const bits = [];
    let n = el;
    while (n && n.nodeType === 1 && n.tagName !== 'BODY' && bits.length < 4) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (typeof n.className === 'string' && n.className.trim())
        s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.');
      bits.unshift(s);
      n = n.parentElement;
    }
    return bits.join(' > ');
  };

  // Visually-hidden text is NOT a layout defect, and it does not announce
  // itself through display/visibility/opacity. Tailwind's `sr-only` is a 1x1
  // absolutely-positioned box with `clip-path: inset(50%)`; the older idiom is
  // `clip: rect(0,0,0,0)`. The catalogue page's `h1.sr-only` — a screen-reader
  // heading in a 1x1 box — was the gate's first false positive, on its first
  // run against production, and it is exactly the noise that gets a gate
  // switched off. The threshold was not touched; the visibility test was.
  const srOnly = (el, cs) => {
    if (/inset\(\s*(5[0-9]|[6-9][0-9]|100)%/.test(cs.clipPath)) return true;
    if (/^rect\((0px,?\s*){4}\)?$/.test(cs.clip.replace(/\s+/g, ' ').trim())) return true;
    if (cs.overflow === 'hidden') {
      const r = el.getBoundingClientRect();
      if (r.width <= 1 && r.height <= 1) return true;
    }
    return false;
  };

  const visible = (el) => {
    let n = el;
    while (n && n.nodeType === 1) {
      if (n.hasAttribute('hidden') || n.getAttribute('aria-hidden') === 'true') return false;
      const cs = getComputedStyle(n);
      if (cs.display === 'none' || cs.visibility === 'hidden' || cs.opacity === '0') return false;
      if (srOnly(n, cs)) return false;
      n = n.parentElement;
    }
    return true;
  };

  const contentWidth = (el) => {
    const cs = getComputedStyle(el);
    return (
      el.getBoundingClientRect().width -
      parseFloat(cs.paddingLeft || 0) -
      parseFloat(cs.paddingRight || 0) -
      parseFloat(cs.borderLeftWidth || 0) -
      parseFloat(cs.borderRightWidth || 0)
    );
  };

  // The box a text run is actually laid out in. An inline <span> that wraps has
  // a bounding rect as wide as the line, which would hide a narrow column, so
  // walk out to the nearest block-ish container.
  const BLOCKISH = new Set([
    'block',
    'flex',
    'grid',
    'list-item',
    'table-cell',
    'flow-root',
    'inline-block',
    'inline-flex',
    'inline-grid',
  ]);
  const blockContainer = (el) => {
    let n = el;
    while (n && n !== document.body) {
      if (BLOCKISH.has(getComputedStyle(n).display)) return n;
      n = n.parentElement;
    }
    return document.body;
  };

  // ── CHECK 1: narrow text column ──────────────────────────────────────────
  {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = t.nodeValue.replace(/\s+/g, ' ').trim();
      if (!text) continue;
      const parent = t.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
      if (!visible(parent)) continue;
      notes.textRuns++;

      const range = document.createRange();
      range.selectNodeContents(t);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      // Distinct line boxes, keyed on their top edge. One line = a label.
      const lines = new Set(rects.map((r) => Math.round(r.top))).size;
      if (lines < 2) continue;

      const box = blockContainer(parent);
      const width = contentWidth(box);
      if (width >= MIN_TEXT_COLUMN_PX) continue;

      const key = sel(box) + '|' + text.slice(0, 30);
      if (seen.has(key)) continue;
      seen.add(key);
      const r = box.getBoundingClientRect();
      violations.push({
        check: 'narrow-text-column',
        selector: sel(box),
        detail: `${width.toFixed(1)}px column, ${lines} lines, box ${r.width.toFixed(0)}x${r.height.toFixed(0)}px (floor ${MIN_TEXT_COLUMN_PX}px)`,
        sample: text.slice(0, 60),
        value: +width.toFixed(1),
      });
    }
  }

  // ── CHECK 5: clipped text ────────────────────────────────────────────────
  // Not in the original four. Added because UI-04's rendered audit found two
  // defects of exactly this shape on the same day, and neither is visible to
  // any structural check: a category label on /artikel needing 181px in a 171px
  // box, so `HANTARAN & MAS KAHWIN` renders as `HANTARAN & MAS KAH…`; and a
  // photo credit in a fixed 200px box throwing away 60% of its own text at
  // 1440px, which is a rights problem wearing a layout costume.
  //
  // Scoped to the truncation idiom exactly — `text-overflow: ellipsis`, or
  // `overflow-x: hidden|clip` together with `white-space: nowrap` — so a
  // clipping wrapper that happens to contain a wide child is not swept in, and
  // a deliberate vertical line-clamp is left alone. A scrollable box is never
  // reported: its text is reachable.
  //
  // The first version of this check required the clipping element to hold the
  // text as a DIRECT child, and reported zero on /artikel where UI-04 had just
  // measured nine clipped labels: the label is a `<p class="truncate">` wrapping
  // an `<a>`, so the text sits one node deeper. The absence was a property of
  // the condition, not of the page — the exact error the standing rule warns
  // about — and it surfaced only because the check was run against a defect
  // somebody had already measured by hand.
  {
    const candidates = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      if (!(el.textContent || '').trim()) continue;
      const cs = getComputedStyle(el);
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') continue;
      const truncating =
        cs.textOverflow === 'ellipsis' ||
        ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') &&
          cs.whiteSpace.startsWith('nowrap'));
      if (!truncating) continue;
      if (el.scrollWidth - el.clientWidth <= 1) continue;
      if (!visible(el)) continue;
      candidates.push(el);
    }
    // Innermost only: a truncating box inside a truncating box is one defect.
    // Identical labels in a grid collapse to one entry with a COUNT rather than
    // vanishing into a dedupe — /artikel clips the same string in nine cards,
    // and a report that said "1" would understate a defect by nine times.
    const byKey = new Map();
    for (const el of candidates) {
      if (candidates.some((other) => other !== el && el.contains(other))) continue;
      const hidden = el.scrollWidth - el.clientWidth;
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const key = sel(el) + '|' + text.slice(0, 40) + '|' + hidden;
      const existing = byKey.get(key);
      if (existing) {
        existing.occurrences++;
        existing.detail = existing.baseDetail + `, in ${existing.occurrences} places`;
        continue;
      }
      const baseDetail = `${hidden}px of text hidden — needs ${el.scrollWidth}px, box is ${el.clientWidth}px (${((hidden / el.scrollWidth) * 100).toFixed(0)}% of the string)`;
      const v = {
        check: 'clipped-text',
        selector: sel(el),
        detail: baseDetail,
        baseDetail,
        occurrences: 1,
        sample: text.slice(0, 60),
        value: hidden,
      };
      byKey.set(key, v);
      violations.push(v);
    }
  }

  // ── CHECK 6: reading measure ─────────────────────────────────────────────
  // UI-10. This gate's header used to name line length as DELIBERATELY NOT
  // HERE, on the ground that it is "a measure the creative director sets, not a
  // defect threshold". That was true on the morning of 31 Ogos 2026 and false
  // by that evening: the creative director set it the same day, so the band
  // stopped being an opinion and became a number a check can hold.
  //
  // What it would have caught: the article body ran 888px at 17px at 1440 and
  // 1144px at 1920 — 104 and 135 characters per line against a 45-75 band —
  // through four shipped items that week, because nothing on the page is
  // broken, clipped, overflowing or upscaled. Every other check in this file
  // looks for a BREAKAGE. This one looks for a page working exactly as built
  // and still hard to read, which is the whole class of defect a structural
  // gate cannot see.
  //
  // Measured on the BLOCK the text is laid out in, not on the text run: the
  // column constrains every line in it, so a run that happens to end early
  // still belongs to a 104-character column. That is also why two line boxes
  // are enough — wrapping is the proof that the column, not the sentence, set
  // the line.
  {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const seen = new Set();
    for (let t = walker.nextNode(); t; t = walker.nextNode()) {
      const text = t.nodeValue.replace(/\s+/g, ' ').trim();
      if (text.length < MIN_PROSE_CHARS) continue;
      const parent = t.parentElement;
      if (!parent || SKIP_TAGS.has(parent.tagName)) continue;
      if (!visible(parent)) continue;

      const range = document.createRange();
      range.selectNodeContents(t);
      const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
      if (rects.length === 0) continue;
      if (new Set(rects.map((r) => Math.round(r.top))).size < 2) continue;

      const box = blockContainer(parent);
      const width = contentWidth(box);
      const fontSize = parseFloat(getComputedStyle(parent).fontSize);
      if (!(fontSize > 0)) continue;
      const cpl = width / (fontSize * 0.5);
      if (cpl <= MAX_MEASURE_CPL) continue;

      const key = sel(box);
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push({
        check: 'reading-measure',
        selector: sel(box),
        detail: `${cpl.toFixed(1)} characters per line — ${width.toFixed(0)}px column at ${fontSize.toFixed(1)}px (ceiling ${MAX_MEASURE_CPL})`,
        sample: text.slice(0, 60),
        value: +cpl.toFixed(1),
      });
    }
  }

  // ── CHECK 2: viewport overflow ───────────────────────────────────────────
  {
    const offenders = [];
    for (const el of document.body.querySelectorAll('*')) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (r.right <= vw + 0.5) continue;
      if (!visible(el)) continue;

      // Walk out to the first ancestor that decides what happens to the
      // overflow, and let that ancestor answer the question.
      let clippedAway = false;
      let inRail = false;
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        const ox = getComputedStyle(n).overflowX;
        if (ox !== 'hidden' && ox !== 'clip' && ox !== 'auto' && ox !== 'scroll') continue;
        if (n.getBoundingClientRect().right > vw + 0.5) break; // the ancestor overflows too
        if (ox === 'hidden' || ox === 'clip') clippedAway = true;
        else inRail = true;
        break;
      }
      // An element an ancestor clips is not painted past the viewport edge, at
      // any width. The first version treated `hidden|clip` as never exempt,
      // conflating two different defects, and CI caught it on Linux: a 408px
      // inline <a> inside a 120px `overflow:hidden` box reported as 30px past a
      // 390px viewport while being entirely invisible there. Windows text
      // metrics made the same element 38px narrower, so it passed locally.
      // Losing that text IS a defect — it is what the clipped-text check
      // reports, with the number of pixels lost.
      if (clippedAway) continue;
      // A contained horizontal rail is a legitimate mobile pattern: swipe
      // reaches it. A mouse does not, so at desktop widths it still fails.
      if (inRail && vw < DESKTOP_BREAKPOINT) continue;
      offenders.push({ el, r });
    }
    // Collapse the subtree: keep the outermost offender of each chain, plus any
    // offender that carries its own text (which is what names the lost content).
    const set = new Set(offenders.map((o) => o.el));
    for (const { el, r } of offenders) {
      let anc = el.parentElement,
        nested = false;
      while (anc) {
        if (set.has(anc)) {
          nested = true;
          break;
        }
        anc = anc.parentElement;
      }
      const ownText = [...el.childNodes].some(
        (n) => n.nodeType === 3 && n.nodeValue.trim().length > 0,
      );
      if (nested && !ownText) continue;
      violations.push({
        check: 'viewport-overflow',
        selector: sel(el),
        detail: `right edge ${r.right.toFixed(1)}px in a ${vw}px viewport (element ${r.width.toFixed(1)}px wide, ${(r.right - vw).toFixed(1)}px past)`,
        sample: (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60),
        value: +r.right.toFixed(1),
      });
    }
  }

  // ── CHECKS 3 & 4: image scale and aspect ─────────────────────────────────
  for (const img of document.querySelectorAll('img')) {
    notes.imagesTotal++;
    const r = img.getBoundingClientRect();
    if (r.width <= 0 || r.height <= 0) {
      notes.imagesSkippedZeroBox++;
      continue;
    }
    if (!visible(img)) continue;
    const src = img.currentSrc || img.src || '';
    if (/\.svg(\?|$)/i.test(src)) continue; // vector: no intrinsic raster to upscale
    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
      // NOT a defect. A below-the-fold lazy image reports 0 and reports it
      // honestly. Counted and printed; never a violation. (31 Aug audit, §3.)
      notes.imagesNotDecoded++;
      continue;
    }

    const fit = getComputedStyle(img).objectFit;
    const sx = r.width / img.naturalWidth;
    const sy = r.height / img.naturalHeight;
    const scale = fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy);
    if (scale > MAX_UPSCALE) {
      violations.push({
        check: 'image-upscale',
        selector: sel(img),
        detail: `${scale.toFixed(2)}x — ${img.naturalWidth}x${img.naturalHeight} decoded, painted ${r.width.toFixed(0)}x${r.height.toFixed(0)} (object-fit: ${fit}, ceiling ${MAX_UPSCALE}x)`,
        sample: src.slice(-64),
        value: +scale.toFixed(3),
      });
    }

    const sourceAspect = img.naturalWidth / img.naturalHeight;
    const renderedAspect = r.width / r.height;
    const dev = Math.abs(renderedAspect - sourceAspect) / sourceAspect;
    if (dev > MAX_ASPECT_DEVIATION) {
      const visibleFraction =
        Math.min(sourceAspect, renderedAspect) / Math.max(sourceAspect, renderedAspect);
      violations.push({
        check: 'image-aspect',
        selector: sel(img),
        detail: `${(dev * 100).toFixed(0)}% off — source ${sourceAspect.toFixed(2)}:1 (${img.naturalWidth}x${img.naturalHeight}), painted ${renderedAspect.toFixed(2)}:1 (${r.width.toFixed(0)}x${r.height.toFixed(0)}), ~${(visibleFraction * 100).toFixed(0)}% of the frame kept (ceiling ${MAX_ASPECT_DEVIATION * 100}%)`,
        sample: src.slice(-64),
        value: +dev.toFixed(3),
      });
    }
  }

  return { vw, violations, notes, documentScrollWidth: document.documentElement.scrollWidth };
}

// ═══════════════════════════════════════════════════════════════════════════
// Fixture server — serves the committed pre-fix capture over http:// so its
// root-relative /_next/… URLs resolve, with the pre-fix CSS and fonts vendored
// beside the HTML. The HTML files are byte-identical to the CEO's capture
// (sha256 recorded in the fixture README); nothing is rewritten on disk. In
// --green mode one extra stylesheet is injected, and only then.
// ═══════════════════════════════════════════════════════════════════════════
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.woff2': 'font/woff2',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

function startFixtureServer(green, root = FIXTURE_DIR) {
  const server = http.createServer((req, res) => {
    const clean = decodeURIComponent(req.url.split('?')[0]);
    const file = path.join(root, clean);
    if (!file.startsWith(root)) {
      res.writeHead(403).end();
      return;
    }
    if (fs.existsSync(file) && fs.statSync(file).isFile()) {
      const ext = path.extname(file);
      if (ext === '.html') {
        let html = fs.readFileSync(file, 'utf8');
        if (green)
          html = html.replace(
            '</head>',
            `<style>${fs.readFileSync(GREEN_CSS, 'utf8')}</style></head>`,
          );
        res.writeHead(200, { 'content-type': MIME['.html'] }).end(html);
        return;
      }
      res.writeHead(200, { 'content-type': MIME[ext] ?? 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
      return;
    }
    // The capture's JS chunks are deliberately NOT vendored: these pages are
    // server-rendered and hydration would only add nondeterminism. An empty 200
    // keeps the console clean and the run reproducible.
    res.writeHead(200, { 'content-type': 'text/javascript' }).end('');
  });
  return new Promise((r) => server.listen(0, '127.0.0.1', () => r(server)));
}

// ═══════════════════════════════════════════════════════════════════════════
async function measure(targets, { json, label }) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const rows = [];
  for (const t of targets) {
    for (const width of WIDTHS) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1, // CSS px == device px, so upscale ratios mean what they say
        // A Vercel PREVIEW deployment is behind team SSO: an unauthenticated
        // GET is a 302 to vercel.com/sso-api and the gate would measure the
        // login page, which has no `.s-row`, no article body and no images —
        // i.e. it reports a clean run over nothing. UI-10 hit exactly that, and
        // only noticed because `.inspire-prose` came back null. Without this
        // the gate can only run AFTER a deploy reaches production, which is the
        // wrong side of the ship. Secret from the vault key
        // `vercelbypass.hellokahwin`; it never reaches a command line.
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
      try {
        const resp = await page.goto(t.url, { waitUntil: 'load', timeout: 60000 });
        if (resp && resp.status() >= 400) error = `HTTP ${resp.status()}`;
        // ── IS THIS EVEN OUR PAGE? ──────────────────────────────────────────
        // Added by UI-08, 31 Ogos 2026, after this gate was pointed at a Vercel
        // PREVIEW deployment and printed `0 violation(s)` at three widths. The
        // preview has deployment protection on: every request 302s to
        // vercel.com/login, which answers 200 with a valid, well-formed HTML
        // document containing no clipped text, no narrow columns and no
        // images. A green run over somebody else's login page.
        //
        // The sprint's own standing rule is "A STATUS CODE IS NOT EVIDENCE",
        // and this gate was the thing enforcing it everywhere except on
        // itself. The build fingerprint below already showed the tell — eight
        // stylesheets with Vercel's hash format instead of our three — but
        // nothing ASSERTED on it, and a number nobody compares is decoration.
        //
        // Two independent markers, both cheap, both absent from any foreign
        // document: the final origin must be the origin we asked for (the
        // login redirect leaves it), and <html lang> must be `ms` (every
        // public template on this site sets it; the login page is `en-US`).
        // A legitimate preview deployment passes both, so this rejects the
        // protection wall without rejecting previews.
        //
        // UI-10 arrived at the same wall from the other side, half an hour
        // apart, and this is UI-08's version because two markers beat one. What
        // survives from UI-10's is the way THROUGH rather than the detection:
        // `UI_GATE_BYPASS` above sends Vercel's protection-bypass secret (vault
        // key `vercelbypass.hellokahwin`), so a protected preview can actually
        // be gated BEFORE it ships instead of only being recognised as
        // ungateable. Detection without a way past it still leaves this gate
        // running only on the far side of a deploy.
        if (!error) {
          const id = await page.evaluate(() => ({
            origin: location.origin,
            href: location.href,
            lang: document.documentElement.lang,
          }));
          const want = new URL(t.url).origin;
          if (id.origin !== want)
            error = `NOT THIS SITE — asked ${want}, got ${id.origin} (${id.href})`;
          else if (id.lang !== SITE_LANG)
            error = `NOT THIS SITE — <html lang="${id.lang}">, expected "${SITE_LANG}"`;
        }
        // Provenance, because a layout result belongs to a BUILD, not to a URL.
        // Two runs 12 minutes apart on 31 Aug 2026 disagreed about the nav on
        // three pages; the reason was a deploy landing mid-run and the edge
        // serving a mix of old and new HTML. Without these headers that reads
        // as a flaky gate, which is how a real result gets dismissed.
        const h = resp ? resp.headers() : {};
        provenance = {
          status: resp?.status() ?? null,
          vercelId: h['x-vercel-id'] ?? null,
          cache: h['x-vercel-cache'] ?? null,
          age: h['age'] ?? null,
        };
        // Scroll the whole page so lazy images decode. Without this every
        // below-the-fold image reports naturalWidth 0 and checks 3 and 4 would
        // quietly measure nothing at all.
        await page.evaluate(async () => {
          const step = Math.round(window.innerHeight * 0.8);
          for (let y = 0; y < document.body.scrollHeight; y += step) {
            window.scrollTo(0, y);
            await new Promise((r) => setTimeout(r, 60));
          }
          window.scrollTo(0, 0);
        });
        await page
          .waitForFunction(() => [...document.images].every((i) => i.complete), { timeout: 15000 })
          .catch(() => {});
        await page.waitForTimeout(400);
      } catch (e) {
        error = e.message.split('\n')[0];
      }
      if (provenance)
        provenance.css = await page
          .evaluate(() =>
            [...document.querySelectorAll('link[rel=stylesheet]')].map(
              (l) => l.href.split('/').pop().split('?')[0],
            ),
          )
          .catch(() => []);
      const result = error
        ? { vw: width, violations: [], notes: {}, error }
        : await page.evaluate(collect, {
            MIN_TEXT_COLUMN_PX,
            MAX_UPSCALE,
            MAX_ASPECT_DEVIATION,
            DESKTOP_BREAKPOINT,
            MAX_MEASURE_CPL,
            MIN_PROSE_CHARS,
          });
      rows.push({ ...t, width, ...result, error, provenance });
      await ctx.close();
    }
  }
  await browser.close();
  if (json) fs.writeFileSync(json, JSON.stringify({ label, rows }, null, 1));
  return rows;
}

const CHECKS = [
  'narrow-text-column',
  'reading-measure',
  'clipped-text',
  'viewport-overflow',
  'image-upscale',
  'image-aspect',
];
const NOT_COVERED = [];
const ABBREV = {
  'narrow-text-column': 'narrow',
  'reading-measure': 'measure',
  'clipped-text': 'clipped',
  'viewport-overflow': 'overflow',
  'image-upscale': 'upscale',
  'image-aspect': 'aspect',
};

function report(rows, { label, quiet }) {
  console.log(`\nUILINT — rendered-layout gate · ${label}`);
  console.log(`widths ${WIDTHS.join('/')} · chrome ${CHROME}`);
  console.log('─'.repeat(78));

  let failures = 0;
  let errors = 0;
  for (const row of rows) {
    const name = `${row.name} @${row.width}`;
    if (row.error) {
      errors++;
      console.log(`[ERROR] ${name.padEnd(46)} ${row.error}`);
      continue;
    }
    const byCheck = new Map(CHECKS.map((c) => [c, []]));
    for (const v of row.violations) byCheck.get(v.check).push(v);
    const total = row.violations.length;
    failures += total;
    const counts = CHECKS.map((c) => `${ABBREV[c]}:${byCheck.get(c).length}`).join(' ');
    const skipped = row.notes.imagesNotDecoded
      ? ` · ${row.notes.imagesNotDecoded}/${row.notes.imagesTotal} images not decoded (skipped, NOT a defect)`
      : '';
    console.log(
      `${total === 0 ? '[ ok ]' : '[FAIL]'} ${name.padEnd(46)} ${total} violation(s)  ${counts}${skipped}`,
    );
    if (total === 0 || quiet) continue;
    for (const c of CHECKS) {
      const vs = byCheck.get(c);
      if (!vs.length) continue;
      console.log(`        ${c} ×${vs.length}`);
      for (const v of vs.slice(0, 4))
        console.log(
          `          ${v.detail}\n            ${v.selector}${v.sample ? `\n            "${v.sample}"` : ''}`,
        );
      if (vs.length > 4) console.log(`          … and ${vs.length - 4} more`);
    }
  }

  console.log('─'.repeat(78));
  const perCheck = CHECKS.map(
    (c) => `${c} ${rows.reduce((n, r) => n + r.violations.filter((v) => v.check === c).length, 0)}`,
  ).join(' · ');
  console.log(`totals: ${perCheck}`);
  const fingerprints = new Map();
  for (const r of rows)
    if (r.provenance && (r.provenance.vercelId || r.provenance.css?.length))
      fingerprints.set(
        r.name,
        `${r.provenance.status} ${r.provenance.cache ?? '-'} age=${r.provenance.age ?? '-'} ${r.provenance.vercelId ?? ''} css=[${(r.provenance.css ?? []).join(' ')}]`,
      );
  if (fingerprints.size) {
    console.log('build fingerprint (last width measured, per target):');
    for (const [k, v] of fingerprints)
      console.log(`  ${k}
    ${v}`);
  }
  if (NOT_COVERED.length) {
    console.log('NOT COVERED (declared, not hidden):');
    for (const n of NOT_COVERED) console.log(`  - ${n}`);
  }
  return { failures, errors };
}

// ═══════════════════════════════════════════════════════════════════════════
async function runFixtures({ green, json, quiet, only }) {
  const server = await startFixtureServer(green);
  const base = `http://127.0.0.1:${server.address().port}`;
  let targets = [
    { name: 'homepage.html', url: `${base}/homepage.html` },
    { name: 'article.html', url: `${base}/article.html` },
    { name: 'category.html', url: `${base}/category.html` },
  ];
  if (only) targets = targets.filter((t) => t.name === only);
  const rows = await measure(targets, { json, label: 'fixtures' });
  server.close();
  return {
    rows,
    ...report(rows, {
      label: `pre-fix fixtures 2026-08-31${green ? ' + GREEN CONTROL' : ''}`,
      quiet,
    }),
  };
}

async function runBase(baseUrl, { json, quiet }) {
  const authorSlug = opt('author-slug', null);
  const list = [...TEMPLATES];
  if (authorSlug) list.push({ template: 'author archive', path: `/artikel/author/${authorSlug}` });
  else
    NOT_COVERED.push(
      'author archive (/artikel/author/[slug]) — no reachable instance on this site; pass --author-slug when one exists',
    );
  NOT_COVERED.push('/[slug] — legacy WordPress resolver, 301s, renders no template');
  const targets = list.map((t) => ({
    name: `${t.template} ${t.path}`,
    url: new URL(t.path, baseUrl).toString(),
  }));
  const rows = await measure(targets, { json, label: baseUrl });
  return { rows, ...report(rows, { label: baseUrl, quiet }) };
}

async function runUrls(urls, { json, quiet }) {
  const targets = urls.map((u) => ({ name: new URL(u).pathname || u, url: u }));
  const rows = await measure(targets, { json, label: 'explicit urls' });
  return { rows, ...report(rows, { label: urls.join(', '), quiet }) };
}

// ═══════════════════════════════════════════════════════════════════════════
// SELF-TEST — the gate's own regression test.
//
// A gate nobody has ever seen fail is not a gate. This asserts, against the
// committed fixtures, that each check FIRES on the known-bad input and CLEARS
// on known-good input. If someone later "simplifies" a threshold into
// uselessness, this goes red in CI on the next push.
// ═══════════════════════════════════════════════════════════════════════════
async function selftest() {
  const fails = [];
  const ok = [];
  // A failed count that does not say WHAT it counted cannot be acted on from a
  // CI log. The first Linux run of this suite failed one assertion by exactly
  // one violation and named nothing; `evidence` is why the second did not.
  const assert = (cond, msg, evidence) =>
    cond ? ok.push(msg) : fails.push(msg + (evidence ? `\n          ${evidence}` : ''));
  const listing = (row, check) =>
    (row?.violations ?? [])
      .filter((v) => v.check === check)
      .map((v) => `${v.selector} :: ${v.detail}`)
      .join('\n          ') || '(none)';

  const server = await startFixtureServer(false);
  const base = `http://127.0.0.1:${server.address().port}`;
  const bad = await measure(
    [
      { name: 'homepage.html', url: `${base}/homepage.html` },
      { name: 'article.html', url: `${base}/article.html` },
      { name: 'category.html', url: `${base}/category.html` },
    ],
    { label: 'selftest-bad' },
  );
  server.close();

  const discServer = await startFixtureServer(false, FIXTURES_ROOT);
  const dbase = `http://127.0.0.1:${discServer.address().port}`;
  const disc = await measure([{ name: 'discriminator.html', url: `${dbase}/discriminator.html` }], {
    label: 'selftest-discriminator',
  });
  discServer.close();

  const greenServer = await startFixtureServer(true);
  const gbase = `http://127.0.0.1:${greenServer.address().port}`;
  const good = await measure([{ name: 'category.html', url: `${gbase}/category.html` }], {
    label: 'selftest-green',
  });
  greenServer.close();

  const pick = (rows, name, width, check) =>
    rows
      .find((r) => r.name === name && r.width === width)
      ?.violations.filter((v) => v.check === check) ?? [];

  // Every expectation below is a MEASURED value from the committed fixtures,
  // recorded 31 Aug 2026, and each check is asserted BOTH ways: it must fire
  // where the defect is and clear where it is not. An assertion that only ever
  // says "something was found" cannot tell a working check from a check that
  // flags everything.

  // 1. The 44px column — 13 cards, at the two widths past the 1024px breakpoint.
  for (const w of [1024, 1440]) {
    const v = pick(bad, 'homepage.html', w, 'narrow-text-column');
    assert(
      v.length >= 12,
      `homepage.html @${w}: narrow-text-column fires ${v.length}x (expected >= 12)`,
    );
    assert(
      v.some((x) => Math.abs(x.value - 44) < 1),
      `homepage.html @${w}: a 44px column is among them (widths seen: ${[...new Set(v.map((x) => x.value))].join(', ')})`,
    );
  }
  // 2. THE NEGATIVE CONTROL — the same component with its rank number present.
  //    If this ever goes red, the check is matching on the wrong thing.
  for (const w of WIDTHS) {
    assert(
      pick(bad, 'article.html', w, 'narrow-text-column').length === 0,
      `article.html @${w}: narrow-text-column CLEAN — the 44x26px "01" rank cell is a label, not a column`,
    );
    assert(
      pick(bad, 'category.html', w, 'narrow-text-column').length === 0,
      `category.html @${w}: narrow-text-column CLEAN`,
    );
  }
  // 3. The 1,969.5px nav rail — fires at desktop, exempt below the breakpoint.
  for (const w of [1024, 1440]) {
    const v = pick(bad, 'homepage.html', w, 'viewport-overflow');
    assert(
      v.some((x) => x.value > w + 500),
      `homepage.html @${w}: viewport-overflow fires on the nav rail (furthest right edge ${Math.max(0, ...v.map((x) => x.value))}px)`,
    );
    assert(
      v.some((x) => /Venue, Kos/.test(x.sample)),
      `homepage.html @${w}: names "Venue, Kos & Perancangan" as sitting past the edge`,
    );
  }
  for (const w of [390, 768]) {
    assert(
      pick(bad, 'homepage.html', w, 'viewport-overflow').length === 0,
      `homepage.html @${w}: the swipeable mobile rail is exempt, not a violation`,
    );
  }
  // 4. Image scale — fires on the hero, clears where nothing is upscaled.
  const up1440 = pick(bad, 'homepage.html', 1440, 'image-upscale');
  assert(
    up1440.some((x) => x.value >= 1.19 && /1200x1800/.test(x.detail)),
    `homepage.html @1440: the 1200x1800 portrait hero is caught at 1.2x (scales seen: ${[...new Set(up1440.map((x) => x.value))].join(', ')})`,
  );
  for (const w of [390, 768]) {
    assert(
      pick(bad, 'homepage.html', w, 'image-upscale').length === 0,
      `homepage.html @${w}: 13 decoded images, zero upscale violations — the check is not firing on everything`,
    );
  }
  // 5. Aspect — at desktop the hero is the only failure, and the 12 card
  //    thumbnails sitting at 11% deviation must NOT be flagged.
  for (const w of [1024, 1440]) {
    const a = pick(bad, 'homepage.html', w, 'image-aspect');
    assert(
      a.length === 1 && a[0].value > 2.5,
      `homepage.html @${w}: exactly the hero fails aspect (${a.length} found${a[0] ? `, ${(a[0].value * 100).toFixed(0)}% off` : ''}); the 12 thumbnails at 11% pass`,
    );
  }
  for (const w of WIDTHS) {
    const c = bad.find((r) => r.name === 'category.html' && r.width === w);
    assert(
      c && c.violations.filter((v) => v.check.startsWith('image-')).length === 0,
      `category.html @${w}: zero images, zero image violations`,
    );
  }
  // 6. Nothing was skipped for being lazy. All 13 homepage images decoded, so
  //    the naturalWidth-0 exclusion cannot have hidden a real defect here.
  for (const w of WIDTHS) {
    const h = bad.find((r) => r.name === 'homepage.html' && r.width === w);
    assert(
      h && h.notes.imagesNotDecoded === 0 && h.notes.imagesTotal === 13,
      `homepage.html @${w}: all ${h?.notes.imagesTotal} images decoded (${h?.notes.imagesNotDecoded} skipped as not-decoded)`,
    );
  }
  // 6b. THE READING MEASURE (UI-10, CHECK 6). Asserted at three widths on the
  //     same file, because the whole point of this check is that the SAME
  //     markup passes at one viewport and fails at another — the defect is the
  //     column, not the content. On the pre-fix article the body ran 350px at
  //     390 (41 cpl), 704px at 768 (83), 632px at 1024 (74) and 888px at 1440
  //     (104). So it must fire at 768 and 1440, and stay silent at 390 and at
  //     1024 — 74.4 is under the 75 ceiling, and a check that flagged it
  //     anyway would be a check with no threshold.
  {
    const at1440 = pick(bad, 'article.html', 1440, 'reading-measure');
    assert(
      at1440.length >= 1,
      `article.html @1440: reading-measure FIRES (got ${at1440.length})`,
      listing(
        bad.find((r) => r.name === 'article.html' && r.width === 1440),
        'reading-measure',
      ),
    );
    assert(
      at1440.some((v) => Math.abs(v.value - 104.5) < 1),
      `article.html @1440: the 888px/17px body column is among them at ~104.5 cpl (values seen: ${[
        ...new Set(at1440.map((v) => v.value)),
      ].join(', ')})`,
    );
    const at768 = pick(bad, 'article.html', 768, 'reading-measure');
    assert(at768.length >= 1, `article.html @768: reading-measure FIRES (got ${at768.length})`);
    assert(
      pick(bad, 'article.html', 390, 'reading-measure').length === 0,
      'article.html @390: reading-measure CLEAN — a 350px phone column is ~41 cpl and no cap can widen it',
      listing(
        bad.find((r) => r.name === 'article.html' && r.width === 390),
        'reading-measure',
      ),
    );
    assert(
      pick(bad, 'article.html', 1024, 'reading-measure').length === 0,
      'article.html @1024: reading-measure CLEAN — 632px/17px is 74.4 cpl, under the 75 ceiling',
      listing(
        bad.find((r) => r.name === 'article.html' && r.width === 1024),
        'reading-measure',
      ),
    );
    // The negative control by TEMPLATE, not by width: pages of cards and
    // labels must never register a reading measure at all, or the check is
    // really just "this box is wide".
    for (const w of WIDTHS)
      for (const f of ['homepage.html', 'category.html'])
        assert(
          pick(bad, f, w, 'reading-measure').length === 0,
          `${f} @${w}: reading-measure CLEAN — cards and labels are not continuous prose`,
          listing(
            bad.find((r) => r.name === f && r.width === w),
            'reading-measure',
          ),
        );
  }
  // 7. The discriminator fixture — a true positive and a near-miss false
  //    positive side by side for each check, so drift in EITHER direction is
  //    caught. Five of its nine cases must produce exactly nothing.
  for (const w of WIDTHS) {
    const row = disc.find((r) => r.width === w);
    const n = (c) => row.violations.filter((v) => v.check === c).length;
    assert(
      n('narrow-text-column') === 1,
      `discriminator @${w}: narrow-text-column = 1 (case B fires; A sr-only, C the "01" label and D a 300px column do not) — got ${n('narrow-text-column')}`,
    );
    assert(
      n('clipped-text') === 2,
      `discriminator @${w}: clipped-text = 2 (K clips its own text, M clips text one node deeper; L uses the same idiom and fits) — got ${n('clipped-text')}`,
    );
    assert(
      n('viewport-overflow') === (w >= DESKTOP_BREAKPOINT ? 2 : 1),
      `discriminator @${w}: viewport-overflow = ${w >= DESKTOP_BREAKPOINT ? 2 : 1} (E always; F the contained rail only at desktop) — got ${n('viewport-overflow')}`,
      listing(row, 'viewport-overflow'),
    );
    assert(
      n('image-upscale') === 1,
      `discriminator @${w}: image-upscale = 1 (G at 2.0x; H is 1.0x under cover and I is 1:1) — got ${n('image-upscale')}`,
    );
    assert(
      n('image-aspect') === 1,
      `discriminator @${w}: image-aspect = 1 (H at 50%; G keeps its 1:1 aspect) — got ${n('image-aspect')}`,
    );
    assert(
      row.notes.imagesNotDecoded === 1,
      `discriminator @${w}: the undecodable image is COUNTED (${row.notes.imagesNotDecoded}) and never reported as a defect`,
    );
  }

  // 8. The gate can reach zero. One override rule, a real page, all four widths.
  for (const w of WIDTHS) {
    const row = good.find((r) => r.width === w);
    assert(
      row && row.violations.length === 0,
      `GREEN CONTROL category.html @${w}: 0 violations (got ${row?.violations.length})`,
    );
  }

  console.log('\nUILINT SELF-TEST — does the gate fire on known-bad and clear on known-good?');
  console.log('─'.repeat(78));
  for (const m of ok) console.log(`  PASS  ${m}`);
  for (const m of fails) console.log(`  FAIL  ${m}`);
  console.log('─'.repeat(78));
  console.log(`${ok.length} passed, ${fails.length} failed`);
  return fails.length;
}

// ═══════════════════════════════════════════════════════════════════════════
const json = opt('json', null);
const quiet = has('quiet');
let exit;

if (has('selftest')) {
  exit = (await selftest()) === 0 ? 0 : 1;
} else if (has('fixtures')) {
  const r = await runFixtures({ green: has('green'), json, quiet, only: opt('only', null) });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
} else if (has('base') || process.env.UI_GATE_BASE_URL) {
  const r = await runBase(opt('base', process.env.UI_GATE_BASE_URL), { json, quiet });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
} else if (many('url').length) {
  const r = await runUrls(many('url'), { json, quiet });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
} else {
  console.error(
    'usage: node scripts/ui-layout-gate.mjs (--fixtures [--green] | --base <url> | --url <u>… | --selftest)\n' +
      '       [--json out.json] [--quiet] [--author-slug <slug>]\n' +
      '       env: UI_GATE_CHROME=<chrome path>  UI_GATE_BYPASS=<vercel preview bypass secret>',
  );
  console.log('UILINT EXIT: 2');
  process.exit(2);
}

console.log(`UILINT EXIT: ${exit}`);
process.exit(exit);
