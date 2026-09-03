/**
 * Ahrefs image item, 04 September 2026 — the acceptance check.
 *
 *   node scripts/audit-body-image-bytes.mjs                    # 30 real-wedding articles
 *   node scripts/audit-body-image-bytes.mjs --limit 60
 *   node scripts/audit-body-image-bytes.mjs --base http://localhost:3200
 *   node scripts/audit-body-image-bytes.mjs --ceiling 500000
 *
 * It fetches RENDERED pages and measures the images they actually reference,
 * which is the only comparison that can see a stale cache. `backfill-midsize-cover.mts`
 * learned this the expensive way: a change merged, deployed READY and passed
 * its gate on production while every article still served the pre-backfill
 * asset, because the cached payload predated the script. A database-only check
 * would have called that a pass.
 *
 * WHAT IT ASSERTS
 *   1. No body image on any sampled page is over `--ceiling` (default 500,000 B,
 *      the number the audit item calls a body-image failure).
 *   2. Every body figure resolves — a 404 here is the specific disaster of
 *      shipping the `mid` render change before its backfill.
 *
 * The cover is measured and reported but NOT failed on: it is a `crop-*`
 * rendition governed by its own ceiling in `smart-crop.ts`, not a body image.
 *
 * Exit 0 when both hold, 1 otherwise. Prints the worst offenders either way,
 * because a passing run with a 480 KB image in it is worth seeing.
 */
const args = process.argv.slice(2);
const val = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

const BASE = (val('--base', 'https://hellokahwin.com') ?? '').replace(/\/+$/, '');
const LIMIT = Number(val('--limit', '30'));
const CEILING = Number(val('--ceiling', '500000'));

const fmt = (n) => n.toLocaleString('en-US');

/**
 * Real-wedding articles carry the photo essays — the population the audit item
 * is about, and the one where a body image count runs to 40+. Read from the
 * sitemap so the sample tracks the live site rather than a list that rots.
 */
async function realWeddingUrls(limit) {
  const res = await fetch(`${BASE}/sitemap.xml`);
  if (!res.ok) throw new Error(`sitemap: HTTP ${res.status}`);
  const xml = await res.text();

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  const articles = urls.filter((u) => /\/artikel\/[^/]+\/[^/]+$/.test(u));

  // The real-wedding pillars, by the category segment in the URL. `real-wedding`
  // is the pillar itself; the style categories under it are where the essays
  // actually live.
  const RW =
    /\/artikel\/(real-wedding|glamor-eksklusif|moden-kontemporari|klasik|tradisional|idea-dan-nasihat)\//;
  const rw = articles.filter((u) => RW.test(u));

  // Fall back to any article rather than sampling nothing, and say so.
  const pool = rw.length >= limit ? rw : articles;
  if (rw.length < limit) {
    console.warn(
      `note   only ${rw.length} real-wedding URLs in the sitemap; sampling from all ${articles.length} articles`,
    );
  }
  return pool.slice(0, limit);
}

/**
 * Body images only.
 *
 * `high`/`mid`/`low`/`original` under a per-image directory are the article
 * body's variant family. `crop-*` is the COVER family and is reported
 * separately — mixing them is how a body-image budget quietly starts passing or
 * failing on a cover.
 */
function classify(url) {
  const path = url.split('?')[0];
  if (/\/crop-[^/]+\.webp$/.test(path)) return 'cover';
  if (/\/(?:high|mid|low)\.webp$/.test(path)) return 'body';
  if (/\/original\.(?:webp|jpe?g|png)$/.test(path)) return 'body';
  return 'other';
}

async function sizeOf(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return {
      ok: res.ok,
      status: res.status,
      bytes: Number(res.headers.get('content-length') ?? 0),
    };
  } catch (e) {
    return { ok: false, status: 0, bytes: 0, error: e.message };
  }
}

