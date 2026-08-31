/**
 * TOCLINT — the in-article contents gate. UI-18, 01 September 2026.
 *
 *   pnpm audit:toc                                   # walks https://hellokahwin.com
 *   pnpm audit:toc --base https://hellokahwin.com
 *   pnpm audit:toc --url https://hellokahwin.com/artikel/…/…   # one or more pages
 *   pnpm audit:toc --json
 *   pnpm audit:toc:selftest                          # paired fixtures, fires AND clears
 *   pnpm audit:toc --geometry --url <article url>    # measured tap boxes, needs Chrome
 *
 * Prints `TOCLINT EXIT: <n>` at the start of a line and exits with that code.
 *   0  every article obeys the rule
 *   1  at least one article violates it
 *   2  the run could not measure what it was pointed at (see PRECONDITION)
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * An article renders `nav.article-toc` IF AND ONLY IF its body carries two or
 * more `<h2>`. Every `href="#…"` in that nav resolves to an element with that
 * id in the SAME document. Both halves are asserted: a
 * gate that only checked presence would pass a contents list whose links all
 * 404 into the page, and a gate that only checked the anchors would pass an
 * article that has no contents list at all.
 *
 * THE FLOOR IS TWO, AND THIS GATE HOLDS IT RATHER THAN FOLLOWING IT.
 *
 * The first draft of this script read `TOC_MIN_HEADINGS` out of
 * `article-toc.tsx` and judged production by whatever it found. That was tidy
 * and it was wrong: raising the constant back to four would have moved the
 * gate's own definition of correct with it, and the run would have gone GREEN
 * on the exact regression this item exists to prevent. A gate that reads its
 * threshold from the thing it is auditing cannot fail. It was caught by
 * sabotaging the constant and watching this script stay green — not by reading
 * it.
 *
 * So `DOD_FLOOR` below is UI-18's definition of done, written here as a number
 * the code cannot renegotiate. The component's constant is still read, but only
 * to be COMPARED: if the two disagree the run stops at exit 2 and says which
 * document decides. Narrowing the DoD now requires editing a line that says it
 * is the DoD.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CORPUS IS RE-DERIVED, NEVER ASSUMED
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The brief that commissioned this said "0 of 85". It was 86 the morning it was
 * written and CONT-13/CONT-16 were adding eight more that week. Any number
 * baked into a script about a growing corpus is a number that is wrong on a
 * schedule. `<base>/sitemap.xml` is fetched on every run and the count is
 * printed in the header of every report.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PRECONDITION — exit 2, never a clean run
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Three items walked into the Vercel SSO login page on one day in Aug 2026,
 * enumerated ITS elements, found nothing wrong and exited 0. So before a single
 * article is judged:
 *
 *   1. the response is 200,
 *   2. `<html lang>` is `ms` — every public template sets it; Vercel's login
 *      page is `en-US`,
 *   3. the document contains exactly one `.inspire-prose` — the article body.
 *      A 200 carrying the right markers can still be a shell; a shell has no
 *      body, and a shell must never read as "no violations".
 *
 * Any of those failing is an ERROR for that page and the run exits 2.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AN ABSENCE IS ALWAYS REPORTED WITH WHAT IS ACTUALLY THERE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The census this item was dispatched from tested the live corpus for the
 * string `DALAM ARTIKEL INI`, got zero, and concluded the contents list "does
 * not exist at all". It existed on 63 of 86 articles, labelled `Isi Kandungan`.
 * Testing for the thing you assume is there can only ever return a number about
 * your assumption. So this gate never prints a bare zero: every page with no
 * contents list prints its actual heading census (`h2=0 h3=7 h4=5`) and every
 * page WITH one prints the label the page actually carries, read out of the DOM
 * rather than compared against a constant.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHAT COUNTS AS AN ARTICLE HEADING, AND WHY THE SERVED DOM IS NOT THE ANSWER
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * ⚠ DO NOT COUNT `<h2>` DOCUMENT-WIDE. Since UI-17's rail shipped, the page
 * chrome emits `<h2>`s of its own and an article with ZERO body headings serves
 * two of them:
 *
 *   <h2 class="s-label hk-rail-heading">Sumber</h2>            (the rail)
 *   <h2 id="related-articles-heading" class="s-label">…</h2>   (the footer)
 *
 * Measured on `/artikel/hantaran-mas-kahwin/mas-kahwin-ikut-negeri`, which has
 * `h3=7 h4=5` and no `<h2>` in its body at all: document-wide count 2, count
 * inside `.inspire-prose` 0. A reviewer auditing this item independently counted
 * document-wide, subtracted only the rail's TOC heading, and got 77 eligible
 * articles against the true 71 — six phantom eligibles, every one of them an
 * article that has a rail. Nothing was wrong with the pages.
 *
 * TWO DERIVATIONS EXIST AND THEY ARE NOT INTERCHANGEABLE:
 *
 *   ELIGIBILITY, in the component, is derived from the TIPTAP JSON —
 *   `groupHeadings(extractHeadings(content)).length >= TOC_MIN_HEADINGS` via
 *   `hasArticleToc()`. It counts `<h2>` GROUPS in the authored document and
 *   drops orphan `<h3>`s before counting. It cannot see page chrome, because
 *   page chrome is not in the article's content.
 *
 *   THIS GATE counts the served DOM, but SCOPED TO `.inspire-prose` and
 *   excluding `nav.article-toc`. That is a different derivation reaching the
 *   same number, which is the whole point of an external check — a gate that
 *   re-used the component's own function would agree with it by construction.
 *
 * The two are not assumed to agree; the `topLevelEntries !== out.h2` violation
 * further down is the assertion that they do, on every article, on every run. If
 * page chrome ever moves inside `.inspire-prose`, that check fires rather than
 * this file quietly counting the wrong thing.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVENANCE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A rendered measurement belongs to a BUILD, not to a URL. `x-vercel-id`,
 * `x-vercel-cache` and `age` are captured per page and summarised at the end.
 * There is no flag to turn that off.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '..');
const TOC_SOURCE = path.join(REPO, 'src', 'components', 'inspire', 'article-toc.tsx');
const FIXTURE_DIR = path.join(REPO, 'tests', 'article-toc', 'fixtures');

const SITE_LANG = 'ms';
const ARTICLE_URL = /^https?:\/\/[^/]+\/artikel\/[^/]+\/[^/]+$/;

/**
 * UI-18's definition of done, verbatim: "a generated table of contents renders
 * on every article carrying TWO OR MORE h2 headings … present on all of them
 * and absent on the rest". This number is the contract. It is not read from the
 * component, and it is not a default that the component can override.
 */
