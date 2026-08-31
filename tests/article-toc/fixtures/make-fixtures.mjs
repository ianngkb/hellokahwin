/**
 * Regenerate the TOCLINT self-test fixtures from a real production article.
 *
 *   node tests/article-toc/fixtures/make-fixtures.mjs [source-article-url]
 *
 * These are CAPTURES, not hand-written markup. A fixture somebody typed proves
 * things about the typist; a fixture cut from the page the gate runs against
 * proves things about the page. Every one below is the same live document with
 * exactly ONE thing changed, which is what makes the paired assertions in
 * `scripts/audit-article-toc.mjs --selftest` mean anything: the `bad-` case and
 * its `ok-` partner differ in the single feature the check is supposed to see,
 * so a check that clears one and fires on the other has been shown to
 * discriminate rather than merely to be loud.
 *
 * The capture keeps every element the gate inspects — `.inspire-prose`, the
 * `nav.article-toc` and its links, the headings and their ids — and drops the
 * body copy, images and scripts, which it never looks at. Provenance (source
 * URL, fetch date, x-vercel-id) is written into each file as a comment, because
 * a captured measurement belongs to a BUILD and not to a URL.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SOURCE =
  process.argv[2] || 'https://hellokahwin.com/artikel/hantaran-mas-kahwin/hantaran-kahwin';

const res = await fetch(SOURCE);
const html = await res.text();
const STAMP = `<!-- TOCLINT fixture. Captured from ${SOURCE}
     on ${new Date().toISOString()} — HTTP ${res.status}, x-vercel-id ${res.headers.get('x-vercel-id')},
     x-vercel-cache ${res.headers.get('x-vercel-cache')}.
     Regenerate: node tests/article-toc/fixtures/make-fixtures.mjs
     DO NOT hand-edit: each file differs from ok-four-h2.html in exactly one
     feature, and that is the only reason the paired self-test proves anything. -->`;

const doc = new JSDOM(html).window.document;
const sourceProse = doc.querySelector('.inspire-prose');
if (!sourceProse) throw new Error(`no .inspire-prose at ${SOURCE}`);

/** The subset the gate reads: the contents nav, then every heading, in order. */
function skeleton(proseEl) {
  const parts = [];
  const toc = proseEl.querySelector('nav.article-toc');
  if (toc) parts.push(toc.outerHTML);
  for (const h of proseEl.querySelectorAll('h1,h2,h3,h4,h5,h6')) {
    if (h.closest('nav.article-toc')) continue;
    parts.push(h.outerHTML);
  }
  return parts.join('\n        ');
}

function page(bodyInner, { lang = 'ms' } = {}) {
  return `<html lang="${lang}">
  <head><meta charset="utf-8"><title>Fixture</title></head>
  <body>
    <header><a href="/">HelloKahwin</a></header>
    <main>
${bodyInner}
    </main>
    <footer><h2 class="s-label" id="related-articles-heading">Lagi dalam Hantaran &amp; Mas Kahwin</h2></footer>
  </body>
</html>`;
}

const prose = (inner) => `      <div class="inspire-prose">\n        ${inner}\n      </div>`;
const parse = (src) => new JSDOM(src).window.document;
const write = (name, docOrString) => {
  const body =
    typeof docOrString === 'string' ? docOrString : docOrString.documentElement.outerHTML;
  const out = `<!doctype html>\n${STAMP}\n${body}\n`;
  fs.writeFileSync(path.join(HERE, name), out);
  console.log(`wrote ${name.padEnd(28)} ${out.length} bytes`);
};

// ── 1. the green control: the live article, unmodified ───────────────────────
const base = page(prose(skeleton(sourceProse)));
const baseDoc = parse(base);
const h2s = [...baseDoc.querySelectorAll('.inspire-prose h2')].filter(
  (h) => !h.closest('nav.article-toc'),
);
if (h2s.length < 4) throw new Error(`source article has only ${h2s.length} h2; pick a longer one`);
if (!baseDoc.querySelector('nav.article-toc'))
  throw new Error(`source article renders no contents list; pick one that does`);
write('ok-four-h2.html', baseDoc);

