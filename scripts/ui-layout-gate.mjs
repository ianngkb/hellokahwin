/**
 * UILINT — the rendered-layout regression gate.
 *
 *   pnpm ui:gate --fixtures                 # the committed pre-fix fixtures (known-bad)
 *   pnpm ui:gate --fixtures --green         # the same fixtures + the green-control override
 *   pnpm ui:gate --discriminator            # the unit fixture, sixteen labelled cases
 *   pnpm ui:gate --h6-order                 # the H6.6 pair: one CSS property apart
 *   pnpm ui:gate --empty-shell              # a real page with <main> emptied
 *   pnpm ui:gate --base https://hellokahwin.com
 *   pnpm ui:gate --url https://…/artikel --url https://…/brand
 *   pnpm ui:gate:selftest                   # 192 assertions: fires AND clears (CI)
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
 * THE CHECKS, AND THE RULE EACH ONE ACTUALLY APPLIES
 *
 * Four come from the item's definition of done and are not negotiable. Five
 * more were added by three other seats' measurements, because each found a
 * defect that would have walked straight past all four; one of the five is
 * advisory, and says so. Two more (10 and 11) are UI-13's, and are the first
 * here that enforce an EDITORIAL rule rather than a rendering one.

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
 * 3. IMAGE UPSCALE — no image painted at more than 1.1x THE FILE'S pixels.
 *
 *    Scale is measured the way the browser paints it: `cover` and `fill` take
 *    the larger of the two axis factors, `contain` the smaller. Contexts run at
 *    deviceScaleFactor 1 so a CSS pixel is a device pixel.
 *
 *    ⚠ THE INTRINSIC SIZE IS NOT `img.naturalWidth`. On a `srcset` with `w`
 *    descriptors the spec divides naturalWidth by the candidate's derived
 *    density, which makes `box.width / naturalWidth` ≈ 1.000 by construction —
 *    and worse, it can invert a real upscale into an apparent downscale. The
 *    discriminator's case O is a 1.5x upscale that naturalWidth reports as
 *    0.21x. The size is read from a detached `Image()` on `currentSrc`. See the
 *    long note at the check itself; the first version of this file got it wrong
 *    and its own self-test called the blind spot cleanliness.
 *
 * 4. ASPECT DEVIATION — rendered aspect within 25% of the FILE's aspect.
 *
 *    The homepage hero on 31 Aug: a 1200x1800 PORTRAIT file painted into a
 *    landscape frame, 28% of the photograph visible. Aspect survived the
 *    naturalWidth trap where scale did not, because density divides both axes
 *    equally — which is exactly why one check being right is no evidence about
 *    the other.
 *
 * 4b. DECLARED BOX (ADVISORY, does not fail the build) — `width`/`height`
 *    attributes within 25% of the file's aspect, because those attributes are
 *    what the browser reserves before a byte arrives. Suggested by UI-03 with
 *    an explicit condition: add it if it stays clean on the negative control.
 *    It does not — article.html declares a boilerplate width="1200"
 *    height="800" on 11 of its 51 images, five of them 684x1024 PORTRAIT
 *    photographs. Those are true positives, so the finding is printed in full;
 *    but the condition I was handed was not met, and promoting it to blocking
 *    anyway is not a call to make alone.
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
 * 7. CLIPPED BY A SCROLL CONTAINER — nothing past its scroller's client box.
 *
 *    Required by this item's 31 Aug addendum, and NOT a reworded check 2. At
 *    1920px the viewport clause finds two of the three hidden nav categories;
 *    the third ends 144px INSIDE the window and is invisible anyway. Both
 *    verdicts print separately, so a red says which one fired.
 *
 * 8. EMPTY CONTENT — <main> must render something.
 *
 *    Every other check in this file passes, vacuously, on a page that rendered
 *    nothing. UI-08 found the neighbouring version of this: pointed at a
 *    protected preview, the gate printed `0 violation(s)` over a login page.
 *    Their precondition catches the wrong page; this catches the right page
 *    with nothing in it. `--empty-shell` proves it, on a real captured page
 *    with <main> emptied.
 *
 * 9. IMAGE UNMEASURABLE — an intrinsic-size probe that fails is REPORTED.
 *
 *    A probe returning -1 must never be quietly treated as a pass.
 *
 * 10. CATEGORY DIVERSITY (H6) — the homepage may not run one section over and
 *    over. DES-03 §7.5, written by DES-17: no category past ceil(N/3) of the
 *    items (H6.1), no two adjacent items from one category (H6.2), at least
 *    min(4, K, N−cap+1) distinct categories (H6.3). HOMEPAGE ONLY, and told so
 *    by the target rather than sniffed from a pathname.
 *
 *    This is the first check here that is not about rendering. It is here
 *    because the failure is invisible to every structural check this company
 *    owns and completely obvious to a reader: on 01 Sept 2026 the live front
 *    page ran 13 articles and 10 were `hantaran-mas-kahwin`, out of a corpus of
 *    89 across 15 categories. The DOM was valid, every link resolved, nothing
 *    threw. The rule had existed as PROSE in the spec since 28 August and had
 *    rejected nothing in two sprints. Prose rules do not fire.
 *
 *    `scripts/measure/check-h6.sh` is the same rule over raw HTML, and is the
 *    CLI instrument. The two are deliberately separate implementations and the
 *    self-test runs BOTH over the same committed fixture, asserting they agree
 *    on the extracted sequence — a drift between them goes red rather than
 *    unnoticed.
 *
 * 11. SOURCE ORDER (H6.6) — homepage items may not be visually reordered away
 *    from DOM order. Asserted from computed BOXES, never from property names:
 *    `order`, `grid-auto-flow: dense` and `*-reverse` are three spellings of
 *    one effect and the list is not closed. DOM order is also tab order and the
 *    order a screen reader announces, so a page that satisfies check 10 while
 *    reading in a different sequence has satisfied nothing.
 *
 *    check-h6.sh CANNOT see this — it reads HTML and this is a computed value.
 *    `tests/ui-layout-gate/fixtures/h6-order-{good,reversed}.html` are the
 *    proof: byte-identical item sets, one CSS property apart, and the shell
 *    script exits 0 on both.
 *
 * DELIBERATELY NOT HERE, and named rather than left silent: a headline WRAPPER
 * HEIGHT floor — UI-01 measured a legitimate three-line title at 106px against
 * a broken row's 225–307px, and the row's height is set by its 132px thumbnail
 * rather than by its text, so a 100px floor would go red on a good row. The
 * DoD's assertion is about WIDTH, where 44 and 412 do not overlap. Also absent:
 * tap targets under 24x24 (UI-11) and missing `:focus-visible` indicators
 * (UI-09). Both are WCAG conformance and want a different report shape. Each is
 * a real open finding owned by its own item.
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

// The four mandated widths, plus one. 390 (iPhone 12/13/14, the audience's
// phone), 768 (tablet / the site's own breakpoint), 1024 (the exact breakpoint
// the 44px bug lives behind — a gate that skipped it would have missed the
// defect it was built for), 1440 (laptop), and 1920.
//
// 1920 is an ADDITION, never a substitution. It is where the viewport-edge test
// demonstrably degrades: UI-02 measured 3 of 9 nav links hidden at 1920 and the
// viewport clause found only 2 of them, because the third ended 144px inside
// the window and was still clipped by a 1264px scroller. A gate proven at one
// width and blind at another is the failure mode this whole item exists to
// stop, and it showed up twice in one afternoon — the other time in this
// script's own image check.
const WIDTHS = [390, 768, 1024, 1440, 1920];

const MIN_TEXT_COLUMN_PX = 120;
const MAX_UPSCALE = 1.1;
const MAX_ASPECT_DEVIATION = 0.25;
const DESKTOP_BREAKPOINT = 1024;
// Deliberately low. This is an EMPTY-PAGE alarm, not a content-quality bar: its
// job is to make the gate incapable of going green on a shell that rendered
// nothing. The thinnest real template measured here carries 40+.
const MIN_CONTENT = 8;
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
  // `homepage: true` turns on checks 10 & 11 (H6). It is a property of the
  // TARGET rather than of the URL, so the fixtures can carry it too and the
  // rule never has to guess from a pathname.
  { template: 'homepage', path: '/', homepage: true },
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
async function collect(limits) {
  const {
    MIN_TEXT_COLUMN_PX,
    MAX_UPSCALE,
    MAX_ASPECT_DEVIATION,
    DESKTOP_BREAKPOINT,
    MIN_CONTENT,
    MAX_MEASURE_CPL,
    MIN_PROSE_CHARS,
    // UI-13. Told, not sniffed — see checks 10 & 11. Defaults false so every
    // other template is unaffected and a caller that forgets it gets silence
    // rather than a homepage rule applied to an article.
    isHomepage,
  } = limits;
  // The LAYOUT viewport, not `window.innerWidth`. innerWidth includes the
  // classic scrollbar gutter on Windows Chrome, so a link ending at 1905px in a
  // 1920px window with a 15px scrollbar is flush against the visible edge, not
  // 15px clear of it — and an innerWidth test would pass an element sitting
  // underneath the scrollbar. Borrowed from UI-02's `measure-nav-overflow.mjs`,
  // which established the distinction.
  const vw = document.documentElement.clientWidth;
  const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'META', 'LINK']);
  const violations = [];
  const notes = {
    imagesTotal: 0,
    imagesNotDecoded: 0,
    imagesSkippedZeroBox: 0,
    textRuns: 0,
    contentElements: 0,
    innerWidth: window.innerWidth,
    layoutWidth: vw,
  };

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
    // ── WHAT IS THIS ELEMENT, not just where does it sit ────────────────────
    // Added by UI-08, 31 Ogos 2026. A class path is a location. It says
    // nothing about what the thing IS, and every report this gate writes was
    // read by somebody who then had to guess.
    //
    // UI-04's audit reported this exact defect as "the source-attribution
    // link" from a path that read
    //   nav.mb-6 > ol.text-muted-foreground > li.flex > span.text-foreground
    // — which is a breadcrumb's current-page label: no href, no <a>
    // ancestor, aria-current="page", text identical to the page's own <h1>.
    // The phrase then travelled into the tracker's DoD and into UI-08's brief,
    // carrying a rights argument that did not apply, and three documents
    // repeated it because each quoted the one before. Had the report said
    // "not a link, aria-current=page" nobody could have written that sentence.
    //
    // So every violation now carries the attributes that answer "what is it":
    // whether it is a link and to where, and the ARIA that names its role.
    const a = el.closest && el.closest('a');
    const attr = (k) => (el.getAttribute && el.getAttribute(k)) || null;
    const id = [
      el.tagName.toLowerCase(),
      a ? `link → ${a.getAttribute('href')}` : 'not a link',
      attr('role') && `role="${attr('role')}"`,
      attr('aria-current') && `aria-current="${attr('aria-current')}"`,
      attr('aria-label') && `aria-label="${attr('aria-label')}"`,
      el.tagName === 'IMG' && `alt=${JSON.stringify(attr('alt') ?? null)}`,
    ].filter(Boolean);
    return `${bits.join(' > ')}  ⟨${id.join(' · ')}⟩`;
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

  // ── CHECK 6: clipped by a scroll container ────────────────────────────────
  //
  // Required by the brief's 31 Aug addendum, and it is NOT a reworded check 2.
  // UI-02 measured this on live production before it shipped: at 1920px,
  // `Pelamin, Kad & Cenderahati Majlis` ended at 1775.77px — 144px clear of the
  // window edge and invisible, because the rail's scroller had a 1264px client
  // box at every width. The viewport clause passes it. The reader never sees it.
  // At 1920 the viewport test found 2 of the 3 hidden links; this one finds 3.
  //
  // THE ADDENDUM'S "unless that ancestor carries a deliberate, visible
  // affordance" CLAUSE, and what measuring it changed.
  //
  // Implemented verbatim it would have exempted the very defect it was written
  // about. This site's `EdgeScroller` sets `data-overflow-end` and paints a fade
  // whenever the rail has more to the right, so the affordance was PRESENT at
  // 1920 on pre-fix production, and a literal "unless" would have waved through
  // all three hidden categories. Measured on live production 31 Aug:
  //
  //   @390   .hk-edge data-overflow-end="true"   scroller 390 client / 2058 scroll
  //   @1440  data-overflow-end absent            overflow-x: visible, 1264 / 1264
  //
  // The second row is UI-02's shipped fix, and it is the argument: given a
  // clipped desktop rail WITH the fade, UI-02 made the rail wrap rather than
  // rely on it. The affordance did not make those categories reachable by mouse.
  //
  // So the exemption applies BELOW 1024 only, where a swipe reaches the content
  // — which is also exactly what the addendum's own clause does on the live
  // page, since `data-overflow-end` is set at 390. This fixture cannot run the
  // JavaScript that sets it, so exempting a contained rail below the breakpoint
  // reproduces on the capture what the clause does on the site. At and above
  // 1024 there is no exemption; the affordance state is PRINTED either way, so
  // nothing is hidden behind a judgement call.
  //
  // This makes the check STRICTER than a literal reading at the width where the
  // defect lives, and equal to it elsewhere. Where it is more permissive —
  // below 1024 — it matches the measured behaviour of the real page.
  {
    const seen = new Set();
    for (const el of document.body.querySelectorAll('*')) {
      if (SKIP_TAGS.has(el.tagName)) continue;
      const r = el.getBoundingClientRect();
      if (r.width <= 0 || r.height <= 0) continue;
      if (!visible(el)) continue;

      let sc = null;
      for (let n = el.parentElement; n && n !== document.documentElement; n = n.parentElement) {
        if (getComputedStyle(n).overflowX !== 'visible') {
          sc = n;
          break;
        }
      }
      if (!sc) continue;
      const scRect = sc.getBoundingClientRect();
      const clipRight = scRect.left + sc.clientWidth;
      if (r.right <= clipRight + 0.5) continue;

      const cs = getComputedStyle(sc);
      // A truncating box is check 5's territory, and check 5 reports it better
      // — in pixels of string lost rather than in pixels of box. Reporting the
      // same ellipsis twice under two names is how a gate's output stops being
      // read.
      if (
        cs.textOverflow === 'ellipsis' ||
        ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') &&
          cs.whiteSpace.startsWith('nowrap'))
      )
        continue;
      const scrollbarVisible =
        (cs.overflowX === 'auto' || cs.overflowX === 'scroll') &&
        cs.scrollbarWidth !== 'none' &&
        sc.offsetHeight - sc.clientHeight > 0;
      const fadeAffordance = !!(
        sc.closest('[data-overflow-end], [data-overflow-start]') ||
        sc.querySelector(':scope > [data-overflow-end], :scope > [data-overflow-start]')
      );
      const affordance = scrollbarVisible
        ? 'visible scrollbar'
        : fadeAffordance
          ? 'edge fade (data-overflow-*)'
          : 'none';
      const swipeable =
        (cs.overflowX === 'auto' || cs.overflowX === 'scroll') && scRect.right <= vw + 0.5;
      if (vw < DESKTOP_BREAKPOINT && swipeable) continue;

      const ownText = [...el.childNodes].some((n) => n.nodeType === 3 && n.nodeValue.trim());
      if (!ownText && el.querySelector('*')) continue; // report the leaf that carries the text
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      const key = sel(el) + '|' + text.slice(0, 40);
      if (seen.has(key)) continue;
      seen.add(key);
      violations.push({
        check: 'scroll-container-clip',
        selector: sel(el),
        detail:
          `right edge ${r.right.toFixed(1)}px past its scroller's client box, which ends at ` +
          `${clipRight.toFixed(1)}px (scroller ${sc.clientWidth}px wide, content ${sc.scrollWidth}px, ` +
          `overflow-x: ${cs.overflowX}, affordance: ${affordance}) — the viewport is ${vw}px, so ` +
          `${r.right <= vw + 0.5 ? 'CHECK 2 DOES NOT SEE THIS' : 'check 2 sees it too'}`,
        sample: text.slice(0, 60),
        value: +r.right.toFixed(1),
      });
    }
  }

  // ── CHECK 7: the page rendered something ──────────────────────────────────
  //
  // "Every row is well-formed" is VACUOUSLY TRUE on a page with zero rows, and
  // this project has already shipped that mistake in another form: a preview
  // returned 200 carrying the right marker string and rendered zero articles,
  // because RLS gave the connecting role no rows. Without this the gate goes
  // green on an empty shell and cannot fail — which is the one thing it must
  // never do. Counted inside <main> so a header and footer cannot supply the
  // quorum on their own.
  {
    const main = document.querySelector('main') ?? document.body;
    const els = [...main.querySelectorAll('a, h1, h2, h3, p, li, img, figure')].filter((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0 && visible(el);
    });
    notes.contentElements = els.length;
    if (els.length < MIN_CONTENT) {
      violations.push({
        check: 'empty-content',
        selector: main === document.body ? 'body (no <main>)' : 'main',
        detail: `${els.length} visible content elements inside <main> (floor ${MIN_CONTENT}). A page that renders nothing passes every other check in this file.`,
        sample: '',
        value: els.length,
      });
    }
  }

  // ── CHECKS 10 & 11: H6 — homepage category diversity, and DOM order ───────
  //
  // DES-03 §7.5, rule H6, written by DES-17 and executable as
  // `scripts/measure/check-h6.sh`. That script reads raw HTML; this reads the
  // rendered DOM, which is what H6.6 makes normative ("DOM order is the order,
  // which is also tab order and the order a screen reader announces"). The two
  // are deliberately separate implementations of the same clauses and the
  // self-test runs BOTH over the same committed fixture, so a disagreement
  // between them goes red rather than going unnoticed.
  //
  // Homepage only, and it is told so rather than sniffing `location.pathname`:
  // the fixtures are served as `/homepage.html`, so a path test would encode
  // the fixture layout into the rule.
  //
  // WHY THIS IS HERE AND NOT ONLY IN THE SHELL SCRIPT. On 01 Sept 2026 the live
  // homepage ran 13 articles and 10 of them were `hantaran-mas-kahwin`, out of
  // a corpus of 89 across 15 categories. The DES-03 spec had asserted a
  // diversity rule since 28 August and it had never fired at anything, because
  // it was prose. A magazine front page that runs one section thirteen times
  // does not read as a publication, and no structural check on this repo could
  // see it: the DOM was valid, every link resolved, nothing threw.
  if (isHomepage) {
    // H6.0 EXTRACTION, normative. Every article link in DOM order, deduplicated
    // by path, first occurrence wins. An article link is exactly two path
    // segments after /artikel/ — a one-segment link is a CATEGORY link and is
    // never an item, which is what keeps the masthead, the breadcrumb and the
    // footer out of the count. The category is the first of those two segments;
    // nothing else is consulted, no data attribute and no heading text.
    //
    // Read through `new URL(...).pathname` rather than off the raw attribute so
    // that an absolute href, a trailing slash and a query string all normalise
    // to the same item. Cross-origin links can never be items.
    const seen = new Set();
    const items = [];
    for (const a of document.querySelectorAll('a[href]')) {
      let u;
      try {
        u = new URL(a.getAttribute('href'), location.href);
      } catch {
        continue;
      }
      if (u.origin !== location.origin) continue;
      const m = /^\/artikel\/([a-z0-9-]+)\/([a-z0-9-]+)\/?$/.exec(u.pathname);
      if (!m) continue;
      const key = `/artikel/${m[1]}/${m[2]}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({ path: key, category: m[1], rect: a.getBoundingClientRect(), el: a });
    }

    notes.h6Items = items.length;
    notes.h6Order = items.map((i) => i.category).join(' ');

    const N = items.length;
    if (N === 0) {
      // A ZERO IS A CLAIM ABOUT THE CHECK UNTIL THE CHECK IS PROVED. Reported
      // as a violation with the enumeration command attached, never as a
      // silent pass — a homepage with no article links is either a real empty
      // page (check 7 will also fire) or a broken extraction, and the two must
      // not look alike.
      violations.push({
        check: 'category-diversity',
        selector: 'a[href^="/artikel/"]',
        detail:
          'H6.0 EXTRACTION — zero article links matched. Enumerate what IS there before reading this as an empty homepage: [...document.querySelectorAll("a[href]")].map(a=>a.getAttribute("href"))',
        sample: '',
        value: 0,
      });
    } else {
      const cap = Math.ceil(N / 3);
      const count = {};
      for (const i of items) count[i.category] = (count[i.category] ?? 0) + 1;
      const distinct = Object.keys(count).length;

      // H6.1 SHARE CAP — no category supplies more than ceil(N/3) items.
      for (const [catg, n] of Object.entries(count).sort((a, b) => b[1] - a[1])) {
        if (n > cap) {
          violations.push({
            check: 'category-diversity',
            selector: `a[href^="/artikel/${catg}/"]`,
            detail: `H6.1 SHARE CAP — "${catg}" supplies ${n} of ${N} homepage items, over the cap of ceil(N/3)=${cap}. Order: ${items.map((i) => i.category).join(' ')}`,
            sample: catg,
            value: n,
          });
        }
      }

      // H6.2 RUN CAP — no two consecutive items share a category.
      const runs = [];
      for (let i = 1; i < items.length; i++) {
        if (items[i].category === items[i - 1].category)
          runs.push(`${i}-${i + 1}:${items[i].category}`);
      }
      if (runs.length) {
        violations.push({
          check: 'category-diversity',
          selector: 'homepage item set',
          detail: `H6.2 RUN CAP — ${runs.length} adjacent same-category pair(s), maximum run length is 1: ${runs.join(' ').slice(0, 160)}`,
          sample: runs[0],
          value: runs.length,
        });
      }

      // H6.3 DISTINCT FLOOR — F = min(4, K, N - cap + 1). K, the number of
      // categories holding at least one published article, is not knowable from
      // inside the page, so this uses the stricter reading of 4 that the shell
      // script also uses when it is given no --corpus. The third term is what
      // stops H6.3 contradicting H6.1 at small N: a floor above N - cap + 1
      // would forbid any category from reaching the cap H6.1 explicitly
      // permits. At N=4, cap=2, the floor is 3, not 4.
      const floor = Math.max(1, Math.min(4, N - cap + 1));
      if (distinct < floor) {
        violations.push({
          check: 'category-diversity',
          selector: 'homepage item set',
          detail: `H6.3 DISTINCT FLOOR — ${distinct} distinct categor${distinct === 1 ? 'y' : 'ies'} across ${N} items, floor min(4,K,N-cap+1)=${floor}. Present: ${Object.entries(
            count,
          )
            .map(([c, n]) => `${c}=${n}`)
            .join(' ')}`,
          sample: Object.keys(count).join(','),
          value: distinct,
        });
      }

      // H6.6 SOURCE ORDER — "Homepage items may not be visually reordered away
      // from source order — no `order`, no `grid-auto-flow: dense`, no
      // `*-reverse` on the item container. A page that satisfies the checker
      // while reading in a different sequence to a sighted reader has satisfied
      // nothing."
      //
      // Asserted from COMPUTED BOXES, not from property names. `order`,
      // `dense` and `row-reverse` are three spellings of one effect, the list
      // is not closed (`direction: rtl`, absolute positioning, a negative
      // margin), and this gate's whole reason for existing is that it reads
      // what the browser did rather than what the CSS said. Items on the same
      // visual line (tops within 12px) are ordered left to right, everything
      // else top to bottom. Only the FIRST inversion is reported: after one
      // swap every later index is off by one and a per-item report would print
      // twelve violations for one defect.
      const visual = items
        .map((it, i) => ({ i, top: it.rect.top, left: it.rect.left, path: it.path }))
        .sort((a, b) => (Math.abs(a.top - b.top) < 12 ? a.left - b.left : a.top - b.top));
      const inversion = visual.findIndex((v, i) => v.i !== i);
      if (inversion !== -1) {
        const v = visual[inversion];
        violations.push({
          check: 'source-order',
          selector: `a[href="${v.path}"]`,
          detail: `H6.6 — DOM order is not reading order. Item at DOM index ${v.i} paints in visual position ${inversion} (top ${v.top.toFixed(0)}, left ${v.left.toFixed(0)}). DOM order is also tab order and the order a screen reader announces, so the diversity above has been satisfied only on paper.`,
          sample: v.path,
          value: Math.abs(v.i - inversion),
        });
      }
    }
  }

  // ── CHECKS 3, 4, 4b & 8: image scale, aspect, declared box ─────────────────
  //
  // ⚠ NEVER `img.naturalWidth` HERE. On an <img> carrying a `srcset` with `w`
  // descriptors the HTML spec makes naturalWidth the intrinsic width DIVIDED by
  // the candidate's derived pixel density, so `box.width / naturalWidth` is
  // 1.000 BY CONSTRUCTION and an upscale ceiling can never be crossed.
  //
  // Verified on this repo's own fixture, the pre-fix homepage hero, whose file
  // is 1200x1800:
  //
  //   @390   naturalWidth 390x585    probe 1200x1800   upscale(naturalWidth) 1.000
  //   @768   naturalWidth 768x1152   probe 1200x1800   upscale(naturalWidth) 1.000
  //   @1440  naturalWidth 1200x1800  probe 1200x1800   upscale(naturalWidth) 1.200
  //
  // At 1024 and above the two agree by COINCIDENCE, because `sizes` happens to
  // select a 1200w candidate at density 1.0. So the first version of this check
  // fired correctly at 1440 and was structurally blind at 390 and 768 — and its
  // self-test asserted "zero upscale violations at 390, so the check is not
  // firing on everything", which was measuring a blind spot and calling it
  // cleanliness. Found by UI-03, measured on production, re-verified here
  // before it was believed.
  //
  // The intrinsic size is read from a DETACHED Image() loaded from
  // `currentSrc` — never `src`, which on a <picture> is the fallback and can be
  // a different crop entirely from the one that rendered. A probe that fails is
  // reported as `image-unmeasurable`, never as a pass.
  const imgs = [...document.querySelectorAll('img')];
  for (const img of imgs) {
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

    const probe = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res({ w: i.naturalWidth, h: i.naturalHeight });
      i.onerror = () => res({ w: -1, h: -1 });
      i.src = src;
    });
    if (probe.w <= 0 || probe.h <= 0) {
      violations.push({
        check: 'image-unmeasurable',
        selector: sel(img),
        detail: `the intrinsic-size probe could not load this image's currentSrc, so its scale and aspect cannot be checked at all. This is reported, never assumed to be fine.`,
        sample: src.slice(-64),
        value: -1,
      });
      continue;
    }

    const fit = getComputedStyle(img).objectFit;
    const sx = r.width / probe.w;
    const sy = r.height / probe.h;
    const scale = fit === 'contain' || fit === 'scale-down' ? Math.min(sx, sy) : Math.max(sx, sy);
    if (scale > MAX_UPSCALE) {
      violations.push({
        check: 'image-upscale',
        selector: sel(img),
        detail: `${scale.toFixed(2)}x — the file is ${probe.w}x${probe.h}, painted ${r.width.toFixed(0)}x${r.height.toFixed(0)} (object-fit: ${fit}, ceiling ${MAX_UPSCALE}x; naturalWidth here would have said ${img.naturalWidth})`,
        sample: src.slice(-64),
        value: +scale.toFixed(3),
      });
    }

    const sourceAspect = probe.w / probe.h;
    const renderedAspect = r.width / r.height;
    const dev = Math.abs(renderedAspect - sourceAspect) / sourceAspect;
    if (dev > MAX_ASPECT_DEVIATION) {
      const visibleFraction =
        Math.min(sourceAspect, renderedAspect) / Math.max(sourceAspect, renderedAspect);
      violations.push({
        check: 'image-aspect',
        selector: sel(img),
        detail: `${(dev * 100).toFixed(0)}% off — file ${sourceAspect.toFixed(2)}:1 (${probe.w}x${probe.h}), painted ${renderedAspect.toFixed(2)}:1 (${r.width.toFixed(0)}x${r.height.toFixed(0)}), ~${(visibleFraction * 100).toFixed(0)}% of the frame kept (ceiling ${MAX_ASPECT_DEVIATION * 100}%)`,
        sample: src.slice(-64),
        value: +dev.toFixed(3),
      });
    }

    // The declared box. `width` and `height` attributes are what the browser
    // reserves before a byte of the image arrives, so when they describe a
    // different shape from the file, the reservation is wrong and the page
    // shifts. The pre-fix homepage hero declares width="1200" height="500"
    // (2.40:1) for a 1200x1800 (0.67:1) asset. Suggested by UI-03; added
    // because it stays silent on the negative control.
    const aw = Number(img.getAttribute('width'));
    const ah = Number(img.getAttribute('height'));
    if (aw > 0 && ah > 0) {
      const declared = aw / ah;
      const attrDev = Math.abs(declared - sourceAspect) / sourceAspect;
      if (attrDev > MAX_ASPECT_DEVIATION) {
        violations.push({
          check: 'image-attr-aspect',
          selector: sel(img),
          detail: `declared width="${aw}" height="${ah}" (${declared.toFixed(2)}:1) for a ${probe.w}x${probe.h} file (${sourceAspect.toFixed(2)}:1) — ${(attrDev * 100).toFixed(0)}% off, so the box reserved before load is the wrong shape (ceiling ${MAX_ASPECT_DEVIATION * 100}%)`,
          sample: src.slice(-64),
          value: +attrDev.toFixed(3),
        });
      }
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

// `emptyMain` serves a real captured page with everything inside <main>
// removed — header, footer, nav, stylesheets and all still in place. It is the
// shell that a database returning no rows produces, and this project has
// shipped exactly that: a preview that answered 200 with the right marker
// string and rendered zero articles, because RLS gave the connecting role no
// rows. Every other check in this file passes on it, vacuously. The self-test
// asserts the gate goes RED, which is the only way to know it still can.
function startFixtureServer(green, root = FIXTURE_DIR, emptyMain = false) {
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
        if (emptyMain) {
          const open = html.indexOf('<main');
          const gt = open >= 0 ? html.indexOf('>', open) : -1;
          const close = html.lastIndexOf('</main>');
          if (gt < 0 || close < 0) throw new Error('emptyMain: no <main> in this fixture');
          html = html.slice(0, gt + 1) + html.slice(close);
        }
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
        // Webfonts change every advance width on the page. Measuring a text
        // column before they land measures a fallback stack nobody sees.
        await page.evaluate(() => document.fonts.ready).catch(() => {});
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
            MIN_CONTENT,
            MAX_MEASURE_CPL,
            MIN_PROSE_CHARS,
            isHomepage: t.homepage === true,
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
  'empty-content',
  'narrow-text-column',
  'reading-measure',
  'clipped-text',
  'viewport-overflow',
  'scroll-container-clip',
  'image-upscale',
  'image-aspect',
  'image-attr-aspect',
  'image-unmeasurable',
  // UI-13. DES-03 §7.5 rule H6. Blocking, and deliberately so: this is the
  // half of "it does not look premium" that a reader sees before reading a
  // word, and the rule went two sprints without ever firing because it was
  // prose. A prose rule does not fire.
  'category-diversity',
  'source-order',
];
// Reported with full numbers, never silent, but NOT counted towards the exit
// code. `image-attr-aspect` was suggested by UI-03 with an explicit acceptance
// condition — add it "if it stays clean on the negative control" — and it does
// not: article.html declares a boilerplate width="1200" height="800" on 11 of
// its 51 images, including five 684x1024 PORTRAIT photographs. Those are true
// positives, not a mis-match, so the finding is printed rather than dropped;
// but the condition I was given was not met, and quietly promoting it to a
// blocking check anyway is not my call to make alone. It should become blocking
// once the declarations are corrected.
const ADVISORY = new Set(['image-attr-aspect']);
const NOT_COVERED = [];
const ABBREV = {
  'empty-content': 'empty',
  'narrow-text-column': 'narrow',
  'reading-measure': 'measure',
  'clipped-text': 'clipped',
  'viewport-overflow': 'over',
  'scroll-container-clip': 'clip',
  'image-upscale': 'upscale',
  'image-aspect': 'aspect',
  'image-attr-aspect': 'attr',
  'image-unmeasurable': 'unmeasurable',
  'category-diversity': 'H6',
  'source-order': 'H6.6',
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
    const blocking = row.violations.filter((v) => !ADVISORY.has(v.check));
    const advisory = row.violations.filter((v) => ADVISORY.has(v.check));
    const total = blocking.length;
    failures += total;
    const counts = CHECKS.map((c) => `${ABBREV[c]}:${byCheck.get(c).length}`).join(' ');
    const skipped = row.notes.imagesNotDecoded
      ? ` · ${row.notes.imagesNotDecoded}/${row.notes.imagesTotal} images not decoded (skipped, NOT a defect)`
      : '';
    const adv = advisory.length ? ` · +${advisory.length} advisory` : '';
    console.log(
      `${total === 0 ? '[ ok ]' : '[FAIL]'} ${name.padEnd(46)} ${total} violation(s)  ${counts}${adv}${skipped}`,
    );
    if (row.violations.length === 0 || quiet) continue;
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
    (c) =>
      `${c} ${rows.reduce((n, r) => n + r.violations.filter((v) => v.check === c).length, 0)}` +
      (ADVISORY.has(c) ? ' (advisory, does not fail the build)' : ''),
  ).join('\n        ');
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
    { name: 'homepage.html', url: `${base}/homepage.html`, homepage: true },
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
    homepage: t.homepage === true,
  }));
  const rows = await measure(targets, { json, label: baseUrl });
  return { rows, ...report(rows, { label: baseUrl, quiet }) };
}

async function runUrls(urls, { json, quiet }) {
  // `--url https://…/` must gate the homepage the same way `--base` does. This
  // is the one place a pathname test is right rather than lazy: `--base` reads
  // `homepage: true` off the TEMPLATES manifest, but an explicit URL has no
  // manifest entry to read, and silently skipping checks 10 and 11 here would
  // hand back a green run over the exact page they exist for. The trailing
  // slash is optional and a query string is ignored, because a reader debugging
  // a cache will paste `https://hellokahwin.com/?x=1`.
  const targets = urls.map((u) => ({
    name: new URL(u).pathname || u,
    url: u,
    homepage: new URL(u).pathname === '/' || new URL(u).pathname === '',
  }));
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
      { name: 'homepage.html', url: `${base}/homepage.html`, homepage: true },
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

  const emptyServer = await startFixtureServer(false, FIXTURE_DIR, true);
  const empty = await measure(
    [
      {
        name: 'category.html (main emptied)',
        url: `http://127.0.0.1:${emptyServer.address().port}/category.html`,
      },
    ],
    { label: 'selftest-empty-shell' },
  );
  emptyServer.close();

  // UI-13. The H6.6 pair, served from FIXTURES_ROOT alongside the
  // discriminator. Same 13 real article paths, same DOM order, ONE CSS
  // property apart.
  const h6Server = await startFixtureServer(false, FIXTURES_ROOT);
  const h6base = `http://127.0.0.1:${h6Server.address().port}`;
  const h6 = await measure(
    [
      { name: 'h6-order-good.html', url: `${h6base}/h6-order-good.html`, homepage: true },
      { name: 'h6-order-reversed.html', url: `${h6base}/h6-order-reversed.html`, homepage: true },
    ],
    { label: 'selftest-h6-order' },
  );
  h6Server.close();

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
  // flags everything — and this suite has now caught four checks that looked
  // healthy from a failing run alone.

  // 1. The 44px column — 13 cards, at every width past the 1024px breakpoint.
  for (const w of [1024, 1440, 1920]) {
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
  for (const w of [1024, 1440, 1920]) {
    const v = pick(bad, 'homepage.html', w, 'viewport-overflow');
    assert(
      v.some((x) => x.value > w + 300),
      `homepage.html @${w}: viewport-overflow fires on the nav rail (furthest right edge ${Math.max(0, ...v.map((x) => x.value))}px)`,
    );
  }
  for (const w of [390, 768]) {
    assert(
      pick(bad, 'homepage.html', w, 'viewport-overflow').length === 0,
      `homepage.html @${w}: the swipeable mobile rail is exempt from check 2, not a violation`,
    );
  }

  // 4. THE ADDENDUM'S SECOND ASSERTION, and the whole reason it exists.
  //    At 1920 the viewport clause finds two of the three hidden categories.
  //    `Pelamin, Kad & Cenderahati Majlis` ends at 1775.8px — 144px INSIDE the
  //    window — and is invisible because the rail's scroller stops at 1592px.
  //    If the clip check ever stops finding what the viewport check cannot,
  //    the gate is back to catching two thirds of the defect it was built for.
  {
    const over = pick(bad, 'homepage.html', 1920, 'viewport-overflow');
    const clip = pick(bad, 'homepage.html', 1920, 'scroll-container-clip');
    const pelaminOver = over.some((x) => /Pelamin/.test(x.sample));
    const pelaminClip = clip.find((x) => /Pelamin/.test(x.sample));
    assert(
      !pelaminOver,
      `homepage.html @1920: "Pelamin, Kad & Cenderahati Majlis" is INSIDE the viewport, so check 2 correctly does not see it`,
    );
    assert(
      !!pelaminClip && pelaminClip.value < 1920,
      `homepage.html @1920: check 6 catches it anyway, at ${pelaminClip?.value}px, clipped by a scroller that ends earlier`,
    );
    assert(
      clip.length > over.length - 1,
      `homepage.html @1920: check 6 finds ${clip.length} clipped where check 2 finds ${over.length} past the edge`,
    );
  }
  // …and it must stay quiet on a phone, where a swipe reaches the rail — which
  // is what the live page's own `data-overflow-end` fade concedes at 390.
  for (const w of [390, 768]) {
    for (const page of ['homepage.html', 'article.html', 'category.html']) {
      assert(
        pick(bad, page, w, 'scroll-container-clip').length === 0,
        `${page} @${w}: the contained mobile rail is exempt from check 6`,
      );
    }
  }

  // 5. Image scale, read from the FILE and not from naturalWidth.
  for (const w of [1440, 1920]) {
    const up = pick(bad, 'homepage.html', w, 'image-upscale');
    assert(
      up.some((x) => /1200x1800/.test(x.detail) && x.value > 1.1),
      `homepage.html @${w}: the 1200x1800 portrait hero is caught (${up.map((x) => x.value).join(', ') || 'nothing found'})`,
    );
  }
  for (const w of [390, 768, 1024]) {
    assert(
      pick(bad, 'homepage.html', w, 'image-upscale').length === 0,
      `homepage.html @${w}: the hero is genuinely DOWNSCALED here (0.33x at 390), so zero upscale violations is the right answer, not a blind spot`,
    );
  }
  // 6. Aspect — the hero at every width; the 12 card thumbnails only where the
  //    80x80 square crop actually distorts them.
  for (const w of [1024, 1440, 1920]) {
    const a = pick(bad, 'homepage.html', w, 'image-aspect');
    assert(
      a.length === 1 && a[0].value > 2.5,
      `homepage.html @${w}: exactly the hero fails aspect (${a.length} found${a[0] ? `, ${(a[0].value * 100).toFixed(0)}% off` : ''}); the 12 thumbnails pass`,
    );
  }
  for (const w of WIDTHS) {
    const c = bad.find((r) => r.name === 'category.html' && r.width === w);
    assert(
      c && c.violations.filter((v) => v.check.startsWith('image-')).length === 0,
      `category.html @${w}: zero images, zero image violations`,
    );
  }
  // 7. Nothing was skipped for being lazy, and nothing was unmeasurable. All 13
  //    homepage images decoded AND probed, so neither exclusion can be hiding a
  //    real defect behind a comfortable number.
  for (const w of WIDTHS) {
    const h = bad.find((r) => r.name === 'homepage.html' && r.width === w);
    assert(
      h && h.notes.imagesNotDecoded === 0 && h.notes.imagesTotal === 13,
      `homepage.html @${w}: all ${h?.notes.imagesTotal} images decoded (${h?.notes.imagesNotDecoded} skipped as not-decoded)`,
    );
    assert(
      h && h.violations.filter((v) => v.check === 'image-unmeasurable').length === 0,
      `homepage.html @${w}: every decoded image was successfully probed for its true intrinsic size`,
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
  // 8. The discriminator fixture — a true positive and a near-miss false
  //    positive side by side for each check, so drift in EITHER direction is
  //    caught. Case O is the one that matters most: a 1.5x upscale that
  //    `naturalWidth` reports as a 0.21x DOWNSCALE.
  for (const w of WIDTHS) {
    const row = disc.find((r) => r.width === w);
    const n = (c) => row.violations.filter((v) => v.check === c).length;
    const desktop = w >= DESKTOP_BREAKPOINT;
    assert(
      n('narrow-text-column') === 1,
      `discriminator @${w}: narrow-text-column = 1 (B fires; A sr-only, C the "01" label and D a 300px column do not) — got ${n('narrow-text-column')}`,
      listing(row, 'narrow-text-column'),
    );
    assert(
      n('clipped-text') === 2,
      `discriminator @${w}: clipped-text = 2 (K clips its own text, M clips text one node deeper; L uses the same idiom and fits) — got ${n('clipped-text')}`,
      listing(row, 'clipped-text'),
    );
    assert(
      n('viewport-overflow') === (desktop ? 2 : 1),
      `discriminator @${w}: viewport-overflow = ${desktop ? 2 : 1} (E always; F the contained rail only at desktop; N is clipped and P is inside the viewport) — got ${n('viewport-overflow')}`,
      listing(row, 'viewport-overflow'),
    );
    assert(
      n('scroll-container-clip') === (desktop ? 3 : 1),
      `discriminator @${w}: scroll-container-clip = ${desktop ? 3 : 1} (N always; P and F only at desktop) — got ${n('scroll-container-clip')}`,
      listing(row, 'scroll-container-clip'),
    );
    assert(
      n('image-upscale') === 2,
      `discriminator @${w}: image-upscale = 2 (G at 2.0x, O at 1.5x behind a srcset; H is 1.0x under cover and I is 1:1) — got ${n('image-upscale')}`,
      listing(row, 'image-upscale'),
    );
    assert(
      n('image-aspect') === 1,
      `discriminator @${w}: image-aspect = 1 (H at 50%; G and O keep their file's aspect) — got ${n('image-aspect')}`,
      listing(row, 'image-aspect'),
    );
    assert(
      row.notes.imagesNotDecoded === 1,
      `discriminator @${w}: the undecodable image is COUNTED (${row.notes.imagesNotDecoded}) and never reported as a defect`,
    );
  }
  // Case P is the addendum's shape in miniature: a 912px row inside a 300px
  // scroller, entirely within a 1440px window. Prove check 2 cannot see it.
  {
    const row = disc.find((r) => r.width === 1440);
    assert(
      !row.violations.some((v) => v.check === 'viewport-overflow' && /900px row/.test(v.sample)),
      'discriminator @1440: case P is invisible to the viewport check, as designed',
    );
    assert(
      row.violations.some((v) => v.check === 'scroll-container-clip' && /900px row/.test(v.sample)),
      'discriminator @1440: and check 6 finds it',
    );
  }

  // 9. THE EMPTY SHELL. "Every row is well-formed" is vacuously true of a page
  //    with no rows, and this project has shipped a 200 that rendered zero
  //    articles. At 390 and 768 this is the ONLY thing that fires, so without
  //    it the gate would report a green tick on a page containing nothing.
  for (const w of WIDTHS) {
    const row = empty.find((r) => r.width === w);
    const e = row.violations.filter((v) => v.check === 'empty-content');
    assert(
      e.length === 1 && e[0].value === 0,
      `EMPTY SHELL category.html @${w}: empty-content fires (${e[0]?.value} content elements inside <main>)`,
    );
  }
  for (const w of [390, 768]) {
    const row = empty.find((r) => r.width === w);
    assert(
      row.violations.length === 1,
      `EMPTY SHELL @${w}: empty-content is the ONLY violation (${row.violations.length}), so every other check passes on a page that rendered nothing`,
    );
  }
  // …and it does not fire on the real pages, whose <main> is full.
  for (const w of WIDTHS) {
    for (const page of ['homepage.html', 'article.html', 'category.html']) {
      assert(
        pick(bad, page, w, 'empty-content').length === 0,
        `${page} @${w}: empty-content clean (${bad.find((r) => r.name === page && r.width === w)?.notes.contentElements} content elements)`,
      );
    }
  }

  // 10. The gate can reach zero. One override rule, a real page, every width.
  for (const w of WIDTHS) {
    const row = good.find((r) => r.width === w);
    const blocking = (row?.violations ?? []).filter((v) => !ADVISORY.has(v.check));
    assert(
      row && blocking.length === 0,
      `GREEN CONTROL category.html @${w}: 0 blocking violations (got ${blocking.length})`,
      listing(row, 'viewport-overflow') + ' / ' + listing(row, 'scroll-container-clip'),
    );
  }

  // 11. H6 — DES-03 §7.5, the homepage category diversity rule (UI-13).
  //
  // The rule this section exists to make FIRE. It sat in the spec from 28
  // August as prose, was cross-referenced from §5.3, and rejected nothing for
  // two sprints, while the live front page ran thirteen articles out of one
  // category. Asserted both ways, and asserted as THREE separate clauses:
  // a single "H6 fired" assertion cannot tell a working rule from one clause
  // doing all the work.
  const H6_BAD_ORDER = new Array(13).fill('hantaran-mas-kahwin').join(' ');
  const H6_GOOD_ORDER =
    'hantaran-mas-kahwin idea-dan-nasihat hantaran-mas-kahwin ucapan-doa ' +
    'hantaran-mas-kahwin real-wedding hantaran-mas-kahwin idea-dan-nasihat ' +
    'hantaran-mas-kahwin nikah-undang-undang ucapan-doa venue-perancangan real-wedding';

  for (const w of WIDTHS) {
    const row = bad.find((r) => r.name === 'homepage.html' && r.width === w);
    const v = pick(bad, 'homepage.html', w, 'category-diversity');
    // CROSS-IMPLEMENTATION AGREEMENT. `scripts/measure/check-h6.sh` extracts
    // this same sequence from the raw HTML of this same file and prints it on
    // its `order:` line. Two independent implementations of H6.0; if they ever
    // disagree about this fixture, one of them is wrong and this goes red.
    assert(
      row?.notes.h6Order === H6_BAD_ORDER,
      `homepage.html @${w}: H6.0 extraction agrees with check-h6.sh — 13 items, all hantaran-mas-kahwin`,
      `got: ${row?.notes.h6Order}`,
    );
    assert(
      v.some((x) => x.detail.includes('H6.1 SHARE CAP') && x.value === 13),
      `homepage.html @${w}: H6.1 fires — one category supplies 13 of 13, cap is 5`,
      listing(row, 'category-diversity'),
    );
    assert(
      v.some((x) => x.detail.includes('H6.2 RUN CAP') && x.value === 12),
      `homepage.html @${w}: H6.2 fires — 12 adjacent same-category pairs`,
      listing(row, 'category-diversity'),
    );
    assert(
      v.some((x) => x.detail.includes('H6.3 DISTINCT FLOOR') && x.value === 1),
      `homepage.html @${w}: H6.3 fires — 1 distinct category against a floor of 4`,
      listing(row, 'category-diversity'),
    );
    // …and H6.6 stays SILENT on it. The pre-fix homepage is monotonous, not
    // reordered, and a check that fired on both would be measuring neither.
    assert(
      pick(bad, 'homepage.html', w, 'source-order').length === 0,
      `homepage.html @${w}: H6.6 CLEAN — the pre-fix page is monotonous, not visually reordered`,
    );
  }

  // Scoped to the homepage. The check must be OFF everywhere else, or the
  // article page's related-reading rail — which H6 explicitly does NOT govern
  // (§7.6, "what H6 does not govern") — starts failing the build for a rule
  // never written about it.
  for (const w of WIDTHS) {
    for (const page of ['article.html', 'category.html']) {
      const row = bad.find((r) => r.name === page && r.width === w);
      assert(
        row?.notes.h6Order === undefined &&
          pick(bad, page, w, 'category-diversity').length === 0 &&
          pick(bad, page, w, 'source-order').length === 0,
        `${page} @${w}: H6 does not run — it governs one ordered list on one page`,
      );
    }
  }

  // THE GOOD CONTROL. A conforming set must clear BOTH checks at every width.
  // Without it a check that flags everything looks exactly like a working one.
  // `hantaran-mas-kahwin` sits AT the cap of 5 in this fixture, so this also
  // proves the cap is a ceiling and not a ban.
  for (const w of WIDTHS) {
    const row = h6.find((r) => r.name === 'h6-order-good.html' && r.width === w);
    assert(
      row?.notes.h6Order === H6_GOOD_ORDER,
      `h6-order-good @${w}: H6.0 extracts 13 items and ignores the one-segment category links in <nav>`,
      `got: ${row?.notes.h6Order}`,
    );
    assert(
      pick(h6, 'h6-order-good.html', w, 'category-diversity').length === 0,
      `h6-order-good @${w}: H6.1/6.2/6.3 all CLEAR — 5 at the cap, no adjacency, 6 categories`,
      listing(row, 'category-diversity'),
    );
    assert(
      pick(h6, 'h6-order-good.html', w, 'source-order').length === 0,
      `h6-order-good @${w}: H6.6 CLEAR — DOM order is reading order`,
      listing(row, 'source-order'),
    );
  }

  // THE H6.6 DISCRIMINATOR. Byte-identical item set, one CSS property apart.
  // `check-h6.sh` exits 0 on BOTH of these files — it reads HTML and this is a
  // computed value — which is the entire reason H6.6 is asserted here and not
  // there. Exactly one check may flip.
  for (const w of WIDTHS) {
    const row = h6.find((r) => r.name === 'h6-order-reversed.html' && r.width === w);
    const so = pick(h6, 'h6-order-reversed.html', w, 'source-order');
    assert(
      so.length === 1 && so[0].value === 12,
      `h6-order-reversed @${w}: H6.6 fires — column-reverse puts DOM item 12 in visual position 0`,
      listing(row, 'source-order'),
    );
    assert(
      pick(h6, 'h6-order-reversed.html', w, 'category-diversity').length === 0,
      `h6-order-reversed @${w}: H6.1/6.2/6.3 stay CLEAR — the SET did not change, only its painting order`,
      listing(row, 'category-diversity'),
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
} else if (has('empty-shell')) {
  const server = await startFixtureServer(false, FIXTURE_DIR, true);
  const rows = await measure(
    [
      {
        name: 'category.html (main emptied)',
        url: `http://127.0.0.1:${server.address().port}/category.html`,
      },
    ],
    { json, label: 'empty shell' },
  );
  server.close();
  const r = report(rows, { label: 'EMPTY SHELL — a real page with <main> emptied', quiet });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
} else if (has('h6-order')) {
  // The H6.6 pair on their own, for working on the check by hand.
  const server = await startFixtureServer(false, FIXTURES_ROOT);
  const b = `http://127.0.0.1:${server.address().port}`;
  const rows = await measure(
    [
      { name: 'h6-order-good.html', url: `${b}/h6-order-good.html`, homepage: true },
      { name: 'h6-order-reversed.html', url: `${b}/h6-order-reversed.html`, homepage: true },
    ],
    { json, label: 'h6 order pair' },
  );
  server.close();
  const r = report(rows, {
    label: 'H6 order fixtures (good must be clean; reversed must fire H6.6 only)',
    quiet,
  });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
} else if (has('discriminator')) {
  const server = await startFixtureServer(false, FIXTURES_ROOT);
  const rows = await measure(
    [
      {
        name: 'discriminator.html',
        url: `http://127.0.0.1:${server.address().port}/discriminator.html`,
      },
    ],
    { json, label: 'discriminator' },
  );
  server.close();
  const r = report(rows, { label: 'discriminator fixture', quiet });
  exit = r.errors > 0 ? 2 : r.failures > 0 ? 1 : 0;
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
    'usage: node scripts/ui-layout-gate.mjs (--fixtures [--green] | --discriminator | --h6-order | --empty-shell | --base <url> | --url <u>… | --selftest)\n' +
      '       [--json out.json] [--quiet] [--author-slug <slug>]\n' +
      '       env: UI_GATE_CHROME=<chrome path>  UI_GATE_BYPASS=<vercel preview bypass secret>',
  );
  console.log('UILINT EXIT: 2');
  process.exit(2);
}

console.log(`UILINT EXIT: ${exit}`);
process.exit(exit);