const DOD_FLOOR = 2;

/**
 * Read the component's constant — not to obey it, but to check it still agrees
 * with the DoD. Disagreement is exit 2: the gate has been pointed at a build
 * whose rule is not the rule it was written to enforce, and a verdict from it
 * would be about the wrong thing.
 */
function readComponentFloor() {
  const rel = path.relative(REPO, TOC_SOURCE);
  const src = fs.readFileSync(TOC_SOURCE, 'utf8');
  const m = src.match(/export const TOC_MIN_HEADINGS\s*=\s*(\d+)/);
  if (!m) {
    console.error(
      `TOCLINT: could not read TOC_MIN_HEADINGS from ${rel}. ` +
        `The gate refuses to guess it — a floor invented here is a floor nothing enforces.\n` +
        `TOCLINT EXIT: 2`,
    );
    process.exit(2);
  }
  const found = Number(m[1]);
  if (found !== DOD_FLOOR) {
    console.error(
      `TOCLINT: FLOOR MISMATCH. ${rel} sets TOC_MIN_HEADINGS = ${found}; UI-18's definition of\n` +
        `done fixes it at ${DOD_FLOOR} ("every article carrying two or more h2 headings").\n` +
        `\n` +
        `This is not a bug in the gate. Judging production by ${found} would make this script\n` +
        `agree with whatever the component happens to say, which is how a gate that cannot\n` +
        `fail gets written. If the floor is genuinely meant to move, the DoD moves first —\n` +
        `bring it back to the CEO, then change DOD_FLOOR here in the same commit.\n` +
        `TOCLINT EXIT: 2`,
    );
    process.exit(2);
  }
  return found;
}

// ── argv ─────────────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const value = (name, fallback) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : fallback;
};
const values = (name) =>
  argv.reduce((out, a, i) => (a === `--${name}` && argv[i + 1] ? [...out, argv[i + 1]] : out), []);

const BASE = (value('base', 'https://hellokahwin.com') || '').replace(/\/$/, '');
const AS_JSON = flag('json');
const CONCURRENCY = Number(value('concurrency', '6'));
const BYPASS = process.env.VERCEL_PROTECTION_BYPASS || '';

// ── the analysis, on a parsed document ───────────────────────────────────────

/**
 * Judge one article document. Pure: takes HTML, returns a verdict. The live
 * walk and the self-test fixtures both go through this, so a fixture proves
 * something about the code that runs against production rather than about a
 * second implementation of it.
 */
