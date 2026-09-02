/**
 * UI-16 — does the LIVE article page serve the cover rendition the DATABASE has?
 *
 *   node scripts/audit-cover-rendition.mjs --db "<url>"
 *   node scripts/audit-cover-rendition.mjs --db "<url>" --base https://hellokahwin.com
 *   node scripts/audit-cover-rendition.mjs --db "<url>" --limit 12
 *   node scripts/audit-cover-rendition.mjs --db "<url>" --expect crop-4x3-article-card-sm
 *
 * Prints `RENDITION EXIT: <n>` at the start of a line and exits with that code.
 * 0 = every page serves what the database says it should; 1 = at least one does
 * not; 2 = the run could not be trusted.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND IT IS NOT A DUPLICATE OF THE UI-06 GATE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * On 02 September 2026 UI-16 merged, Vercel deployed READY, and
 * `ui-layout-gate.mjs --base https://hellokahwin.com` printed `UILINT EXIT: 0`
 * with `shaped-slot-variant 0` and `shaped-slot-dims 0` across all seven
 * templates. Every one of those numbers was CORRECT. The page was still serving
 * the wrong file.
 *
 * `resolveArticleCoverSource` prefers `crop-4x3-article-card-md` (792x594,
 * 26,936 B) and falls back to `crop-4x3-article-card` (911x683, 213,556 B) when
 * the rendition is absent. Both are named 4:3 crops with recorded dimensions, so
 * BOTH satisfy R1, R2, R5 and R6 — the gate cannot tell them apart and should
 * not try. What made the live page take the fallback is that
 * `ARTICLE_PAGE_CACHE_KEY` caches the article payload with `revalidate: false`,
 * the backfill wrote the database DIRECTLY from outside the running app, and so
 * none of the admin write paths that call `revalidateTag` fired. The cached
 * payload still held a `cover_image_smart_crops` from before the backfill.
 *
 * The page was therefore shipping **+186,620 B on the site's highest-traffic
 * template**, indefinitely — `revalidate: false` means forever — while every
 * check the company owns was green and the byte claim in the item's own evidence
 * was false by 8x.
 *
 * `POST /api/cron/revalidate-content` fixed it in one call. This script is what
 * would have caught it without a human happening to re-read a `currentSrc`.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE RULE IT ASSERTS
 * ─────────────────────────────────────────────────────────────────────────────
 *
 *   For every published article, the cover `<img>` on the live page must load
 *   the SAME URL that `resolveArticleCoverSource` would pick from the row in the
 *   database right now.
 *
 * That is a cross-layer assertion — database against rendered HTML — and it is
 * the only kind that can see a stale cache. It also catches, for free: a
 * backfill that half-ran, a resolver regression that changes preference order,
 * and a re-cut that moved the `?v=` token without the page following it.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * AND A BYTE CEILING, BECAUSE A BYTE DEFECT HAS NO RULE BEHIND IT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Hours after UI-16 shipped, six articles were re-ingested from a checkout that
 * predates it. `processSmartCrops` REPLACES the whole `cover_image_smart_crops`
 * object, so the `-md` key was dropped, the resolver fell through to the full
 * `crop-4x3-article-card`, and production served **4,742,962 B of cover across
 * six pages — a mean of 790 KB on the LCP element**, 12.5x the `low` this item
 * replaced.
 *
 * NOTHING could see it. The box is 4:3 and the file is 4:3, so `image-aspect`
 * reads 0. It is a downscale, so `image-upscale` reads 0. It is a named crop, so
 * `shaped-slot-variant` (R2) passes. Every blocking check was structurally blind
 * because there was no rule to break — the file was correct in every way except
 * its weight.
 *
 * So this asserts a CEILING on the served cover, in bytes, read from the
 * response rather than from the database: no cover may exceed
 * `ARTICLE_COVER_MD.CEILING_BYTES` (103,680 B) plus the 10% slack that keeps a
 * legitimately-heavy rendition from failing the run it just passed. A slot whose
 * whole justification is its weight needs a check on its weight.
 *
 * ⚠ It is deliberately NOT part of `ui-layout-gate.mjs`. That gate is offline-
 * testable against committed fixtures and takes no credentials; this needs the
 * production database URL. Merging them would put a secret in the path of the
 * check that has to run in CI on every push.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * PROVING IT DISCRIMINATES
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * A checker that reads the DB, builds the expected URL and then finds it in the
 * page is one typo away from comparing a string to itself. So `--expect <name>`
 * forces the expectation to a DIFFERENT rendition that also exists on every
 * cover, and the run must go RED on every article. Measured 02 Sept 2026:
 *
 *   (no flag)                              96 checked, 0 mismatched  EXIT 0
 *   --expect crop-4x3-article-card-sm      96 checked, 96 mismatched EXIT 1
 *
 * Both halves, or the green run is a claim about the script's condition rather
 * than about the site.
 */
