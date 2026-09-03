/**
 * The pre-deploy gate for the `mid` render change.
 *
 *   pnpm audit:mid-coverage --db "<url>"
 *   pnpm audit:mid-coverage --db "<url>" --include-drafts
 *
 * ── WHY THIS EXISTS AND `audit-body-image-bytes.mjs` CANNOT DO IT ──────────
 * `getArticleVariantUrl` is a string rewrite with no lookup, so the moment
 * `article-renderer.tsx` asks for `mid`, every body figure on the site points at
 * `<dir>/mid.webp` whether or not that object is on R2. The check that has to
 * pass BEFORE the deploy is therefore "does a `mid.webp` exist for every image
 * an article body references".
 *
 * The sibling audit scrapes RENDERED production pages. Before the deploy those
 * pages still emit `high.webp` — it never requests a single `mid.webp`, so it
 * cannot prove coverage ahead of time, and it would fail anyway on the very
 * `high` files the change exists to replace. That audit is the AFTER check.
 *
 * This one reads the article CONTENT, which is where the render path gets its
 * URLs, and asks R2 directly. It is the only ordering of those two that can
 * catch the 404 before users do.
 *
 * ── WHY IT DOES NOT ENUMERATE `media` ──────────────────────────────────────
 * The backfill walks the `media` table; the renderer walks whatever URL is
 * embedded in the Tiptap document. Those two sets are not guaranteed equal — a
 * figure whose media row was deleted, or was never created, still renders. The
 * gate has to be the renderer's set, so this reads the same JSONB the renderer
 * reads and applies the same `getArticleVariantUrl` to it.
 *
 * Exit 0 only when every referenced body image has a `mid.webp` on R2.
 */
import postgres from 'postgres';
import { HeadObjectCommand } from '@aws-sdk/client-s3';
import { getR2Client, extractKeyFromUrl } from '../src/lib/r2/client';
import { getArticleVariantUrl } from '../src/lib/storage/article-image-variant';
import { resolveR2Bucket } from '../src/lib/storage/smart-crop';

type Row = { id: string; slug: string; status: string; content: unknown };

function parseArgs(argv: string[]) {
  const val = (n: string) => (argv.includes(n) ? argv[argv.indexOf(n) + 1] : undefined);
  return {
    db: val('--db'),
    includeDrafts: argv.includes('--include-drafts'),
    concurrency: Number(val('--concurrency') ?? 12),
  };
}

/**
 * Every image URL anywhere in a Tiptap document.
 *
 * Walked as a STRING rather than by node type on purpose. The renderer reads
 * `part.src`, `img.src` and figure `data.src` from three different node shapes,
 * and a gallery stores its images inside a `data-images` attribute that is
 * itself JSON. A structural walk has to know all of those; a scan of the
 * serialised document cannot miss one because a fourth shape was added.
 */
function imageUrlsIn(content: unknown): string[] {
  const json = JSON.stringify(content ?? null);
  if (!json) return [];
  const matches = json.matchAll(/https:\/\/[^"'\\ ]+?\/(?:high|mid|low)\.webp/g);
  const originals = json.matchAll(/https:\/\/[^"'\\ ]+?\/original\.(?:webp|jpe?g|png)/gi);
  return [...new Set([...matches, ...originals].map((m) => m[0]))];
}

async function existsOnR2(url: string): Promise<boolean> {
  const key = extractKeyFromUrl(url);
  const { bucket } = resolveR2Bucket(key);
  try {
    await getR2Client().send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.db) {
    console.error('Refusing to run: --db <url> is required.');
    process.exit(2);
  }
  if (!Number.isFinite(args.concurrency) || args.concurrency < 1) {
    console.error('Refusing to run: --concurrency must be a positive number.');
    process.exit(2);
  }

  const host = args.db.replace(/^postgres(ql)?:\/\//, '').replace(/^[^@]*@/, '');
  console.log(`target db     ${host}`);
  console.log(`scope         ${args.includeDrafts ? 'all articles' : 'published articles'}`);

  const sql = postgres(args.db, { prepare: false });
  const rows = await sql<Row[]>`
    select id, slug, status, content
      from articles
     ${args.includeDrafts ? sql`` : sql`where status = 'published'`}
     order by slug
  `;

  // One entry per DISTINCT body URL, with the slugs that reference it, so a
  // shared figure is checked once and still reports everywhere it appears.
  const refs = new Map<string, Set<string>>();
  for (const a of rows) {
    for (const u of imageUrlsIn(a.content)) {
      const mid = getArticleVariantUrl(u, 'mid');
      // A URL the helper does not recognise is left unchanged; the renderer
      // would serve it as-is, so it needs no `mid` and is not a coverage gap.
      if (mid === u) continue;
      if (!refs.has(mid)) refs.set(mid, new Set());
      refs.get(mid)!.add(a.slug);
    }
  }
  await sql.end();

  console.log(`articles      ${rows.length}`);
  console.log(`distinct mid URLs required  ${refs.size}\n`);

  if (refs.size === 0) {
    // Zero is not a pass. Either the query found nothing or the extraction is
    // broken, and both look identical to "everything is covered" from here.
    console.error('Refusing to pass: the article content yielded zero body image URLs.');
    process.exit(1);
  }

  const entries = [...refs.entries()];
  const missing: { url: string; slugs: string[] }[] = [];
  let checked = 0;
  let cursor = 0;
  const worker = async () => {
    for (;;) {
      const i = cursor++;
      if (i >= entries.length) return;
      const [url, slugs] = entries[i];
      if (!(await existsOnR2(url))) missing.push({ url, slugs: [...slugs] });
      checked++;
      if (checked % 200 === 0) console.log(`PROGRESS: ${checked}/${entries.length}`);
    }
  };
  await Promise.all(Array.from({ length: args.concurrency }, worker));

  console.log('\n── RESULT ────────────────────────────────────────────────');
  console.log(`checked       ${checked}`);
  console.log(`missing mid   ${missing.length}`);

  if (missing.length > 0) {
    console.error('\nThese body images have NO mid.webp on R2. Shipping the render change now');
    console.error('would 404 every one of them:\n');
    for (const m of missing.slice(0, 25)) {
      console.error(`  ${m.url}`);
      console.error(`      referenced by: ${m.slugs.slice(0, 4).join(', ')}`);
    }
    if (missing.length > 25) console.error(`  … and ${missing.length - 25} more`);
    console.error('\nMID COVERAGE EXIT: 1');
    process.exit(1);
  }

  console.log('\nMID COVERAGE EXIT: 0');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