export function judgeArticle(html, { min, url = '(fixture)' }) {
  const dom = new JSDOM(html);
  const doc = dom.window.document;
  const out = { url, errors: [], violations: [] };

  const lang = doc.documentElement.getAttribute('lang');
  if (lang !== SITE_LANG) {
    out.errors.push(`NOT THIS SITE — <html lang="${lang}">, expected "${SITE_LANG}"`);
    return out;
  }

  const proses = doc.querySelectorAll('.inspire-prose');
  if (proses.length !== 1) {
    out.errors.push(
      `NOT AN ARTICLE BODY — found ${proses.length} .inspire-prose, expected exactly 1. ` +
        `A 200 with no body is a shell, not a clean page.`,
    );
    return out;
  }
  const prose = proses[0];

  // Every heading in the body, EXCLUDING the contents list's own markup. The
  // TOC contains no headings today; the filter is here so that stays true if it
  // ever grows one, rather than silently inflating the count it is judged by.
  const bodyHeadings = [...prose.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(
    (h) => !h.closest('nav.article-toc'),
  );
  const census = {};
  for (const h of bodyHeadings) {
    const t = h.tagName.toLowerCase();
    census[t] = (census[t] || 0) + 1;
  }
  out.census = census;
  out.h2 = census.h2 || 0;

  // ⚠ DOCUMENT-WIDE, NOT `prose.querySelectorAll`. This was scoped to
  // `.inspire-prose` for one afternoon and it was a latent false alarm: UI-17 is
  // relocating this same node into the 300px desktop rail, which is OUTSIDE the
  // prose container, and on the day that lands a prose-scoped lookup would have
  // reported `MISSING contents list` on every eligible article at once — a
  // sitewide red run caused entirely by the gate's own assumption about where
  // the component lives. The DoD says a contents list renders on the article. It
  // does not say which box it renders in, and neither does this check.
  //
  // The counting stays exact rather than becoming loose: `.article-toc` is the
  // signal (never a label string), exactly one per document, and the anchor
  // targets are still required to resolve INSIDE `.inspire-prose` — the headings
  // do not move when the nav does.
  const tocs = doc.querySelectorAll('nav.article-toc');
  out.tocCount = tocs.length;
  out.expectToc = out.h2 >= min;
  out.tocInProse = [...tocs].filter((t) => prose.contains(t)).length;
  out.tocOutsideProse = tocs.length - out.tocInProse;

  if (tocs.length > 1) {
    out.violations.push(
      `${tocs.length} contents lists in one document (${out.tocInProse} inside .inspire-prose, ` +
        `${out.tocOutsideProse} outside); expected at most 1. A relocation that leaves the ` +
        `inline render in place ships both.`,
    );
  }

  if (out.expectToc && tocs.length === 0) {
    out.violations.push(
      `MISSING contents list on an article with h2=${out.h2} (floor ${min}). ` +
        `Headings actually present: ${describeCensus(census)}`,
    );
  }
  if (!out.expectToc && tocs.length > 0) {
    out.violations.push(
      `UNEXPECTED contents list on an article with h2=${out.h2} (floor ${min}). ` +
        `Headings actually present: ${describeCensus(census)}`,
    );
  }

  const toc = tocs[0];
  if (toc) {
    // THE LABEL IS READ OUT OF THE PAGE, NEVER COMPARED AGAINST A STRING THIS
    // FILE HOLDS. That is the whole lesson of the census this item was
    // dispatched from. What the gate asserts is that the landmark HAS an
    // accessible name; what it REPORTS is the text it found and where it found
    // it, so a rename shows up as a changed value rather than as a zero.
    //
    // Three sources, in the order a screen reader resolves them, because
    // OWNERSHIP OF THE HEADING IS MOVING. Today `ArticleToc` renders its own
    // `.hk-eyebrow` and its own `aria-label`. UI-17's rail renders the heading
    // as a `.s-label` sibling of `Rekod` and `Sumber` and points at it with
    // `aria-labelledby`. Both are correct; a gate that only knew the first would
    // have failed every article the day the second shipped, and a gate that
    // dropped the assertion to accommodate it would stop noticing an unnamed
    // landmark altogether.
    const labelledBy = toc.getAttribute('aria-labelledby');
    const labelledByEl = labelledBy ? doc.getElementById(labelledBy) : null;
    const eyebrow = toc.querySelector('.hk-eyebrow');
    out.ariaLabel = toc.getAttribute('aria-label');
    if (out.ariaLabel) {
      out.label = out.ariaLabel.trim();
      out.labelFrom = 'aria-label';
    } else if (labelledByEl) {
      out.label = labelledByEl.textContent.trim();
      out.labelFrom = `aria-labelledby #${labelledBy}`;
    } else if (eyebrow) {
      out.label = eyebrow.textContent.trim();
      out.labelFrom = '.hk-eyebrow';
    } else {
      out.label = null;
      out.labelFrom = null;
    }
    if (labelledBy && !labelledByEl) {
      out.violations.push(
        `contents list points aria-labelledby at #${labelledBy}, which is not in this document`,
      );
    }
    if (!out.label) {
      out.violations.push(
        'contents list landmark has no accessible name — no aria-label, no resolvable ' +
          'aria-labelledby, and no .hk-eyebrow inside it',
      );
    }
    // Two visible headings is the failure mode of a half-done relocation: the
    // component keeps its own eyebrow AND the rail adds one.
    if (eyebrow && labelledByEl && !prose.contains(labelledByEl)) {
      out.violations.push(
        `contents list has TWO headings — its own .hk-eyebrow "${eyebrow.textContent.trim()}" ` +
          `and the container's "${labelledByEl.textContent.trim()}". Exactly one renders it.`,
      );
    }

    const links = [...toc.querySelectorAll('a[href]')];
    out.links = links.length;
    if (links.length === 0) out.violations.push('contents list renders no links');

    const dangling = [];
    const seen = new Set();
    for (const a of links) {
      const href = a.getAttribute('href') || '';
      if (!href.startsWith('#')) {
        out.violations.push(`contents entry links off-page: ${href}`);
        continue;
      }
      const id = decodeURIComponent(href.slice(1));
      if (!id) {
        out.violations.push('contents entry links to a bare "#"');
        continue;
      }
      if (seen.has(id)) out.violations.push(`contents lists #${id} twice`);
      seen.add(id);
      // getElementById, not [id="…"] — the resolution the browser performs when
      // the reader clicks, on the SAME document that served the link.
      const target = doc.getElementById(id);
      if (!target) dangling.push(id);
      else if (!prose.contains(target)) {
        out.violations.push(`#${id} resolves outside the article body (${target.tagName})`);
      }
    }
    if (dangling.length) {
      out.violations.push(
        `${dangling.length} contents link(s) resolve to no id in this document: ` +
          dangling.map((d) => `#${d}`).join(', ') +
          `. Ids that DO exist in the body: ` +
          (bodyHeadings
            .filter((h) => h.id)
            .map((h) => `#${h.id}`)
            .join(', ') || '(none)'),
      );
    }
    out.dangling = dangling.length;

    // Every top-level entry should correspond to an h2 the body carries. Not a
    // hard violation on its own — an h2 with unsluggable text is legitimate —
    // but reported, because a silent divergence between the two walks of the
    // document is the exact failure `heading-anchors.ts` was written to prevent.
    const topLinks = [...toc.querySelectorAll(':scope > ol > li > a')].length;
    out.topLevelEntries = topLinks;
    if (topLinks !== out.h2) {
      out.violations.push(
        `contents list has ${topLinks} top-level entr${topLinks === 1 ? 'y' : 'ies'} ` +
          `but the body has ${out.h2} h2`,
      );
    }
  }

  return out;
}

function describeCensus(c) {
  const keys = ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'].filter((k) => c[k]);
  return keys.length ? keys.map((k) => `${k}=${c[k]}`).join(' ') : 'none';
}

// ── the live walk ────────────────────────────────────────────────────────────

async function fetchPage(url) {
  // The header ALONE. `x-vercel-set-bypass-cookie` makes the edge answer with a
  // Set-Cookie redirect that undici follows straight into `redirect count
  // exceeded` — measured here on 01 Sept 2026, twice, on both fetch paths.
  const headers = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {};
  const r = await fetch(url, { headers, redirect: 'follow' });
  const html = await r.text();
  return {
    status: r.status,
    finalUrl: r.url,
    html,
    provenance: {
      status: r.status,
      vercelId: r.headers.get('x-vercel-id'),
      cache: r.headers.get('x-vercel-cache'),
      age: r.headers.get('age'),
    },
  };
}

/**
 * Classify sitemap URLs. PURE, and exported, so the paired self-test exercises
 * the SAME code the live walk uses rather than a second implementation of it.
 * Returns `{ articles, rehosted, skipped, unknown, categoryHubs }`; the caller
 * decides what to do about `unknown`.
 */
export function classifySitemap(locs, baseOrigin) {
  // ── WHICH SITEMAP URLs ARE ARTICLES, AND WHY IT IS NOT JUST THE SHAPE ──────
  //
  // The first version of this filter was `three path segments under /artikel/`
  // and nothing else. It was RIGHT on 01 Sept 2026 and it was right by accident.
  // `/artikel/tag/duit-hantaran` is a live, linked, 200-returning page carrying
  // ZERO `.inspire-prose`, and it matches that shape exactly — measured, not
  // reasoned about. It is not in the sitemap today. The day somebody adds tag
  // pages to the sitemap, which is an ordinary SEO change, every one of them
  // would be classified as an article, the `.inspire-prose` precondition would
  // fire `NOT AN ARTICLE BODY`, and this gate would exit 2 across the corpus and
  // point at a change that was correct.
  //
  // That is the same shape as scoping the TOC lookup to `.inspire-prose`: a
  // filter that happens to be right today because of what does not exist yet.
  // So the classification is POSITIVE and derived from the sitemap at run time,
  // like the count is:
  //
  //   a 3-segment /artikel/<a>/<b> is an ARTICLE iff `<a>` also appears in this
  //   same sitemap as a 2-segment /artikel/<a>, i.e. it is a real category hub.
  //
  // `author` and `tag` are the two reserved 3-segment routes today and are named
  // explicitly rather than left to fall out of the rule, so a reader can see
  // what is being skipped. Anything else 3-segment that is NOT a known category
  // is an ERROR and stops the run: silently dropping it would under-count the
  // corpus, and an under-counted corpus is a green run about the wrong set.
  const articles = [];
  const rehosted = [];
  const RESERVED_ARTIKEL_ROUTES = new Set(['author', 'tag']);
  const categoryHubs = new Set(
    locs
      .map((l) => l.match(/\/artikel\/([^/]+)$/))
      .filter(Boolean)
      .map((m) => m[1]),
  );
  const skipped = { reserved: [], notArticleShaped: 0 };
  const unknown = [];
  for (const loc of locs) {
    if (!ARTICLE_URL.test(loc)) {
      skipped.notArticleShaped += 1;
      continue;
    }
    const seg = new URL(loc).pathname.split('/')[2];
    if (RESERVED_ARTIKEL_ROUTES.has(seg)) {
      skipped.reserved.push(loc);
      continue;
    }
    if (!categoryHubs.has(seg)) {
      unknown.push(loc);
      continue;
    }
    const u = new URL(loc);
    if (u.origin !== baseOrigin) {
      rehosted.push(u.origin);
      articles.push(`${baseOrigin}${u.pathname}`);
    } else {
      articles.push(loc);
    }
  }
  return { articles, rehosted, skipped, unknown, categoryHubs };
}

/**
 * Derive the corpus. Three things here were wrong in the first version and each
 * of them produced a REASSURING result, which is why they are all spelled out.
 *
 * 1. THE BYPASS HEADER GOES ON THIS REQUEST TOO. Without it, a preview's
 *    `/sitemap.xml` returns **HTTP 200** — from vercel.com's login page. Zero
 *    `<loc>` elements, zero articles, and the whole run then reported
 *    `VIOLATIONS: none. TOCLINT EXIT: 0` over a corpus of nothing. Measured on
 *    this item's own preview, 01 Sept 2026, after the same trap had already
 *    cost three items in August.
 *
 * 2. AN EMPTY CORPUS IS EXIT 2. "No article breaks the rule" and "I found no
 *    articles" print the same line and mean opposite things.
 *
 * 3. THE SITEMAP'S URLs ARE NOT THE BASE'S URLs. `sitemap.ts` emits absolute
 *    production URLs, so a preview's sitemap lists `https://hellokahwin.com/…`
 *    — pointing this at a preview and walking those links would measure
 *    PRODUCTION and report it as the preview's verdict. Every URL is rehosted
 *    onto `--base`, and the rehosting is printed rather than done quietly.
 */
async function articleUrlsFromSitemap(base) {
  // The header ALONE. `x-vercel-set-bypass-cookie` makes the edge answer with a
  // Set-Cookie redirect that undici follows straight into `redirect count
  // exceeded` — measured here on 01 Sept 2026, twice, on both fetch paths.
  const headers = BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {};
  const r = await fetch(`${base}/sitemap.xml`, { headers });
  if (!r.ok) {
    console.error(
      `TOCLINT: ${base}/sitemap.xml returned ${r.status}. Cannot derive the corpus.\n` +
        `TOCLINT EXIT: 2`,
    );
    process.exit(2);
  }
  const xml = await r.text();
  const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  const baseOrigin = new URL(base).origin;
  const { articles, rehosted, skipped, unknown, categoryHubs } = classifySitemap(locs, baseOrigin);
  if (unknown.length) {
    console.error(
      `TOCLINT: ${unknown.length} sitemap URL(s) are shaped like an article but their first\n` +
        `segment is not a category hub in this same sitemap, and is not a reserved route\n` +
        `(${[...RESERVED_ARTIKEL_ROUTES].join(', ')}):\n` +
        unknown.map((u) => `  ${u}`).join('\n') +
        `\n\nThe run stops rather than guessing. Dropping them would under-count the corpus,\n` +
        `and a green run about the wrong set of pages is the failure this gate exists to\n` +
        `avoid. Either they are articles in a new category whose hub is missing from the\n` +
        `sitemap, or they are a new reserved route that belongs in RESERVED_ARTIKEL_ROUTES.\n` +
        `TOCLINT EXIT: 2`,
    );
    process.exit(2);
  }
  console.log(
    `TOCLINT — corpus filter: ${categoryHubs.size} category hub(s) read from this sitemap; ` +
      `${articles.length} article(s) kept, ${skipped.notArticleShaped} URL(s) not article-shaped ` +
      `(home, /artikel, category hubs), ${skipped.reserved.length} reserved-route URL(s) skipped` +
      (skipped.reserved.length ? `: ${skipped.reserved.join(', ')}` : ''),
  );
  if (locs.length === 0 || articles.length === 0) {
    console.error(
      `TOCLINT: ${base}/sitemap.xml parsed to ${locs.length} URL(s) and ${articles.length} ` +
        `article(s).\n` +
        `An empty corpus is NOT a clean run. HTTP ${r.status} here means very little on its\n` +
        `own — a Vercel preview behind SSO answers 200 with a login page, which is exactly\n` +
        `how this check first reported "VIOLATIONS: none" over nothing at all. If this is a\n` +
        `preview, pass VERCEL_PROTECTION_BYPASS (vault key vercelbypass.hellokahwin).\n` +
        `TOCLINT EXIT: 2`,
    );
    process.exit(2);
  }
  if (rehosted.length) {
    console.log(
      `TOCLINT — ${rehosted.length} sitemap URL(s) rehosted from ` +
        `${[...new Set(rehosted)].join(', ')} onto ${baseOrigin}: sitemap.ts emits absolute\n` +
        `          production URLs, so walking them verbatim would have measured production ` +
        `and called it ${baseOrigin}.`,
    );
  }
  return { total: locs.length, articles };
}

async function runLive(min) {
  const explicit = values('url');
  let sitemapTotal = null;
  let urls;
  if (explicit.length) {
    urls = explicit;
    console.log(`TOCLINT — ${urls.length} URL(s) given explicitly, corpus not walked`);
  } else {
    const found = await articleUrlsFromSitemap(BASE);
    sitemapTotal = found.total;
    urls = found.articles;
    console.log(
      `TOCLINT — corpus re-derived from ${BASE}/sitemap.xml at run time: ` +
        `${found.total} URLs, of which ${urls.length} are articles (/artikel/<kategori>/<slug>)`,
    );
  }
  console.log(
    `TOCLINT — floor ${min}, fixed here by UI-18's definition of done and confirmed to ` +
      `match TOC_MIN_HEADINGS in src/components/inspire/article-toc.tsx\n`,
  );

  const results = [];
  let next = 0;
  async function worker() {
    while (next < urls.length) {
      const url = urls[next++];
      try {
        const page = await fetchPage(url);
        if (page.status !== 200) {
          results.push({
            url,
            errors: [`HTTP ${page.status}`],
            violations: [],
            provenance: page.provenance,
          });
          continue;
        }
        if (new URL(page.finalUrl).origin !== new URL(url).origin) {
          results.push({
            url,
            errors: [`NOT THIS SITE — redirected to ${page.finalUrl}`],
            violations: [],
            provenance: page.provenance,
          });
          continue;
        }
        const verdict = judgeArticle(page.html, { min, url });
        verdict.provenance = page.provenance;
        results.push(verdict);
      } catch (e) {
        results.push({ url, errors: [`fetch failed: ${e.message}`], violations: [] });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, CONCURRENCY) }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));

  const errored = results.filter((r) => r.errors.length);
  const measured = results.filter((r) => !r.errors.length);
  const withToc = measured.filter((r) => r.tocCount > 0);
  const expected = measured.filter((r) => r.expectToc);
  const failing = measured.filter((r) => r.violations.length);

  // Enumerate, always. The label is printed as read; the heading census is
  // printed for every page with no contents list. Neither is a bare number.
  const labels = new Map();
  for (const r of withToc) labels.set(r.label, (labels.get(r.label) || 0) + 1);

  console.log(`articles measured                     ${measured.length}`);
  console.log(`articles with >= ${min} h2 (must have a TOC) ${expected.length}`);
  console.log(`articles rendering a TOC              ${withToc.length}`);
  // WHERE the contents list renders, across the WHOLE corpus, on every run.
  // UI-17 relocated it from `.inspire-prose` into the 300px rail; a relocation
  // that is 69-of-71 done looks identical to one that is finished unless the
  // placement is counted rather than sampled. Three articles agreeing proves
  // three articles.
  const inProse = withToc.filter((r) => r.tocInProse > 0).length;
  const outsideProse = withToc.filter((r) => r.tocOutsideProse > 0).length;
  const labelSources = new Map();
  for (const r of withToc) labelSources.set(r.labelFrom, (labelSources.get(r.labelFrom) || 0) + 1);
  console.log(
    `contents list placement              ` +
      `${outsideProse} outside .inspire-prose, ${inProse} inside` +
      (inProse && outsideProse ? `  <-- MIXED: a relocation only partly done` : ``),
  );
  console.log(
    `accessible name comes from           ` +
      ([...labelSources].map(([k, n]) => `${k} x${n}`).join(', ') || '(none)'),
  );
  console.log(
    `contents-list labels found            ` +
      ([...labels].map(([l, n]) => `"${l}" x${n}`).join(', ') || '(none)'),
  );
  console.log(
    `total contents links checked          ` +
      withToc.reduce((n, r) => n + (r.links || 0), 0) +
      `, dangling: ` +
      withToc.reduce((n, r) => n + (r.dangling || 0), 0),
  );

  const noToc = measured.filter((r) => r.tocCount === 0);
  console.log(`\narticles with NO contents list (${noToc.length}) — what IS on them:`);
  const shapes = new Map();
  for (const r of noToc) {
    const k = describeCensus(r.census);
    shapes.set(k, (shapes.get(k) || 0) + 1);
  }
  for (const [k, n] of [...shapes].sort((a, b) => b[1] - a[1])) console.log(`  ${n} x  ${k}`);

  if (errored.length) {
    console.log(`\nERRORS (${errored.length}) — these are not clean pages:`);
    for (const r of errored) console.log(`  ${r.url}\n    ${r.errors.join('\n    ')}`);
  }
  if (failing.length) {
    console.log(`\nVIOLATIONS (${failing.length} article(s)):`);
    for (const r of failing) console.log(`  ${r.url}\n    ${r.violations.join('\n    ')}`);
  } else {
    console.log(`\nVIOLATIONS: none.`);
  }

  const prov = new Map();
  for (const r of results) {
    if (!r.provenance) continue;
    const k = `${r.provenance.status} ${r.provenance.cache ?? '-'} ${(r.provenance.vercelId ?? '').split('::')[0]}`;
    prov.set(k, (prov.get(k) || 0) + 1);
  }
  console.log(`\nbuild fingerprint (status / x-vercel-cache / x-vercel-id region):`);
  for (const [k, n] of prov) console.log(`  ${n} x  ${k}`);
  console.log(`  measured at ${new Date().toISOString()}`);

  if (AS_JSON) console.log('\nJSON ' + JSON.stringify({ sitemapTotal, min, results }));

  // The same guard the sitemap walk carries, restated for `--url` runs: a run
  // that judged nothing has said nothing, and must not exit 0 saying it.
  if (measured.length === 0) {
    console.log(
      `\nNOTHING MEASURED — 0 article bodies were judged. That is a statement about this run,\n` +
        `not about the site. Read the ERRORS above before reading "VIOLATIONS: none".`,
    );
    console.log(`\nTOCLINT EXIT: 2`);
    process.exit(2);
  }

  const code = errored.length ? 2 : failing.length ? 1 : 0;
  console.log(`\nTOCLINT EXIT: ${code}`);
  process.exit(code);
}

