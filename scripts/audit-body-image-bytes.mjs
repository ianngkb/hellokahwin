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
 * ⚠ THIS IS THE *AFTER* CHECK. It cannot gate the deploy, because before the
 * render change ships these pages still emit `high.webp` — it never requests a
 * `mid.webp` at all. The pre-deploy gate is `scripts/audit-mid-coverage.mts`,
 * which reads article CONTENT and asks R2 directly.
 *
 * WHAT IT ASSERTS
 *   1. No body image on any sampled page is over `--ceiling` (default 500,000 B,
 *      the number the audit item calls a body-image failure).
 *   2. Every body figure resolves — a 404 here is the specific disaster of
 *      shipping the `mid` render change before its backfill.
 *   3. No cover crop is over `--crop-ceiling` (default 300,000 B, `CROP_CEILING`).
 *      Measured at the EDGE, which is the point: the crop phase of the backfill
 *      rewrites bytes under an unchanged immutable URL, so this is the only
 *      check that can tell a completed purge from a forgotten one.
 *   4. It actually measured something. A run that fetched no page and found no
 *      image used to print EXIT 0 — the same false pass this file's header
 *      already blames for a whole item shipping unmeasured.
 *
 * Exit 0 when all four hold, 1 otherwise. Prints the worst offenders either way,
 * because a passing run with a 480 KB image in it is worth seeing.
 */
const args = process.argv.slice(2);
const val = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

const BASE = (val('--base', 'https://hellokahwin.com') ?? '').replace(/\/+$/, '');
const LIMIT = Number(val('--limit', '30'));
const CEILING = Number(val('--ceiling', '500000'));
// `CROP_CEILING.CEILING_BYTES`. Not imported: this is a plain .mjs so it stays
// runnable without a TypeScript loader, and the number is asserted against the
// source in `mid-variant.test.ts` rather than trusted here.
const CROP_CEILING_BYTES = Number(val('--crop-ceiling', '300000'));

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
  const cropOffenders = [];
  const pageErrors = [];
  let pagesFetched = 0;
  let bodyCount = 0;
  let bodyBytes = 0;
  const coverBytes = [];

  for (const page of pages) {
    let res;
    try {
      res = await fetch(page);
    } catch (e) {
      // Counted, not warned-and-forgotten. A Cloudflare bot challenge on the
      // HTML routes while `/sitemap.xml` still serves would otherwise skip every
      // page and report a clean run.
      pageErrors.push({ page, status: 0, error: e.message });
      console.warn(`  page ${page} → ${e.message}`);
      continue;
    }
    if (!res.ok) {
      pageErrors.push({ page, status: res.status });
      console.warn(`  page ${page} → HTTP ${res.status}`);
      continue;
    }
    pagesFetched++;
    const html = await res.text();

    // ⚠ ONLY what the browser actually FETCHES — `src` and `srcset` attributes.
    //
    // A bare scan of the page text is wrong, and production proved it the day
    // this shipped: `article-renderer.tsx` passes the ORIGINAL `high.webp` URL
    // to `MoodboardSaveButton` as `photoUrl`, so every figure serialises its
    // `high.webp` into the RSC flight payload beside the `mid.webp` it renders.
    // On `amankila-bali` that is 86 `high.webp` strings in a page whose 43
    // `<img>` tags contain none. A text scan would have reported 43 oversized
    // body images that no browser ever requests, and failed a green deploy.
    //
    // The budget is about bytes on the wire, so the extraction is too.
    const urls = [
      ...new Set(
        [...html.matchAll(/(?:src|srcSet|srcset)="([^"]*images\.hellokahwin\.com[^"]*)"/g)].flatMap(
          (m) =>
            // A srcset is a comma-separated list of `<url> <descriptor>` pairs; a
            // plain src is the degenerate case and parses the same way.
            m[1]
              .split(',')
              .map((part) => part.trim().split(/\s+/)[0])
              .filter((u) => u.startsWith('https://images.hellokahwin.com/'))
              .map((u) => u.replace(/\\u0026/g, '&').replace(/&amp;/g, '&')),
        ),
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
      if (!m.ok) {
        missing.push({ page, url: u, status: m.status });
      } else {
        coverBytes.push({ url: u, bytes: m.bytes });
        if (m.bytes > CROP_CEILING_BYTES) cropOffenders.push({ page, url: u, bytes: m.bytes });
      }
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
    console.log(`cover crops         ${coverBytes.length} seen, largest ${fmt(mx.bytes)} B`);
  }
  console.log(`pages fetched       ${pagesFetched} of ${pages.length}`);

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

  if (cropOffenders.length > 0) {
    console.error(
      `\nCOVER CROP OVER ${fmt(CROP_CEILING_BYTES)} B — ${cropOffenders.length} reference(s):`,
    );
    const byUrl = [...new Map(cropOffenders.map((o) => [o.url, o])).values()].sort(
      (a, b) => b.bytes - a.bytes,
    );
    for (const o of byUrl.slice(0, 15)) console.error(`  ${fmt(o.bytes).padStart(10)} B  ${o.url}`);
    if (byUrl.length > 15) console.error(`  … and ${byUrl.length - 15} more distinct URLs`);
    console.error('  (a crop the backfill rewrote but nobody purged looks exactly like this)');
  }

  if (pageErrors.length > 0) {
    console.error(`\n${pageErrors.length} page(s) did not load:`);
    for (const pe of pageErrors.slice(0, 10))
      console.error(`  ${pe.status || pe.error}  ${pe.page}`);
    if (pageErrors.length > 10) console.error(`  … and ${pageErrors.length - 10} more`);
  }

  // A run that measured nothing is a FAILURE, not a pass. This file's own header
  // blames precisely that shape of false green for an item shipping unmeasured,
  // and a Cloudflare bot challenge on the HTML routes while `/sitemap.xml` still
  // serves produces exactly it.
  const measuredNothing = pagesFetched === 0 || bodyCount === 0;
  if (measuredNothing) {
    console.error(
      `\nRefusing to pass: fetched ${pagesFetched} of ${pages.length} page(s) and measured ` +
        `${bodyCount} body image(s). Nothing was verified.`,
    );
  }

  // ⚠ Every one of the four documented assertions reaches this number. An
  // assertion the header promises and the exit code ignores is worse than no
  // assertion at all, because it is a check somebody will trust. `cropOffenders`
  // and `pageErrors` were both collected and then never read here, which is
  // exactly how this file's own cautionary tale started.
  const failed =
    missing.length +
    offenders.length +
    cropOffenders.length +
    pageErrors.length +
    (measuredNothing ? 1 : 0);
  console.log(
    failed === 0 ? '\nBODY IMAGE EXIT: 0' : `\nBODY IMAGE EXIT: 1 — ${failed} problem(s)`,
  );
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
