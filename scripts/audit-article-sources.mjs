/**
 * UI-19 — how many live articles the rail's `Sumber` block can speak for, and
 * how many carry a source it cannot see.
 *
 *   node scripts/audit-article-sources.mjs
 *   node scripts/audit-article-sources.mjs --base https://hellokahwin.com --json out.json
 *
 * Prints `SOURCES EXIT: <n>` at the start of a line. 0 = the census ran over a
 * corpus it could read; 2 = it could not, and no number below it is usable.
 * It does NOT exit non-zero on the gap it reports: the gap is a decision that
 * has not been taken, not a regression.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS IS A SCRIPT AND NOT A COMMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `src/lib/inspire/article-sources.ts` and
 * `src/design-system/components/article-rail.tsx` both carry a corpus figure in
 * prose — "34 of 86", "52 of 86 articles that carry no citation" — measured on
 * 01 Sep 2026. On 02 Sep 2026 the corpus was 92 and the rail-visible figure was
 * 13. Neither number was wrong when it was written and both were wrong a day
 * later, because a number in a comment cannot be re-measured by the person
 * reading it. This file is the number's home; the comments point here.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * "SOURCES EXIST" IS ANSWERED THREE DIFFERENT WAYS ON THIS CORPUS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The CEO ruling UI-19 ships under is that `Sumber` renders where sources
 * exist. Measured 02 Sep 2026 over all 92 article URLs in the sitemap, the
 * corpus answers that question three ways and they do not agree:
 *
 *   rail Sumber block           13     a standalone `Sumber:` paragraph, which
 *                                      is what `extractSources()` lifts
 *   body `## Sumber` section    13     an `<h2 id="sumber">` with a reference
 *                                      list under it, written as prose
 *   the text `Sumber:` anywhere  35     including mid-sentence, deliberately
 *                                      not lifted
 *
 * The first two sets are DISJOINT — 26 articles are sourced by one convention
 * or the other and no article uses both. So the rail speaks for exactly half of
 * the sourced corpus, and the 13 articles in the second set show a reader a
 * full reference list in the body while the rail says nothing.
 *
 * That is a finding, not a defect this script is entitled to fix. Widening
 * `extractSources()` to harvest `## Sumber` sections is a design decision with
 * a real cost — those entries run to full bibliographic references and the rail
 * column is a measured 268px — and it changes what the CEO ruling means. It is
 * raised here with its number so somebody can take it deliberately.
 */
import fs from 'node:fs';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (has(n) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const BASE = opt('base', 'https://hellokahwin.com');

/**
 * Literal substring counting. NOT a regex, and not `grep -o -i -F`, which
 * returns 0 in this repo's GNU grep 3.0 and reproduces on a 23-byte file. The
 * first version of this census used `new RegExp` over a string carrying an
 * escape pair, lost one backslash on the way in, and reported ZERO rail blocks
 * on all 92 articles — for markup a browser had measured twenty minutes
 * earlier. A zero is a claim about the check until the check is proved.
 */
const count = (hay, needle) => {
  let n = 0;
  let i = 0;
  for (;;) {
    i = hay.indexOf(needle, i);
    if (i < 0) return n;
    n++;
    i += needle.length;
  }
};

async function get(url) {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      if (attempt === 2) throw e;
    }
  }
}

let sitemap;
try {
  sitemap = await get(`${BASE}/sitemap.xml`);
} catch (e) {
  console.error(`could not read ${BASE}/sitemap.xml — ${e.message}`);
  console.log('SOURCES EXIT: 2');
  process.exit(2);
}

const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const articles = urls.filter((u) => /\/artikel\/[^/]+\/[^/]+$/.test(u));
if (articles.length === 0) {
  console.error(
    `${urls.length} sitemap urls and ZERO matched the article shape — check the filter`,
  );
  console.log('SOURCES EXIT: 2');
  process.exit(2);
}

const rows = [];
const failed = [];
for (const url of articles) {
  let html;
  try {
    html = await get(url);
  } catch (e) {
    failed.push(`${url} :: ${e.message}`);
    continue;
  }
  rows.push({
    url: url.replace(BASE, ''),
    // A Next.js page carries its markup twice — once streamed, once in the RSC
    // flight payload — so any raw text count over the response is exactly
    // double. The two attribute forms below appear once each because the flight
    // payload escapes its quotes; `Sumber:` does not, and is halved.
    railBlock: count(html, 'data-hk-rail-block="sumber"'),
    bodySection: count(html, '<h2 id="sumber">'),
    anySumberPrefix: count(html, 'Sumber:') / 2,
    bytes: html.length,
  });
}

const withRail = rows.filter((r) => r.railBlock > 0);
const withBody = rows.filter((r) => r.bodySection > 0);
const both = rows.filter((r) => r.railBlock > 0 && r.bodySection > 0);
const gap = rows.filter((r) => r.railBlock === 0 && r.bodySection > 0);
const neither = rows.filter((r) => r.railBlock === 0 && r.bodySection === 0);
const anyPrefix = rows.filter((r) => r.anySumberPrefix > 0);

console.log(`\nARTICLE SOURCES — ${BASE}`);
console.log('─'.repeat(78));
console.log(`sitemap urls                          ${urls.length}`);
console.log(`article urls                          ${articles.length}`);
console.log(
  `fetched                               ${rows.length}${failed.length ? `  (${failed.length} FAILED)` : ''}`,
);
for (const f of failed) console.log(`  FAILED ${f}`);
console.log('');
console.log(`rail Sumber block rendered            ${withRail.length}`);
console.log(`body "## Sumber" section              ${withBody.length}`);
console.log(`both                                  ${both.length}`);
console.log(`the text "Sumber:" anywhere in body   ${anyPrefix.length}`);
console.log(`sourced by EITHER convention          ${withRail.length + gap.length}`);
console.log(`sourced by NEITHER                    ${neither.length}`);
console.log('');
console.log(`SOURCED IN THE BODY, SILENT IN THE RAIL — ${gap.length}`);
for (const r of gap) console.log(`  ${r.url}`);
console.log('');
console.log(`RAIL SUMBER BLOCK RENDERS ON — ${withRail.length}`);
for (const r of withRail) console.log(`  ${r.url}`);
console.log('─'.repeat(78));

// The zero that would matter most, and the only one this file refuses to print
// quietly. If the rail block count ever reaches 0 across the whole corpus, the
// likely cause is a renamed attribute, not 92 articles losing their citations.
if (withRail.length === 0)
  console.log(
    'WARNING: zero rail Sumber blocks across the entire corpus. Before reading that as a\n' +
      '         content finding, check that [data-hk-rail-block="sumber"] is still the\n' +
      '         attribute the template emits — a selector rename looks exactly like this.',
  );

const json = opt('json', null);
if (json)
  fs.writeFileSync(
    json,
    JSON.stringify({ base: BASE, at: new Date().toISOString(), rows }, null, 1),
  );

console.log(`SOURCES EXIT: ${failed.length ? 2 : 0}`);
process.exit(failed.length ? 2 : 0);