// ── the self-test ────────────────────────────────────────────────────────────

/**
 * PAIRED assertions. A check seen only failing is half-proven, and the missing
 * half is the one that decides whether anyone can use it: a gate that flags
 * everything fails on a known-bad input and looks identical in the log.
 *
 * Each pair below differs in EXACTLY ONE thing. `good` must come back clean;
 * `bad` must come back dirty, and dirty for the stated reason and no other.
 */
function fixture(name) {
  return fs.readFileSync(path.join(FIXTURE_DIR, name), 'utf8');
}

async function runSelftest(min) {
  const cases = [
    // [file, expect: 'clean' | 'violation' | 'error', substring the message must contain]
    ['ok-four-h2.html', 'clean', null, 'four h2 and a matching contents list'],
    [
      'ok-below-floor-no-toc.html',
      'clean',
      null,
      'one h2 and NO contents list — the absent branch',
    ],
    [
      'bad-missing-toc.html',
      'violation',
      'MISSING contents list',
      'four h2, contents list removed',
    ],
    [
      'bad-toc-below-floor.html',
      'violation',
      'UNEXPECTED contents list',
      'one h2 with a contents list',
    ],
    [
      'bad-dangling-anchor.html',
      'violation',
      'resolve to no id in this document',
      'one href pointing at an id nothing carries',
    ],
    [
      'ok-toc-in-rail.html',
      'clean',
      null,
      'the SAME nav relocated OUTSIDE .inspire-prose into the rail, named by the rail heading',
    ],
    [
      'bad-toc-duplicated.html',
      'violation',
      '2 contents lists in one document',
      'relocated but the inline render was never deleted — production carries two',
    ],
    [
      'bad-toc-two-headings.html',
      'violation',
      'has TWO headings',
      'relocated but the component kept its own eyebrow — two headings stacked',
    ],
    ['bad-empty-shell.html', 'error', 'NOT AN ARTICLE BODY', 'a 200 with no article body'],
    ['bad-wrong-site.html', 'error', 'NOT THIS SITE', 'the Vercel SSO login page'],
  ];

  let failed = 0;
  // COUNTED, never `cases.length + n`. The hand-summed version was added to
  // twice and printed "0 of 11" on a run that had just executed FOURTEEN. A
  // total that is a separate claim from the run itself goes stale the moment
  // anyone adds a case, and a self-test that miscounts itself is the last
  // place that should happen.
  let ran = 0;
  console.log(
    `TOCLINT SELFTEST — floor ${min}, ${cases.length} fixture case(s) plus the ` +
      `corpus-filter and floor-sensitivity pairs
`,
  );
  for (const [file, expect, needle, why] of cases) {
    const v = judgeArticle(fixture(file), { min, url: file });
    const got = v.errors.length ? 'error' : v.violations.length ? 'violation' : 'clean';
    const msgs = [...v.errors, ...v.violations].join(' | ');
    let ok = got === expect;
    if (ok && needle) ok = msgs.includes(needle);
    if (ok && expect === 'clean') ok = msgs === '';
    ran++;
    if (!ok) failed++;
    console.log(
      `  ${ok ? 'PASS' : 'FAIL'}  ${file.padEnd(28)} expected ${expect.padEnd(9)} got ${got.padEnd(9)} — ${why}`,
    );
    if (!ok || process.env.TOCLINT_VERBOSE) console.log(`        ${msgs || '(no messages)'}`);
  }

  // ── the corpus filter, paired ──────────────────────────────────────────────
  // The old filter was `three segments under /artikel/`. It was right on 01 Sept
  // and right by accident: /artikel/tag/duit-hantaran is a live 200 with zero
  // .inspire-prose and matches that shape exactly. These three cases are what
  // stop it being right by accident again.
  const O = 'https://hellokahwin.com';
  const hub = `${O}/artikel/hantaran-mas-kahwin`;
  const art = `${O}/artikel/hantaran-mas-kahwin/duit-hantaran-kahwin`;
  const corpusCases = [
    [
      'a real article under a hub the sitemap also lists',
      [O, `${O}/artikel`, hub, art],
      (r) => r.articles.length === 1 && r.articles[0] === art && r.unknown.length === 0,
    ],
    [
      'a tag page, article-SHAPED but a reserved route — kept out, and named',
      [O, hub, art, `${O}/artikel/tag/duit-hantaran`],
      (r) =>
        r.articles.length === 1 &&
        r.skipped.reserved.length === 1 &&
        !r.articles.some((u) => u.includes('/tag/')) &&
        r.unknown.length === 0,
    ],
    [
      'an article whose category hub is MISSING — stops the run, never dropped',
      [O, hub, art, `${O}/artikel/kategori-baharu/sesuatu`],
      (r) => r.unknown.length === 1 && r.articles.length === 1,
    ],
  ];
  for (const [why, locs, ok] of corpusCases) {
    const r = classifySitemap(locs, O);
    const pass = ok(r);
    ran++;
    if (!pass) failed++;
    console.log(
      `  ${pass ? 'PASS' : 'FAIL'}  ${'(corpus filter)'.padEnd(28)} ` +
        `kept ${r.articles.length}, reserved ${r.skipped.reserved.length}, ` +
        `unknown ${r.unknown.length} — ${why}`,
    );
  }

  // The floor itself is paired: the SAME document is clean at floor 4 and dirty
  // at floor 2. Without this, "the gate reads the constant" is an assertion
  // about a regex, not about behaviour.
  const threeH2 = fixture('ok-below-floor-no-toc.html');
  const a = judgeArticle(threeH2, { min: 2, url: 'floor-2' });
  const b = judgeArticle(threeH2, { min: 1, url: 'floor-1' });
  const floorOk = a.violations.length === 0 && b.violations.length === 1;
  ran++;
  if (!floorOk) failed++;
  console.log(
    `  ${floorOk ? 'PASS' : 'FAIL'}  ${'(floor sensitivity)'.padEnd(28)} ` +
      `same doc: floor 2 -> ${a.violations.length} violation(s), floor 1 -> ${b.violations.length}`,
  );

  const code = failed ? 1 : 0;
  console.log(`
${failed} of ${ran} case(s) failed`);
  console.log(`TOCLINT EXIT: ${code}`);
  process.exit(code);
}