// ── 2. the same document with the contents list removed, and nothing else ────
const missing = parse(base);
missing.querySelector('nav.article-toc').remove();
write('bad-missing-toc.html', missing);

// ── 3. the same document with ONE heading id renamed under the link ──────────
const dangling = parse(base);
const firstLink = dangling.querySelector('nav.article-toc a[href^="#"]');
const targetId = decodeURIComponent(firstLink.getAttribute('href').slice(1));
dangling.getElementById(targetId).id = `${targetId}-renamed-by-an-editor`;
write('bad-dangling-anchor.html', dangling);

// ── 4. below the floor, no contents list — the ABSENT branch's green control ─
const below = parse(base);
below.querySelector('nav.article-toc').remove();
[...below.querySelectorAll('.inspire-prose h2')].slice(1).forEach((h) => h.remove());
const belowHtml = below.documentElement.outerHTML;
write('ok-below-floor-no-toc.html', belowHtml);

// ── 5. below the floor WITH a contents list — differs from 4 in one thing ────
const belowToc = parse(belowHtml);
const kept = belowToc.querySelector('.inspire-prose h2');
const nav = belowToc.createElement('nav');
nav.setAttribute('aria-label', 'Dalam artikel ini');
nav.className = 'article-toc';
nav.innerHTML =
  `<p class="hk-eyebrow">Dalam artikel ini</p>` +
  `<ol><li><a href="#${kept.id}">${kept.textContent.trim()}</a></li></ol>`;
belowToc.querySelector('.inspire-prose').prepend(nav);
write('bad-toc-below-floor.html', belowToc);

// ── 6, 7, 8. THE RELOCATED SHAPE, and the two ways it goes wrong ────────────
//
// UI-17 moves this same node into the 300px desktop rail, OUTSIDE
// `.inspire-prose`, and renders the `Dalam artikel ini` heading itself as a
// `.s-label` sibling of `Rekod` and `Sumber`, pointing at it with
// `aria-labelledby`. These three exist so the gate is proven against that shape
// BEFORE it ships, rather than going sitewide red on the morning it lands.
const relocated = (opts = {}) => {
  const d = parse(base);
  const nav = d.querySelector('nav.article-toc');
  nav.removeAttribute('aria-label');
  if (!opts.keepOwnHeading) nav.querySelector('.hk-eyebrow').remove();
  nav.setAttribute('aria-labelledby', 'rail-toc-heading');
  const rail = d.createElement('aside');
  rail.setAttribute('data-hk-rail', '');
  rail.innerHTML =
    `<div class="s-label">Rekod</div>` +
    `<div class="s-label" id="rail-toc-heading">Dalam artikel ini</div>`;
  // The inline copy is REMOVED unless we are building the double-render case.
  const moved = opts.leaveInlineCopy ? nav.cloneNode(true) : nav;
  if (!opts.leaveInlineCopy) nav.remove();
  rail.appendChild(moved);
  d.querySelector('main').appendChild(rail);
  return d;
};

/** The target shape: one nav, in the rail, named by the rail's heading. */
write('ok-toc-in-rail.html', relocated());

/** Relocated but the inline render was never deleted. Production carries TWO. */
write('bad-toc-duplicated.html', relocated({ leaveInlineCopy: true }));

/** Relocated but the component kept its own eyebrow. Two headings, stacked. */
write('bad-toc-two-headings.html', relocated({ keepOwnHeading: true }));

// ── 6. a 200 with no article body — a shell must never read as "clean" ───────
write('bad-empty-shell.html', page('      <div class="s-pad"><p>Ralat.</p></div>'));

// ── 7. the wall three items measured by mistake in Aug 2026 ──────────────────
write(
  'bad-wrong-site.html',
  page(
    prose(
      `<nav class="article-toc"><p class="hk-eyebrow">Contents</p>` +
        `<ol><li><a href="#login">Log in</a></li><li><a href="#sso">SSO</a></li></ol></nav>\n` +
        `        <h2 id="login">Log in to Vercel</h2>\n        <h2 id="sso">Continue with SAML SSO</h2>`,
    ),
    { lang: 'en-US' },
  ),
);
