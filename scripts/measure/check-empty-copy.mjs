#!/usr/bin/env node
/**
 * check-empty-copy.mjs — the gate for COPY-01's decision, run against the
 * public URLs a stranger fetches.
 *
 * WHY THIS EXISTS. DES-07 §11.3 escalated two copy decisions to the managing
 * editor on 28 Aug 2026 and nobody answered. DES-03 §7.2 C then recorded, as
 * settled fact, that the replacement had ALREADY happened — "Copy carried
 * verbatim from DES-07 §9.3/§10.2, which already replaced production's
 * undatable 'akan datang tidak lama lagi' line". It had not. The line was
 * still live on 4 empty clusters across 3 of 15 pillars on 02 Sept 2026,
 * after DES-08 was meant to have rebuilt those pages.
 *
 * A prose rule did not fire. Two documents said the line was gone while the
 * line was being served. So this is a script, and it reads production.
 *
 * WHAT IT CHECKS. For every pillar page in the sitemap, bounded before
 * </main> so the RSC flight payload cannot leak a match:
 *
 *   1. The undatable promise "akan datang tidak lama lagi" appears NOWHERE.
 *   2. Every empty cluster (a cluster <section> with no article links) carries
 *      exactly the approved COPY-01 row:
 *          "Belum ada artikel di sini."           (totalArticles === 0)
 *          "Belum ada artikel di sini. Halaman ini ada N artikel lain."
 *      where N is the count of DISTINCT article links on the page.
 *   3. DES-03 §7.2 C's empty-CATEGORY copy ("Kategori ini masih kosong.")
 *      never appears on a pillar that has articles. That is the trap COPY-01
 *      was written around: §7.2 C is the fully-empty-CATEGORY state (K3), not
 *      the empty-CLUSTER-inside-a-populated-pillar state (K4), and copying it
 *      across would tell a reader on a six-article pillar that the category is
 *      empty.
 *
 * It ENUMERATES first and asserts second — every cluster on every pillar is
 * printed with its count, so a zero can never pass as "nothing to check". Nine
 * of the company's tabulated bad checks were a zero that meant nothing.
 *
 * Usage:
 *   node scripts/measure/check-empty-copy.mjs [--sitemap <url>] [--dir <path>]
 *   node scripts/measure/check-empty-copy.mjs --selftest
 *
 * --dir runs against a directory of saved <pillar-slug>.html files instead of
 * the network, which is how you check a preview deployment or a captured
 * "before".
 *
 * Exit codes:
 *   0  every pillar passes.
 *   1  at least one violation. Every failing pillar is printed with its row.
 *   3  could not fetch, or usage error. NOT a verdict about the site.
 *
 * NOTE ON grep, for anyone tempted to reimplement this in bash: NEVER COMBINE
 * -o -i -F. It returns 0 in GNU grep 3.0 (this Git Bash build) and reproduces
 * on a 23-byte file. That is why this is JavaScript.
 */

import fs from 'node:fs';
import path from 'node:path';

const BANNED_PROMISE = 'akan datang tidak lama lagi';
const EMPTY_CATEGORY_COPY = 'Kategori ini masih kosong.';
const HERE = 'Belum ada artikel di sini.';

/** The approved COPY-01 row, given the page's distinct article count. */
export function approvedRow(totalArticles) {
  return totalArticles > 0 ? `${HERE} Halaman ini ada ${totalArticles} artikel lain.` : HERE;
}