// ── the geometry mode (tap targets, UI-11's 24px floor) ──────────────────────

/**
 * `min-height: 24px` in a stylesheet is an intention. The box that matters is
 * `getBoundingClientRect()` on the anchor itself — vertical padding on a
 * `display:inline` box moves the paint and not the measurement, which is how a
 * padded link still measures 15.4px. So this mode loads real pages in real
 * Chrome and reads the real boxes.
 */
async function runGeometry() {
  const { chromium } = await import('playwright-core');
  const CHROME =
    process.env.UI_GATE_CHROME ??
    (process.platform === 'win32'
      ? 'C:/Program Files/Google/Chrome/Application/chrome.exe'
      : '/usr/bin/google-chrome');
  const TAP_MIN = Number(value('tap-min', '24'));
  const CLAMP = value('clamp', null) ? Number(value('clamp', null)) : null;
  const widths = (value('widths', '390,1440') || '').split(',').map(Number);
  let urls = values('url');
  if (!urls.length) {
    const found = await articleUrlsFromSitemap(BASE);
    urls = found.articles.slice(0, 3);
    console.log(`TOCLINT GEOMETRY — no --url given; taking 3 of ${found.articles.length} articles`);
  }

  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  let failures = 0;
  let measured = 0;
  let blocked = 0;
  for (const url of urls) {
    for (const width of widths) {
      const ctx = await browser.newContext({
        viewport: { width, height: 900 },
        deviceScaleFactor: 1,
        isMobile: width < 768,
        extraHTTPHeaders: BYPASS ? { 'x-vercel-protection-bypass': BYPASS } : {},
      });
      const page = await ctx.newPage();
      const resp = await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 });
      // A webfont changes every advance width on the page; read no geometry
      // before the faces have settled.
      // `--clamp <px>` constrains the contents list to a width the SHIPPED page
      // does not yet impose, so the 24px tap floor can be proven at the rail's
      // inner measure before the rail exists. This is a measurement of the real
      // node, in the real page, with the real webfonts — not a mock — but it is
      // NOT a measurement of the rail, and nothing that comes out of it may be
      // quoted as one. Re-run without the flag once the rail is on production
      // and take the number the rail actually produces.
      if (CLAMP) {
        await page.addStyleTag({
          content:
            `nav.article-toc{width:${CLAMP}px!important;max-width:${CLAMP}px!important;` +
            `margin-left:0!important;margin-right:0!important}`,
        });
        await page.evaluate(() => document.fonts.ready);
      }
      await page.evaluate(() => document.fonts.ready);
      const guard = await page.evaluate(() => ({
        origin: location.origin,
        lang: document.documentElement.lang,
      }));
      if (guard.origin !== new URL(url).origin || guard.lang !== SITE_LANG) {
        console.log(`  BLOCKED ${url} @${width} — origin ${guard.origin} lang ${guard.lang}`);
        blocked++;
        await ctx.close();
        continue;
      }
      const rows = await page.evaluate(() => {
        const out = [];
        for (const a of document.querySelectorAll('nav.article-toc a')) {
          const r = a.getBoundingClientRect();
          out.push({
            text: a.textContent.trim().slice(0, 48),
            href: a.getAttribute('href'),
            w: Math.round(r.width * 10) / 10,
            h: Math.round(r.height * 10) / 10,
            display: getComputedStyle(a).display,
          });
        }
        return {
          layoutWidth: document.documentElement.clientWidth,
          tocs: document.querySelectorAll('nav.article-toc').length,
          out,
        };
      });
      const bad = rows.out.filter((r) => r.h < TAP_MIN);
      failures += bad.length;
      measured += rows.out.length;
      const h = rows.out.map((r) => r.h);
      console.log(
        `  ${url} @${width} (layout ${rows.layoutWidth}) — toc=${rows.tocs} ` +
          `anchors=${rows.out.length} height min=${h.length ? Math.min(...h) : '-'} ` +
          `max=${h.length ? Math.max(...h) : '-'} display=${[...new Set(rows.out.map((r) => r.display))].join('/') || '-'} ` +
          (CLAMP ? `CLAMPED-TO-${CLAMP}px ` : '') +
          `under ${TAP_MIN}px: ${bad.length}` +
          (resp ? ` [${resp.status()} ${resp.headers()['x-vercel-cache'] ?? '-'}]` : ''),
      );
      for (const b of bad) console.log(`      ${b.h}px  ${b.href}  ${b.text}`);
      await ctx.close();
    }
  }
  await browser.close();
  console.log(`\n${measured} contents anchor(s) measured, ${failures} under ${TAP_MIN}px`);
  // A ZERO IS A CLAIM ABOUT THE RIG, NOT ABOUT THE PAGE. "0 targets under 24px"
  // and "I never found a contents list" print the same reassuring line and mean
  // opposite things. Measuring nothing is exit 2, never a pass.
  if (!measured) {
    console.log(
      `NOTHING MEASURED — no nav.article-toc anchor was found on any URL given. That is a\n` +
        `statement about this run, not a clean bill of health. Point it at an article with\n` +
        `two or more h2 (\`pnpm audit:toc\` lists which ones those are).`,
    );
    console.log(`TOCLINT EXIT: 2`);
    process.exit(2);
  }
  const code = blocked ? 2 : failures ? 1 : 0;
  console.log(`TOCLINT EXIT: ${code}`);
  process.exit(code);
}

// ── entry ────────────────────────────────────────────────────────────────────

const MIN = readComponentFloor();
if (flag('selftest')) await runSelftest(MIN);
else if (flag('geometry')) await runGeometry();
else await runLive(MIN);
