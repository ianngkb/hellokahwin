/**
 * Audit every image on every published article against the standing image
 * rules — the executable form of the workflow's Standards loop.
 *
 *   pnpm --silent audit:images --db <url>            # database only
 *   pnpm --silent audit:images --db <url> --live     # also fetch every page
 *
 * WHY THIS EXISTS, and it is not a general-purpose linter.
 *
 * The owner's directive of 25 Aug 2026 is "no text card at all" — not as a
 * cover, and not in the body. The workflow told us to record a query beside the
 * rule, and the query that got recorded was:
 *
 *     cover_image_url not like '%kad-tajuk%'
 *
 * That checks the COVER. It ran, it came back clean, and the run reported "25 of
 * 25 photograph covers, zero text cards" while eight indexed pages were serving
 * a text card in the body. The check was narrower than the rule it claimed to
 * verify, so it certified the wrong thing.
 *
 * Worse, the same pattern could never have found a body card even if somebody
 * had pointed it at the body. Ingest stores a figure's `src` as the WebP
 * derivative — `…/1787652677828-cover-borang-nikah/high.webp` — so `like
 * '%.png'` and `like '%kad-tajuk%'` both miss it. The card is only visible by
 * resolving each `src` back to its `media` row and looking at the FILENAME the
 * article file declared. That resolution is what this script does, and it is
 * the reason a hand-written `like` will keep coming back clean.
 *
 * THE CLASSIFIER, stated once so it can be argued with.
 *
 * A text card is an image DECLARED in an approved article file as a bare `.png`
 * beside the article — `cover-rukun-nikah.png`, `C6-2-A4-bajet-kahwin-cover.png`
 * — rather than as a sourced photograph under `images/S-…`. Ingest stamps every
 * upload with `Date.now()`, so a declared file always ends up with
 * `media.filename` DIFFERENT from the basename of its `r2_key`. A WordPress
 * import carries the stamp in the filename itself, so for those two are equal.
 * Hence:
 *
 *     text card  ==  filename ends .png
 *                    AND filename !== basename(r2_key)
 *                    AND filename does not start with `S-`
 *
 * That deliberately spares two legitimate populations: the legacy WordPress
 * PNG photographs and screenshots on the older articles, and archival
 * photographs correctly declared as `images/S-name.png` (the 1899 songket
 * plates are real ones). Both are photographs; neither is a typographic card.
 *
 * The third clause was missing until 26 Aug 2026 — this comment described it,
 * the code did not do it, and nothing noticed while the two plates sat in a
 * draft. The hour they went live the audit failed the run over them. The rule
 * and its tests now live in `src/lib/inspire/text-card.ts`.
 */
import postgres from 'postgres';
import { isTextCard as isTextCardRow } from '../src/lib/inspire/text-card';

interface Args {
  db: string;
  live: boolean;
  baseUrl: string;
}

function parseArgs(argv: string[]): Args {
  let db = '';
  let live = false;
  let baseUrl = 'https://hellokahwin.com';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') db = argv[++i] ?? '';
    else if (a === '--live') live = true;
    else if (a === '--base-url') baseUrl = argv[++i] ?? baseUrl;
  }
  if (!db) {
    // Same guard as the pillar seed and ingest, for the same reason: there is no
    // default, because the default would be production.
    console.error(
      '  - no --db <postgres-url> given. There is deliberately no default: DATABASE_URL points at production.',
    );
    process.exit(1);
  }
  return { db, live, baseUrl };
}

/**
 * The stem that identifies one uploaded asset: `inspire/<article>/<stamp>-<name>`.
 *
 * Strips the variant filename (`high.webp`, `crop-16x9-og.webp`, `original.jpg`)
 * or, on the original object, the extension — and a trailing backslash, which is
 * what a URL scraped out of the RSC flight payload carries.
 */