import postgres from 'postgres';

const argv = process.argv.slice(2);
const opt = (n, d) => (argv.includes(`--${n}`) ? argv[argv.indexOf(`--${n}`) + 1] : d);

const DB = opt('db');
const BASE = opt('base', 'https://hellokahwin.com');
const LIMIT = opt('limit') ? Number(opt('limit')) : null;
const EXPECT = opt('expect', null);
const CONCURRENCY = 6;

/**
 * The served cover may not weigh more than this.
 *
 * `ARTICLE_COVER_MD.CEILING_BYTES` is 103,680 — the rendition's own budget —
 * plus 10%. The slack is not generosity: it stops a cover that legitimately
 * lands at the top of its ladder from failing a run it passed an hour earlier,
 * which is how a threshold gets switched off. Restated here as a literal rather
 * than imported, for the same reason `PREFERENCE` is: a checker that imports the
 * number it is checking agrees with the code by construction.
 */
const CEILING = Number(opt('ceiling', 114048));

/**
 * The preference order, restated here rather than imported.
 *
 * Importing `resolveArticleCoverSource` would make this script agree with the
 * render path BY CONSTRUCTION, which is exactly the tautology the discriminator
 * above exists to rule out: a bug in the resolver's ordering would be copied
 * into the checker and the run would stay green. Two independent statements of
 * one rule is the point. If they drift, that is a finding — not a maintenance
 * cost to remove by importing.
 */
const PREFERENCE = [
  'crop-4x3-article-card-md',
  'crop-4x3-article-card-sm',
  'crop-4x3-article-card',
];

/**
 * The rung the database is supposed to carry on every published cover.
 *
 * Checked SEPARATELY from the served URL, and that separation is the whole
 * point. `resolveArticleCoverSource` falls to `-sm` when `-md` is missing, which
 * is survivable — 38,010 B instead of 1,153,770 B — and completely silent: the
 * page serves a legal named 4:3 crop at its declared size, under the ceiling, so
 * assertions 1 and 2 both pass while the rendition this item exists for is gone.
 *
 * Measured 02 September 2026: the six `doa-*` articles were re-ingested TWICE
 * from a stale checkout, and after the second pass this script reported
 * `0 overweight` because the fallback had done its job. A check that goes quiet
 * because the mitigation worked is a check that will let the defect become
 * permanent.
 */
const TOP_RUNG = 'crop-4x3-article-card-md';

function preferred(crops) {
  if (!crops || typeof crops !== 'object') return null;
  for (const name of EXPECT ? [EXPECT] : PREFERENCE) {
    const e = crops[name];
    if (
      e &&
      typeof e.url === 'string' &&
      typeof e.width === 'number' &&
      typeof e.height === 'number'
    ) {
      return { name, url: e.url, width: e.width, height: e.height };
    }
  }
  return null;
}

