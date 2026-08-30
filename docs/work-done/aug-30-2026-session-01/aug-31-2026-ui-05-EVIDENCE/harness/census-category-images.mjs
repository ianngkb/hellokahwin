/**
 * UI-05 — the category-image census, counted in the DOM.
 *
 *   node census-category-images.mjs [base-url]
 *   node census-category-images.mjs https://hellokahwin.com
 *
 * Answers the question UI-05 was raised on: how many category pages carry
 * photography, and which do not. It discovers every category from /artikel
 * rather than taking a hardcoded list, so it stays true as categories are
 * added.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A BROWSER SCRIPT AND NOT A GREP — read before "simplifying" it
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A Next.js App Router document contains the page TWICE: once as rendered HTML,
 * and again as the serialised RSC flight payload inside <script> tags. Any
 * PLAIN-TEXT pattern grepped over that document therefore returns exactly
 * double.
 *
 * This is not hypothetical. UI-05's first draft reported "eight empty clusters
 * across four pillars" from
 *
 *     grep -o 'akan datang tidak lama lagi' page.html | wc -l
 *
 * The real figure is FOUR across THREE. Every promise line was counted twice.
 * It read as a plausible number and it survived being run a second time,
 * because running the same wrong method twice agrees with itself.
 *
 * Patterns anchored to unescaped attribute syntax — `<img`, `id="cluster-`,
 * `href="…"` — do survive, because the flight payload writes quotes as \".
 * That was verified against the DOM, not assumed: grep and querySelectorAll
 * agree exactly on those three. But the safe/unsafe distinction is subtle
 * enough that the reliable rule is simply to count in the DOM.
 *
 * Requires playwright-core and the installed Chrome. Deliberately not a
 * dependency of the app; Claude-in-Chrome is not connected in the worktrees.
 */
import { chromium } from 'playwright-core';

const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = (process.argv[2] ?? 'https://hellokahwin.com').replace(/\/$/, '');

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
});
const page = await ctx.newPage();

// Discover categories from the hub rather than hardcoding them.
await page.goto(`${BASE}/artikel`, { waitUntil: 'networkidle', timeout: 60000 });
const slugs = await page.evaluate(() =>
  [
    ...new Set(
      [...document.querySelectorAll('a[href^="/artikel/"]')]
        .map((a) => a.getAttribute('href'))
        .filter((h) => /^\/artikel\/[a-z0-9-]+$/.test(h))
        .map((h) => h.split('/')[2]),
    ),
  ].sort(),
);

const rows = [];
for (const slug of slugs) {
  const res = await page.goto(`${BASE}/artikel/${slug}`, {
    waitUntil: 'networkidle',
    timeout: 60000,
  });
  const m = await page.evaluate(() => {
    const clusters = document.querySelectorAll('section[aria-labelledby^="cluster-"]').length;
    const promises = [...document.querySelectorAll('p.s-meta')].filter((e) =>
      /akan datang tidak lama lagi/.test(e.textContent),
    ).length;
    return {
      img: document.querySelectorAll('img').length,
      clusters,
      emptyClusters: promises,
      // A pillar is identified by its clusters, never by a slug list.
      isPillar: clusters > 0,
      links: document.querySelectorAll(
        'a.s-pillar-link, a.s-row, a.s-card, a.s-imgless',
      ).length,
      emptyState: document.querySelectorAll('.s-empty').length,
    };
  });
  rows.push({ slug, status: res.status(), ...m });
}
await browser.close();

const pillars = rows.filter((r) => r.isPillar);
const grids = rows.filter((r) => !r.isPillar);
const zero = rows.filter((r) => r.img === 0);

const pad = (v, n) => String(v).padStart(n);
console.log(`\n${BASE}  ·  ${new Date().toISOString().slice(0, 10)}\n`);
console.log('slug'.padEnd(34), 'http', ' img', 'clus', 'empt', 'link', 'type');
for (const r of rows) {
  console.log(
    r.slug.padEnd(34),
    pad(r.status, 4),
    pad(r.img, 4),
    pad(r.clusters, 4),
    pad(r.emptyClusters, 4),
    pad(r.links, 4),
    r.isPillar ? 'pillar' : 'grid',
  );
}

console.log(`\n  categories          ${rows.length}`);
console.log(`  carry photography   ${rows.filter((r) => r.img > 0).length}`);
console.log(`  render zero images  ${zero.length}   (${zero.map((r) => r.slug).join(', ')})`);
console.log(`  pillar hubs         ${pillars.length}`);
console.log(`  grid categories     ${grids.length}`);
console.log(`  empty clusters      ${rows.reduce((a, r) => a + r.emptyClusters, 0)}`);

// UI-05's decision, as an assertion. Pillar hubs are deliberately text-only;
// a pillar hub that gains an image means the decision was reversed by accident
// rather than on purpose. See docs/design/ui-05-imej-hab-pilar.html §8 for the
// three conditions that reverse it deliberately.
const violations = pillars.filter((r) => r.img > 0);
if (violations.length) {
  console.error(
    `\nFAIL: ${violations.length} pillar hub(s) now render images: ` +
      violations.map((r) => `${r.slug} (${r.img})`).join(', ') +
      `\nThis contradicts UI-05. Either it was intended — in which case update` +
      `\ndocs/design/ui-05-imej-hab-pilar.html §8 — or it is a regression.`,
  );
  process.exit(1);
}
console.log('\nOK: no pillar hub renders images (UI-05).');