const decode = (s) =>
  s
    .replace(/<!--[^>]*-->/g, '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/**
 * Parse one pillar page. Everything from </main> on is dropped first: the RSC
 * flight payload re-serialises every string on the page, and UX-03 lost time
 * to exactly that — a populated cluster flagged empty because the payload
 * below it mentioned the empty-state sentence.
 */
export function parsePillar(rawHtml) {
  const endMain = rawHtml.indexOf('</main>');
  const html = endMain > 0 ? rawHtml.slice(0, endMain) : rawHtml;

  const starts = [];
  const secRe = /<section aria-labelledby="cluster-([^"]+)"/g;
  let m;
  while ((m = secRe.exec(html))) starts.push({ id: m[1], at: m.index });

  const clusters = starts.map((s, i) => {
    const nextAt = starts[i + 1]?.at ?? html.length;
    const close = html.indexOf('</section>', s.at);
    const body = html.slice(s.at, close < 0 ? nextAt : Math.min(close, nextAt));
    const h2 = body.match(/<h2[^>]*>(.*?)<\/h2>/s);
    const hrefs = [...body.matchAll(/<a[^>]*href="(\/artikel\/[^"]+\/[^"]+)"/g)].map((x) => x[1]);
    const row = body.match(/<p class="s-meta"[^>]*>(.*?)<\/p>/s);
    return {
      id: s.id,
      name: decode(h2 ? h2[1] : s.id),
      hrefs,
      count: hrefs.length,
      row: row ? decode(row[1]) : null,
    };
  });

  // The number the copy claims: DISTINCT articles across the pillar's cluster
  // sections, which is what `PillarView.totalArticles` is (a Set of ids). An
  // article linked from two clusters must not be counted twice.
  //
  // Counted from the cluster sections ONLY, never from the whole page. Every
  // article `totalArticles` counts lives inside a `cluster-*` section —
  // "Lain-lain" included, it renders as `cluster-lain-lain`. Scanning the
  // whole page would silently absorb any future related/popular rail and turn
  // this gate into a false alarm about copy.
  const distinct = new Set();
  for (const c of clusters) for (const h of c.hrefs) distinct.add(h);

  return {
    clusters,
    totalArticles: distinct.size,
    hasBannedPromise: html.includes(BANNED_PROMISE),
    hasEmptyCategoryCopy: html.includes(EMPTY_CATEGORY_COPY),
  };
}

/** Returns an array of human-readable violations; empty means the page passes. */
export function checkPillar(slug, parsed) {
  const bad = [];
  const want = approvedRow(parsed.totalArticles);

  if (parsed.hasBannedPromise) {
    bad.push(
      `the undatable promise "${BANNED_PROMISE}" is being served. ` +
        `COPY-01 replaced it on 02 Sept 2026; DES-07 §3.4 rejected it as the ` +
        `universal empty copy before that.`,
    );
  }

  if (parsed.hasEmptyCategoryCopy && parsed.totalArticles > 0) {
    bad.push(
      `DES-03 §7.2 C's empty-CATEGORY copy ("${EMPTY_CATEGORY_COPY}") is on a ` +
        `pillar holding ${parsed.totalArticles} published articles. That is the ` +
        `wrong state: §7.2 C is K3 (a fully empty category), an empty cluster ` +
        `inside a populated pillar is K4.`,
    );
  }

  for (const c of parsed.clusters) {
    if (c.count > 0) continue;
    if (c.row === null) {
      bad.push(`empty cluster "${c.name}" renders no .s-meta row at all.`);
    } else if (c.row !== want) {
      bad.push(`empty cluster "${c.name}" reads:\n         got  "${c.row}"\n         want "${want}"`);
    }
  }

  return bad;
}

// ---------------------------------------------------------------- self-test