/**
 * The cover `<img>`, read out of the served HTML.
 *
 * ⚠ A Next.js page carries its markup TWICE in the served bytes — once in the
 * stream and once in the flight payload — so a naive count over the response is
 * exactly double and means nothing. This does not count; it takes the FIRST
 * `<img>` that sits inside `figure class="hk-article-figure"`, which appears
 * once in the streamed HTML and is the element the reader actually sees.
 */
function coverSrc(html) {
  const fig = html.indexOf('hk-article-figure');
  if (fig < 0) return { err: 'no figure.hk-article-figure in the served HTML' };
  const img = html.indexOf('<img', fig);
  if (img < 0) return { err: 'figure.hk-article-figure carries no <img>' };
  const tag = html.slice(img, html.indexOf('>', img) + 1);
  const src = /\ssrc="([^"]+)"/.exec(tag)?.[1];
  if (!src) return { err: 'the cover <img> has no src attribute' };
  const w = /\swidth="(\d+)"/.exec(tag)?.[1];
  const h = /\sheight="(\d+)"/.exec(tag)?.[1];
  return {
    src: src.replace(/&amp;/g, '&'),
    width: w ? Number(w) : null,
    height: h ? Number(h) : null,
  };
}

async function main() {
  if (!DB) {
    console.error(
      'Refusing to run: --db <url> is required. This compares the DATABASE to the live site.',
    );
    console.log('RENDITION EXIT: 2');
    process.exit(2);
  }

  const host = DB.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db   ${host}`);
  console.log(`target site ${BASE}`);
  console.log(
    `expecting   ${EXPECT ? `${EXPECT}  (--expect: NEGATIVE CONTROL, this run SHOULD go red)` : PREFERENCE.join(' then ')}`,
  );
  console.log(`byte ceiling ${CEILING} B on the served cover`);

  const sql = postgres(DB, { prepare: false, max: 3 });
  const rows = await sql`
    select a.slug, c.slug as category_slug, a.cover_image_smart_crops as crops
      from articles a
      left join inspire_categories c on c.id = a.primary_category_id
     where a.status = 'published'
       and a.cover_image_url is not null
     order by a.slug
     ${LIMIT ? sql`limit ${LIMIT}` : sql``}`;
  await sql.end();

  if (rows.length === 0) {
    console.error('Nothing to check. A green run over an empty set is not a green run.');
    console.log('RENDITION EXIT: 2');
    process.exit(2);
  }
  console.log(`\n${rows.length} published article(s) with a cover\n`);

  const mismatched = [];
  const unreadable = [];
  /** Rows whose database entry has lost the top rung — assertion 3. */
  const missingRung = [];
  /** What each page actually references, so the ceiling weighs the served object. */
  const served = [];
  let checked = 0;

  const queue = [...rows];
  const worker = async () => {
    for (;;) {
      const r = queue.shift();
      if (!r) return;
      // Assertion 3, checked before anything is fetched: the row must still
      // carry the top rung. Its ABSENCE is what recurs — ingest replaces the
      // whole smart-crops object — and the fallback hides it from every other
      // assertion here.
      if (!EXPECT) {
        const top = r.crops?.[TOP_RUNG];
        if (!(top && typeof top.width === 'number' && typeof top.height === 'number')) {
          missingRung.push(r.slug);
        }
      }

      const want = preferred(r.crops);
      if (!want) {
        unreadable.push(`${r.slug} — no usable rendition entry in the database`);
        continue;
      }
      const url = `${BASE}/artikel/${r.category_slug ?? 'idea-dan-nasihat'}/${r.slug}`;
      let html;
      try {
        const res = await fetch(url, { headers: { 'user-agent': 'hk-rendition-audit' } });
        if (!res.ok) {
          unreadable.push(`${r.slug} — HTTP ${res.status} on ${url}`);
          continue;
        }
        html = await res.text();
      } catch (err) {
        unreadable.push(`${r.slug} — ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      const got = coverSrc(html);
      if (got.err) {
        unreadable.push(`${r.slug} — ${got.err}`);
        continue;
      }
      checked++;
      served.push({ slug: r.slug, url: got.src });
      if (got.src !== want.url) {
        mismatched.push(
          `${r.slug}\n      db wants  ${want.name}  ${want.url}\n      page has  ${got.src}`,
        );
      } else if (got.width !== want.width || got.height !== want.height) {
        // R6, cross-checked against the DATABASE rather than against the file.
        // A page can serve the right URL and still declare a stale size if the
        // rendition was re-encoded at a new box under the same name.
        mismatched.push(
          `${r.slug}\n      db wants  width="${want.width}" height="${want.height}"\n      page has  width="${got.width}" height="${got.height}"`,
        );
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  // The byte ceiling, measured on the object the page actually references. HEAD
  // rather than GET: the number wanted is Content-Length, and 97 covers is
  // ~3.3 MB of body nobody needs to download to weigh them.
  const overweight = [];
  const weighQueue = [...served];
  const weigher = async () => {
    for (;;) {
      const item = weighQueue.shift();
      if (!item) return;
      try {
        const res = await fetch(item.url, { method: 'HEAD' });
        const len = Number(res.headers.get('content-length'));
        if (Number.isFinite(len) && len > CEILING) {
          overweight.push(
            `${item.slug} — the page serves ${len} B (ceiling ${CEILING}); ${item.url}`,
          );
        }
      } catch {
        // A HEAD that fails is not evidence the object is light. Reported as
        // unreadable rather than skipped.
        unreadable.push(`${item.slug} — could not weigh ${item.url}`);
      }
    }
  };
  await Promise.all(Array.from({ length: CONCURRENCY }, weigher));

  for (const o of overweight) console.log(`  OVERWEIGHT ${o}`);
  for (const m of mismatched) console.log(`  MISMATCH ${m}`);
  for (const g of missingRung) console.log(`  NO ${TOP_RUNG} ${g}`);
  for (const u of unreadable) console.log(`  UNREADABLE ${u}`);

  console.log(
    `\n${checked} checked, ${mismatched.length} mismatched, ${overweight.length} overweight, ` +
      `${missingRung.length} missing ${TOP_RUNG}, ${unreadable.length} unreadable`,
  );
  if (missingRung.length) {
    console.log(
      `\n${missingRung.length} row(s) have lost the top rung. The page is still LEGAL — the\n` +
        'resolver falls to the 528px rung, which is why nothing above this line fired — but\n' +
        'the rendition is gone and the plate is narrower than it should be. Ingest REPLACES\n' +
        'the whole smart-crops object, so a publish from a checkout behind master deletes it:\n' +
        '  pnpm backfill:midsize --db "<url>" --rendition crop-4x3-article-card-md --undo <path>',
    );
  }
  if (overweight.length) {
    console.log(
      '\nAn overweight cover is usually the resolver falling past the renditions to the\n' +
        'FULL crop, which is 111 KB-1.4 MB. Ingest REPLACES the whole smart-crops object,\n' +
        'so a re-publish from a checkout without the rendition drops it. Fix:\n' +
        '  pnpm backfill:midsize --db "<url>" --rendition crop-4x3-article-card-md --undo <path>\n' +
        'then purge, then re-run this.',
    );
  }
  if (mismatched.length) {
    console.log(
      '\nA mismatch is usually the article payload cache, not the code: it is written\n' +
        "with `revalidate: false`, so a DIRECT database write (this repo's ingest CLI and\n" +
        'every backfill script) never fires the `revalidateTag` the admin paths do.\n' +
        'Fix:  curl -X POST "<base>/api/cron/revalidate-content" -H "Authorization: Bearer $CRON_SECRET"',
    );
  }
  // Unreadable is never a pass. A page that could not be read is not a page
  // that agreed with the database.
  const code =
    mismatched.length > 0 ||
    overweight.length > 0 ||
    missingRung.length > 0 ||
    unreadable.length > 0
      ? 1
      : 0;
  console.log(`RENDITION EXIT: ${code}`);
  process.exit(code);
}

main();