async function main() {
  console.log(`base     ${BASE}`);
  console.log(`sample   ${LIMIT} article(s)`);
  console.log(`ceiling  ${fmt(CEILING)} B per body image\n`);

  const pages = await realWeddingUrls(LIMIT);
  if (pages.length === 0) {
    console.error('Refusing to pass: the sitemap yielded zero article URLs.');
    process.exit(1);
  }

  /** Measured once per distinct URL — the same figure repeats across pages. */
  const measured = new Map();
  const offenders = [];
  const missing = [];
  let bodyCount = 0;
  let bodyBytes = 0;
  const coverBytes = [];

  for (const page of pages) {
    const res = await fetch(page);
    if (!res.ok) {
      console.warn(`  page ${page} → HTTP ${res.status}`);
      continue;
    }
    const html = await res.text();

    const urls = [
      ...new Set(
        [...html.matchAll(/https:\/\/images\.hellokahwin\.com\/[^"'\\ )]+/g)]
          .map((m) => m[0].replace(/\\u0026/g, '&').replace(/&amp;/g, '&'))
          // Next.js serialises srcset and JSON payloads into the same HTML, so
          // the same URL arrives with assorted trailing punctuation.
          .map((u) => u.replace(/[",)\]]+$/, '')),
      ),
    ];

    const body = urls.filter((u) => classify(u) === 'body');
    const cover = urls.filter((u) => classify(u) === 'cover');

    for (const u of [...body, ...cover]) {
      if (!measured.has(u)) measured.set(u, await sizeOf(u));
    }

    for (const u of body) {
      const m = measured.get(u);
      bodyCount++;
      bodyBytes += m.bytes;
      if (!m.ok) missing.push({ page, url: u, status: m.status });
      else if (m.bytes > CEILING) offenders.push({ page, url: u, bytes: m.bytes });
    }
    for (const u of cover) {
      const m = measured.get(u);
      if (m.ok) coverBytes.push({ url: u, bytes: m.bytes });
    }

    const pageBody = body.reduce((s, u) => s + (measured.get(u)?.bytes ?? 0), 0);
    const worst = body.reduce((mx, u) => Math.max(mx, measured.get(u)?.bytes ?? 0), 0);
    console.log(
      `  ${String(body.length).padStart(3)} img  ${fmt(pageBody).padStart(11)} B  worst ${fmt(worst).padStart(9)} B  ${page.replace(BASE, '')}`,
    );
  }

  console.log('\n── RESULT ────────────────────────────────────────────────');
  console.log(`pages sampled       ${pages.length}`);
  console.log(`body images         ${bodyCount} references, ${measured.size} distinct URLs`);
  console.log(`body bytes total    ${fmt(bodyBytes)} B`);
  if (bodyCount > 0) {
    console.log(`body bytes mean     ${fmt(Math.round(bodyBytes / bodyCount))} B`);
  }
  if (coverBytes.length > 0) {
    const mx = coverBytes.reduce((a, b) => (a.bytes > b.bytes ? a : b));
    console.log(
      `cover crops         ${coverBytes.length} seen, largest ${fmt(mx.bytes)} B (reported, not failed)`,
    );
  }

  if (missing.length > 0) {
    console.error(`\nMISSING — ${missing.length} body image(s) did not resolve:`);
    for (const m of missing.slice(0, 15)) console.error(`  HTTP ${m.status}  ${m.url}`);
    if (missing.length > 15) console.error(`  … and ${missing.length - 15} more`);
  }

  if (offenders.length > 0) {
    console.error(`\nOVER CEILING — ${offenders.length} body image reference(s):`);
    const byUrl = [...new Map(offenders.map((o) => [o.url, o])).values()].sort(
      (a, b) => b.bytes - a.bytes,
    );
    for (const o of byUrl.slice(0, 15)) console.error(`  ${fmt(o.bytes).padStart(10)} B  ${o.url}`);
    if (byUrl.length > 15) console.error(`  … and ${byUrl.length - 15} more distinct URLs`);
  } else {
    // The number the acceptance criterion asks for, stated plainly either way.
    const worst = [...measured.entries()]
      .filter(([u, m]) => classify(u) === 'body' && m.ok)
      .sort((a, b) => b[1].bytes - a[1].bytes)[0];
    if (worst) console.log(`largest body image  ${fmt(worst[1].bytes)} B  ${worst[0]}`);
  }

  const failed = missing.length + offenders.length;
  console.log(
    failed === 0 ? '\nBODY IMAGE EXIT: 0' : `\nBODY IMAGE EXIT: 1 — ${failed} problem(s)`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