function selftest() {
  const cases = [
    {
      name: 'approved row, page with articles',
      html: `<main><section aria-labelledby="cluster-a"><h2>Ada</h2><a href="/artikel/p/one">One</a></section><section aria-labelledby="cluster-b"><h2>Kosong</h2><p class="s-meta" style="padding:13px 0">Belum ada artikel di sini. Halaman ini ada 1 artikel lain.</p></section></main>`,
      expect: 0,
    },
    {
      name: 'the shipped defect: the undatable promise',
      html: `<main><section aria-labelledby="cluster-a"><h2>Ada</h2><a href="/artikel/p/one">One</a></section><section aria-labelledby="cluster-b"><h2>Kosong</h2><p class="s-meta">Artikel untuk merisik akan datang tidak lama lagi.</p></section></main>`,
      expect: 2, // banned promise + wrong row
    },
    {
      name: 'the trap: §7.2 C copy on a populated pillar',
      html: `<main><section aria-labelledby="cluster-a"><h2>Ada</h2><a href="/artikel/p/one">One</a></section><section aria-labelledby="cluster-b"><h2>Kosong</h2><p class="s-meta">Kategori ini masih kosong.</p></section></main>`,
      expect: 2, // wrong state + wrong row
    },
    {
      name: 'the RSC payload below </main> must not trip the gate',
      html: `<main><section aria-labelledby="cluster-b"><h2>Kosong</h2><p class="s-meta">Belum ada artikel di sini.</p></section></main><script>self.__next_f.push([1,"akan datang tidak lama lagi"])</script>`,
      expect: 0,
    },
    {
      name: 'zero guard: never "0 artikel lain"',
      html: `<main><section aria-labelledby="cluster-b"><h2>Kosong</h2><p class="s-meta">Belum ada artikel di sini. Halaman ini ada 0 artikel lain.</p></section></main>`,
      expect: 1,
    },
  ];

  let failed = 0;
  for (const c of cases) {
    const got = checkPillar('selftest', parsePillar(c.html)).length;
    const ok = got === c.expect;
    if (!ok) failed++;
    console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${c.name}  (violations: got ${got}, want ${c.expect})`);
  }
  console.log(failed === 0 ? '\n  self-test: all cases pass' : `\n  self-test: ${failed} case(s) failed`);
  return failed === 0 ? 0 : 1;
}

// -------------------------------------------------------------------- main

async function main(argv) {
  if (argv.includes('--selftest')) process.exit(selftest());

  const dirIdx = argv.indexOf('--dir');
  const smIdx = argv.indexOf('--sitemap');
  const dir = dirIdx >= 0 ? argv[dirIdx + 1] : null;
  const sitemap = smIdx >= 0 ? argv[smIdx + 1] : 'https://hellokahwin.com/sitemap.xml';

  /** @type {{slug:string, html:string}[]} */
  const pages = [];

  if (dir) {
    if (!fs.existsSync(dir)) {
      console.error(`no such directory: ${dir}`);
      process.exit(3);
    }
    for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort()) {
      pages.push({ slug: path.basename(f, '.html'), html: fs.readFileSync(path.join(dir, f), 'utf8') });
    }
  } else {
    let xml;
    try {
      const res = await fetch(sitemap);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      xml = await res.text();
    } catch (e) {
      console.error(`fetch failed: ${sitemap} — ${e.message}`);
      process.exit(3);
    }
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)]
      .map((m) => m[1])
      .filter((u) => /^https?:\/\/[^/]+\/artikel\/[^/]+\/?$/.test(u))
      .sort();
    if (urls.length === 0) {
      console.error('the sitemap yielded 0 pillar URLs. That is a claim about this REGEX');
      console.error('until you prove it on a line you know matches. Widen it and re-run.');
      process.exit(3);
    }
    for (const u of urls) {
      try {
        const res = await fetch(u);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        pages.push({ slug: u.replace(/\/$/, '').split('/').pop(), html: await res.text() });
      } catch (e) {
        console.error(`fetch failed: ${u} — ${e.message}`);
        process.exit(3);
      }
    }
  }

  console.log(`\n  check-empty-copy — ${pages.length} pillar pages, ${dir ? dir : sitemap}\n`);

  let violations = 0;
  let emptyClusters = 0;
  const failing = [];

  for (const { slug, html } of pages) {
    const parsed = parsePillar(html);
    const bad = checkPillar(slug, parsed);
    const emptyN = parsed.clusters.filter((c) => c.count === 0).length;
    emptyClusters += emptyN;

    // ENUMERATE. Every cluster, every time, pass or fail.
    console.log(
      `  ${slug} — ${parsed.clusters.length} clusters, ${emptyN} empty, ` +
        `${parsed.totalArticles} distinct articles${bad.length ? '   <<< VIOLATION' : ''}`,
    );
    parsed.clusters.forEach((c, i) => {
      const tag = c.count === 0 ? '[EMPTY ]' : `[${String(c.count).padStart(2)} art]`;
      console.log(`     ${String(i + 1).padStart(2)}. ${tag} ${c.name}`);
      if (c.count === 0) console.log(`             row: ${c.row === null ? '(none)' : `"${c.row}"`}`);
    });
    for (const b of bad) {
      violations++;
      console.log(`      !! ${b}`);
    }
    if (bad.length) failing.push(slug);
  }

  console.log('\n  ==========================================================');
  console.log(`  ${emptyClusters} empty clusters checked across ${pages.length} pillars`);
  if (emptyClusters === 0) {
    console.log('  NOTE: zero empty clusters means this gate asserted nothing about');
    console.log('  the copy. That is not a pass for the copy, only for the promise.');
  }
  console.log(`  VIOLATIONS: ${violations}${failing.length ? ` on ${failing.join(', ')}` : ''}`);
  console.log(violations === 0 ? '  PASS\n' : '  FAIL\n');
  process.exit(violations === 0 ? 0 : 1);
}

main(process.argv.slice(2));