function stem(urlOrKey: string): string {
  let path = urlOrKey.replace(/\\+$/, '');
  try {
    path = new URL(path).pathname;
  } catch {
    // already a bare key
  }
  const parts = path.replace(/^\/+/, '').split('?')[0].split('/');
  const last = parts[parts.length - 1];
  if (/^(high|low|original|crop-)/.test(last)) parts.pop();
  else parts[parts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return parts.join('/');
}

/** Every `src` in a Tiptap document, whatever node type carries it. */
function collectSrcs(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectSrcs(n, out);
    return;
  }
  const n = node as { attrs?: { src?: unknown }; content?: unknown };
  if (n.attrs && typeof n.attrs.src === 'string') out.push(n.attrs.src);
  if (n.content) collectSrcs(n.content, out);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const sql = postgres(args.db, { prepare: false, max: 2 });

  const media = await sql<
    {
      id: string;
      filename: string;
      r2_key: string;
      credit: string | null;
      license_class: string | null;
      licensor_name: string | null;
    }[]
  >`select id, filename, r2_key, credit, license_class, licensor_name from media`;
  const byStem = new Map(media.map((m) => [stem(m.r2_key), m]));
  // The rule itself lives in `src/lib/inspire/text-card.ts` so that it can be
  // tested. Its third clause — the `S-` exemption — was described in the header
  // above and missing from the code here until 26 Aug 2026.
  const isTextCard = (m: { filename: string; r2_key: string }) =>
    isTextCardRow({ filename: m.filename, r2Key: m.r2_key });

  const articles = await sql<
    {
      id: string;
      slug: string;
      status: string;
      cat: string | null;
      cover_image_url: string | null;
      content: { content?: unknown[] };
    }[]
  >`
    select a.id, a.slug, a.status, c.slug as cat, a.cover_image_url, a.content
    from articles a
    left join inspire_categories c on c.id = a.primary_category_id
    where a.status = 'published'
    order by c.slug nulls last, a.slug`;

  let cardCount = 0;
  let uncredited = 0;
  let unresolved = 0;
  const cardArticles: string[] = [];

  for (const a of articles) {
    const srcs: string[] = [];
    collectSrcs(a.content?.content ?? [], srcs);
    const refs = [
      ...(a.cover_image_url ? [{ where: 'cover', src: a.cover_image_url }] : []),
      ...srcs.map((s) => ({ where: 'body', src: s })),
    ];
    const problems: string[] = [];
    for (const r of refs) {
      const m = byStem.get(stem(r.src));
      if (!m) {
        // Not fatal on its own — but an image the audit cannot resolve is an
        // image the audit is not checking, and silence there is how the last
        // gap hid. Say it out loud.
        unresolved++;
        problems.push(`  ? ${r.where}: no media row for ${r.src}`);
        continue;
      }
      if (isTextCard(m)) {
        cardCount++;
        problems.push(`  ✗ ${r.where}: TEXT CARD — ${m.filename}`);
      }
      if (!m.credit?.trim() || !m.license_class?.trim() || !m.licensor_name?.trim()) {
        uncredited++;
        problems.push(
          `  ✗ ${r.where}: incomplete credit — ${m.filename} ` +
            `(credit=${m.credit ? 'yes' : 'MISSING'} class=${m.license_class ?? 'MISSING'} licensor=${m.licensor_name ? 'yes' : 'MISSING'})`,
        );
      }
    }
    if (problems.length) {
      if (problems.some((p) => p.includes('TEXT CARD'))) cardArticles.push(a.slug);
      console.log(`/artikel/${a.cat}/${a.slug}`);
      for (const p of problems) console.log(p);
    }
  }

  console.log(`\nDATABASE — ${articles.length} published articles audited`);
  console.log(`  text cards referenced:      ${cardCount}`);
  console.log(`  images missing credit data: ${uncredited}`);
  console.log(`  images with no media row:   ${unresolved}`);

  // ── The live half ────────────────────────────────────────────────────────
  //
  // The database being clean is not the claim anybody cares about; the claim is
  // that the PAGE does not serve a card. Those came apart before — a renderer
  // race dropped credits the database held correctly — so when the answer has to
  // be defended, fetch the pages. SEQUENTIAL on purpose: the article render runs
  // on a shared 4s budget, and hammering it concurrently produces degraded
  // renders that then look like findings.
  let liveCards = 0;
  if (args.live) {
    console.log(`\nLIVE — fetching ${articles.length} pages sequentially from ${args.baseUrl}`);
    let nonOk = 0;
    for (const a of articles) {
      const url = `${args.baseUrl}/artikel/${a.cat}/${a.slug}`;
      const res = await fetch(url, { redirect: 'manual' });
      const html = await res.text();
      if (res.status !== 200) {
        nonOk++;
        console.log(`  ✗ HTTP ${res.status}  ${url}`);
        continue;
      }
      const served = [
        ...new Set(
          [...html.matchAll(/https:\/\/images\.hellokahwin\.com\/[^"'\s\\)]+/g)].map((m) =>
            stem(m[0]),
          ),
        ),
      ];
      for (const s of served) {
        const m = byStem.get(s);
        if (m && isTextCard(m)) {
          liveCards++;
          console.log(`  ✗ TEXT CARD SERVED  ${url}  ->  ${m.filename}`);
        }
      }
    }
    console.log(`  non-200 responses:   ${nonOk}`);
    console.log(`  text cards served:   ${liveCards}`);
  }

  await sql.end();

  // Non-zero on a text card, because this is meant to be run as a gate. A
  // missing credit is reported but does not fail the run: the credit audit of
  // 25 Aug found the library clean and the renderer at fault, so a regression
  // there wants eyes rather than a red build.
  if (cardCount > 0 || liveCards > 0) {
    console.error(
      `\nFAIL — text cards are still referenced by ${cardArticles.length} article(s): ${cardArticles.join(', ')}`,
    );
    process.exit(1);
  }
  console.log('\nPASS — no published article references a text card.');
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
