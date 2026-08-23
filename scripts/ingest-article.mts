/**
 * Turn an approved article file into a row in the database — Stage 7 of the
 * content production workflow.
 *
 *   pnpm ingest <file.md> --db <url>            # validate + plan only (default)
 *   pnpm ingest <file.md> --db <url> --commit   # write
 *   pnpm ingest <file.md> --db <url> --commit --update   # allow overwriting
 *
 * The design goal is that publishing becomes BORING. Every judgement call is
 * made in the file by the people who own it, and this script makes none of its
 * own: it validates, refuses loudly with everything wrong at once, or writes.
 * It never invents a meta description, never guesses a category, never
 * publishes an image whose source it cannot name.
 *
 * SAFETY, same three guards as the pillar seed and for the same reason:
 *  1. Dry run is the default; writing needs `--commit`.
 *  2. `--db` is mandatory. No implicit DATABASE_URL, because that points at
 *     production and a script that defaults to production eventually runs
 *     against it by accident.
 *  3. Everything happens in ONE transaction. A half-ingested article — rows
 *     written, images missing — is worse than a refusal.
 *
 * It also does not PUBLISH. `status` defaults to draft in the file format;
 * putting a page in front of readers stays a board-approved act.
 */
import { readFile } from 'node:fs/promises';
import { resolve, dirname, basename, extname } from 'node:path';
import postgres from 'postgres';
import { marked } from 'marked';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import LinkExtension from '@tiptap/extension-link';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';
import {
  parseArticleFile,
  allImages,
  creditLine,
  bodyInternalLinks,
  type ArticleImage,
} from '../src/lib/inspire/article-file';

// R2 and the variant pipeline are imported DYNAMICALLY, inside main(), after
// the environment has been settled by `bootstrapEnv()`. See the long comment
// there: both modules read process.env at module-load time, and a static
// import here would evaluate them before `--db` had been applied — which is
// exactly the defect this arrangement fixes.
type R2Module = typeof import('../src/lib/r2/client');
type VariantsModule = typeof import('../src/lib/storage/image-variants');
type SmartCropModule = typeof import('../src/lib/storage/smart-crop');

interface Args {
  file: string;
  db: string;
  commit: boolean;
  update: boolean;
  /**
   * Skip R2 entirely. LOCAL DATABASES ONLY — it writes `local://` URLs that no
   * browser can load, so letting it near a real database would create articles
   * with permanently broken images.
   */
  skipMedia: boolean;
  /**
   * Actually set `status: published`. Without it, an article whose file says
   * `published` is inserted as a DRAFT and the run says so. Publishing is a
   * board-approved act and does not happen because a file asked for it.
   */
  publish: boolean;
  /** Base URL of a running site whose content caches should be dropped after the write. */
  revalidateUrl: string;
}

/** Hosts that are unambiguously a throwaway database on this machine. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '::1', '0.0.0.0']);

/**
 * Mirrors DEFAULT_PRESETS in lib/storage/image-variants.ts. Duplicated on
 * purpose: importing it would pull the module (and the global Drizzle client
 * it binds) back into this file's static graph, which is what bootstrapEnv
 * exists to prevent. Two lines of drift risk beats re-arming the defect.
 */
const DEFAULT_PRESET_FALLBACK: Record<string, { quality: number; maxWidth: number }> = {
  low: { quality: 30, maxWidth: 1200 },
  high: { quality: 80, maxWidth: 2400 },
};

function isLocalDb(url: string): boolean {
  try {
    return LOCAL_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function parseArgs(argv: string[]): Args {
  let file = '';
  let db = '';
  let commit = false;
  let update = false;
  let skipMedia = false;
  let publish = false;
  let revalidateUrl = '';
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') db = argv[++i] ?? '';
    else if (a === '--revalidate-url') revalidateUrl = argv[++i] ?? '';
    else if (a === '--commit') commit = true;
    else if (a === '--dry-run') commit = false;
    else if (a === '--update') update = true;
    else if (a === '--skip-media') skipMedia = true;
    else if (a === '--publish') publish = true;
    else if (!a.startsWith('--')) file = a;
  }
  const problems: string[] = [];
  if (!file) problems.push('no article file given: pnpm ingest <file.md> --db <url>');
  if (!db)
    problems.push(
      'no --db <postgres-url> given. There is deliberately no default: DATABASE_URL points at production.',
    );
  // `local://` URLs would render as broken images on a real site. The flag
  // exists for local verification and must never reach a hosted database.
  if (skipMedia && db && !isLocalDb(db))
    problems.push(
      '--skip-media only works against a local database. It writes placeholder image URLs that no browser can load.',
    );
  // A real run against a real database with no way to clear the caches would
  // write an article the site cannot show. Refuse up front rather than produce
  // a row nobody can see.
  if (commit && db && !isLocalDb(db) && !revalidateUrl)
    problems.push(
      '--revalidate-url is required when committing to a non-local database. Without it the article is written but the site keeps serving its cached pages, so nobody sees it.',
    );
  if (problems.length) {
    console.error(problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  return { file, db, commit, update, skipMedia, publish, revalidateUrl };
}

/**
 * Settle the environment BEFORE any module that reads it is loaded.
 *
 * TWO DEFECTS THIS FIXES, and they compounded — fixing either one naively
 * would have armed the other. Both were caught in review; neither was
 * theoretical.
 *
 * 1. **Nothing loaded `.env` at all.** `tsx` does not read env files, and this
 *    script never asked it to. Probed: with no loader, `R2_ACCESS_KEY_ID` and
 *    `R2_BUCKET_NAME` are both absent, so `getR2Client()` throws and the image
 *    half of ingest could not have worked — not "unproven", broken.
 *
 * 2. **`--db` did not actually control the target.** `getDefaultPresets()`
 *    reads through the GLOBAL Drizzle client in `lib/db/drizzle.ts`, which
 *    binds `process.env.DATABASE_URL` at module load and knows nothing about
 *    this script's flag. A run believed to be local would read from whatever
 *    DATABASE_URL happened to be — production, in any shell where it is set.
 *
 * The compounding: `.env` in this worktree holds the PRODUCTION DATABASE_URL.
 * Adding a bare `dotenv.config()` to fix (1) would have pointed the global
 * client at production while writes went to `--db`. A split-brain run reading
 * production and writing elsewhere is worse than either bug alone.
 *
 * So the order below is load-bearing and must not be rearranged:
 *   a. `--db` is written into process.env FIRST;
 *   b. the env files are then loaded WITHOUT override, so they can supply R2
 *      credentials but cannot touch DATABASE_URL;
 *   c. the assertion proves (b) held;
 *   d. only then are the env-reading modules imported.
 */
async function bootstrapEnv(
  dbUrl: string,
): Promise<{ r2: R2Module; variants: VariantsModule; smartCrop: SmartCropModule }> {
  // (a) One source of truth for the database target, set before anything reads it.
  process.env.DATABASE_URL = dbUrl;

  // (b) `override: false` is the whole safety property here, not a default to
  //     shrug at: it lets the files supply R2_* and CRON_SECRET while leaving
  //     the DATABASE_URL set above untouched.
  const dotenv = await import('dotenv');
  for (const file of ['.env.local', '.env']) {
    dotenv.config({ path: file, override: false, quiet: true });
  }

  // (c) Cheap, and it fails loudly rather than silently writing to the wrong
  //     database if dotenv's behaviour ever changes under us.
  if (process.env.DATABASE_URL !== dbUrl) {
    console.error(
      'Refusing: loading the environment changed the database target away from --db.\n' +
        'This would read one database and write another. Aborting before any write.',
    );
    process.exit(1);
  }

  // (d) Now safe to load the modules that bind env at import time.
  const [r2, variants, smartCrop] = await Promise.all([
    import('../src/lib/r2/client'),
    import('../src/lib/storage/image-variants'),
    import('../src/lib/storage/smart-crop'),
  ]);
  return { r2, variants, smartCrop };
}

/**
 * The image-quality presets, read over THIS script's connection.
 *
 * `getDefaultPresets()` from the variants module would do the same job through
 * the global Drizzle client. `bootstrapEnv` now points that client at the same
 * database, so it would be correct — but correct-by-coincidence, resting on a
 * global that some future import could rebind. Reading it here over the
 * connection this script opened makes `--db` the only thing that decides, and
 * removes the question.
 */
async function readPresets(
  sql: postgres.Sql,
  fallback: Record<string, { quality: number; maxWidth: number }>,
): Promise<Record<string, { quality: number; maxWidth: number }>> {
  try {
    const [row] = await sql<{ value: unknown }[]>`
      select value from admin_settings where key = 'image_quality_presets' limit 1`;
    if (row?.value) return row.value as Record<string, { quality: number; maxWidth: number }>;
  } catch {
    // Table may not exist on a fresh database — the built-in defaults stand.
  }
  return fallback;
}

function describeTarget(url: string): string {
  try {
    const u = new URL(url);
    return `${u.hostname}:${u.port || '5432'}${u.pathname}`;
  } catch {
    return '<unparseable url>';
  }
}

/** Fail with a list, in the same shape the validator uses. */
function refuse(problems: string[]): never {
  console.error(
    `\nRefusing to ingest. ${problems.length} problem${problems.length === 1 ? '' : 's'}:\n  - ` +
      problems.join('\n  - ') +
      '\n\nNothing was written.',
  );
  process.exit(1);
}

/**
 * The node vocabulary markdown can produce, and nothing more.
 *
 * Deliberately NOT `createArticleBaseExtensions()`: that list is built on
 * `novel`, which is ESM-only and cannot be loaded from a CLI script, and it
 * carries editor-side extensions (drag handles, slash commands) that have no
 * meaning here. These are the same direct `@tiptap/*` imports the server-side
 * renderer uses, so anything generated here is renderable by exactly the
 * vocabulary that renders it.
 *
 * The custom blocks (figureBlock and friends) are absent on purpose — markdown
 * never produces them, and the credited figures are appended below as plain
 * JSON, which needs no extension to construct.
 */
function markdownExtensions() {
  return [
    StarterKit,
    ImageExtension,
    LinkExtension.configure({ openOnClick: false, defaultProtocol: 'https' }),
    UnderlineExtension,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}

/**
 * Markdown → the TipTap JSON the site renders.
 *
 * Goes through HTML because `generateJSON` is the same function the editor
 * uses. Rolling a bespoke converter here would be the first step towards two
 * content shapes that render differently.
 */
function markdownToTiptap(markdown: string): unknown {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  return generateJSON(html, markdownExtensions() as never[]);
}

/**
 * Replace each markdown image with a figureBlock carrying the credit.
 *
 * The credit rides in `data-caption` / `data-caption-url` because that is the
 * node's existing visible-attribution slot, and the renderer already emits it
 * as a followed link (`rel="noopener noreferrer"`, no nofollow) — which the
 * approved strategy requires, since a nofollow credit is worth much less to the
 * vendor and vendor goodwill is what supplies the programme.
 */
function toFigureBlock(image: ArticleImage, url: string) {
  return {
    type: 'figureBlock',
    attrs: {
      src: url,
      alt: image.alt,
      'data-caption': creditLine(image),
      'data-caption-url': image.creditUrl ?? null,
    },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  // Before anything else touches the environment. See bootstrapEnv().
  const {
    r2: r2Module,
    variants: variantsModule,
    smartCrop: smartCropModule,
  } = await bootstrapEnv(args.db);

  // CRON_SECRET can only be checked AFTER the env files are loaded — it lives
  // in one of them. Still strictly before any write: discovering it missing
  // once the row is in the database leaves the article written and the site
  // stale, which is the half-done state this script exists to avoid.
  if (args.revalidateUrl && !process.env.CRON_SECRET) {
    console.error(
      '  - --revalidate-url was given but CRON_SECRET is not set in the environment or in ' +
        '.env.local / .env, so the caches could not be cleared after the write.',
    );
    process.exit(1);
  }

  const filePath = resolve(args.file);
  const fileDir = dirname(filePath);

  const raw = await readFile(filePath, 'utf8');
  // Throws ArticleFileError listing every problem — including any image whose
  // credit, licence class or licensor is missing. This is the gate.
  const { frontMatter, markdown } = parseArticleFile(raw);

  console.log(`File:   ${basename(filePath)}`);
  console.log(`Target: ${describeTarget(args.db)}`);
  console.log(args.commit ? 'Mode:   COMMIT (will write)\n' : 'Mode:   DRY RUN (no writes)\n');

  const sql = postgres(args.db, { prepare: false, max: 2 });
  const problems: string[] = [];

  // ── Resolve everything BEFORE writing anything ──────────────────────────

  const [pillar] = await sql<{ id: string; name: string; slug: string }[]>`
    select id, name, slug from inspire_categories where pillar_code = ${frontMatter.pillar}`;
  if (!pillar)
    problems.push(
      `pillar ${frontMatter.pillar} does not exist in this database — run scripts/seed-pillars.ts first`,
    );

  const [cluster] = await sql<{ id: string; name: string; parent_id: string | null }[]>`
    select id, name, parent_id from inspire_categories where pillar_code = ${frontMatter.cluster}`;
  if (!cluster) problems.push(`cluster ${frontMatter.cluster} does not exist in this database`);
  else if (pillar && cluster.parent_id !== pillar.id)
    problems.push(
      `cluster ${frontMatter.cluster} does not belong to pillar ${frontMatter.pillar} — check the cluster plan`,
    );

  const [author] = await sql<{ id: string }[]>`
    select id from profiles where id = ${frontMatter.author} or email = ${frontMatter.author} limit 1`;
  if (!author) problems.push(`author "${frontMatter.author}" matches no profile`);

  const [existing] = await sql<{ id: string }[]>`
    select id from articles where slug = ${frontMatter.slug} limit 1`;
  if (existing && !args.update)
    problems.push(
      `an article already exists at slug "${frontMatter.slug}". Pass --update to overwrite it deliberately.`,
    );

  // Internal links are validated, never invented. A link to an unpublished or
  // non-existent article is a dead link on a page we are asking Google to
  // trust, so it refuses the file rather than shipping it.
  for (const link of frontMatter.internalLinks) {
    const [target] = await sql<{ slug: string }[]>`
      select slug from articles where slug = ${link.slug} and status = 'published' limit 1`;
    if (!target)
      problems.push(
        `internalLinks: no published article with slug "${link.slug}" — fix the link or publish the target first`,
      );
  }

  // And the links written in the PROSE, which went unchecked until review
  // caught it. Only the front-matter list was validated, which is the wrong way
  // round on this site: the whole pillar/cluster design exists to make internal
  // link structure load-bearing, so a dead link in the body is a defect in the
  // thing being built, not a cosmetic slip.
  for (const slug of bodyInternalLinks(markdown)) {
    const [target] = await sql<{ slug: string }[]>`
      select slug from articles where slug = ${slug} and status = 'published' limit 1`;
    if (!target)
      problems.push(
        `body link: no published article with slug "${slug}" — fix the link in the article text, or publish the target first`,
      );
  }

  // Image files must exist on disk before anything is uploaded.
  const images = allImages(frontMatter);
  const imageBuffers = new Map<string, Buffer>();
  for (const image of images) {
    const imagePath = resolve(fileDir, image.file);
    try {
      imageBuffers.set(image.file, await readFile(imagePath));
    } catch {
      problems.push(`image not found: ${image.file}`);
    }
  }

  if (problems.length) {
    await sql.end();
    refuse(problems);
  }

  console.log(`Pillar:  ${pillar.name} (${frontMatter.pillar})`);
  console.log(`Cluster: ${cluster.name} (${frontMatter.cluster})`);
  // A file may ASK to be published; only --publish makes it so. Putting a page
  // in front of readers is a board-approved act and does not happen because a
  // YAML field said `published`.
  const effectiveStatus =
    frontMatter.status === 'published' && args.publish ? 'published' : 'draft';
  console.log(
    `Status:  ${effectiveStatus}` +
      (frontMatter.status === 'published' && !args.publish
        ? '  (file asks for published; pass --publish to honour it)'
        : ''),
  );
  // Defaults to 'ai' via the schema — everything arriving here came through the
  // agent pipeline unless the file explicitly says otherwise. Every ingested
  // article lands at `pending_review` regardless of what this says, so declaring
  // `human` does not buy a writer a way past the owner's queue.
  const authorship = frontMatter.authorship;
  console.log(`Author:  ${authorship} · review_status pending_review`);
  console.log(`Images:  ${images.length}, every one credited`);
  for (const image of images) {
    console.log(
      `  ${image.file}  →  "${image.credit}" [${image.licenseClass}] ${image.licensorName}`,
    );
  }
  console.log(`Tags:    ${frontMatter.tags.join(', ') || '(none)'}`);
  console.log(`Links:   ${frontMatter.internalLinks.length} internal, all resolved`);
  console.log(`URL:     /artikel/${pillar.slug}/${frontMatter.slug}`);

  if (!args.commit) {
    console.log('\nDry run — nothing written. Re-run with --commit to apply.');
    await sql.end();
    return;
  }

  // ── Upload through the EXISTING pipeline ────────────────────────────────
  //
  // `generateVariants` is what the admin uploader runs and what produced the
  // derivatives already in the bucket. Ingest calls it rather than writing a
  // second uploader, so there is one place where an image becomes web-ready.
  const uploaded = new Map<
    string,
    {
      url: string;
      key: string;
      variants: unknown;
      smartCrops?: unknown;
      focalPoint?: unknown;
      detectionData?: unknown;
      width?: number;
      height?: number;
      size: number;
    }
  >();
  // One timestamp for the whole run, so every image of an article shares a
  // prefix and a re-ingest is visibly a new generation rather than a partial
  // overwrite of the last one.
  const uploadStamp = Date.now();
  if (!args.skipMedia) {
    const r2 = r2Module.getR2Client();
    const bucket = r2Module.getR2Bucket();
    const publicUrl = r2Module.getR2PublicUrl();
    // Read over THIS script's connection, not the global one — `--db` decides.
    const presets = await readPresets(sql, DEFAULT_PRESET_FALLBACK);

    for (const image of images) {
      const buffer = imageBuffers.get(image.file)!;
      const ext = (extname(image.file) || '.jpg').toLowerCase();
      // Slug derived from the DECLARED PATH, not the basename: two images named
      // `hero.jpg` in different folders produced the same key before review
      // caught it, and the second silently overwrote the first under an
      // immutable cache header. Stripping to [a-z0-9-] also disposes of spaces,
      // Unicode, `?` and `#`, any of which would otherwise produce a key that
      // cannot be fetched back.
      const name = image.file
        .replace(/^\.\/+/, '')
        .replace(/\.[^.]+$/, '')
        .normalize('NFKD')
        .replace(/[^a-zA-Z0-9]+/g, '-')
        .replace(/^-|-$/g, '')
        .toLowerCase();
      // MATCHES THE EXISTING BUCKET SHAPE, verified against real objects:
      //   inspire/amankila-bali/1787396256716-cover.jpg
      //   inspire/amankila-bali/1787396256716-cover/crop-16x9-og.webp
      // The timestamp is what makes a re-ingest write a NEW object rather than
      // overwrite one already served under `max-age=31536000, immutable` — a
      // replaced byte-stream at a cached URL is unfixable for a year.
      const base = `${uploadStamp}-${name || 'image'}`;
      const key = `inspire/${frontMatter.slug}/${base}${ext}`;
      const meta = await sharp(buffer).metadata();

      await r2.send(
        new PutObjectCommand({
          Bucket: bucket,
          Key: key,
          Body: buffer,
          ContentType: `image/${(meta.format ?? 'jpeg').replace('jpg', 'jpeg')}`,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
      );
      const variants = await variantsModule.generateVariants(buffer, key, presets);

      // The named crops every existing article uses. Without this an ingested
      // cover rendered through the generic fallback while all 29 existing
      // articles used crop-16x9-og / crop-4.3x1-desktop-hero / …, so the first
      // ingested article would have looked visibly unlike the rest of the site.
      // Rekognition is optional (REKOGNITION_ENABLED=false falls back to the
      // Sharp saliency focal point), so this works without AWS.
      let smartCrops: unknown = null;
      let focalPoint: unknown = null;
      let detectionData: unknown = null;
      try {
        const crops = await smartCropModule.processSmartCrops(key, { originalBuffer: buffer });
        smartCrops = crops.smartCrops;
        focalPoint = crops.focalPoint;
        detectionData = crops.detectionData;
        console.log(`  uploaded ${image.file} (+${Object.keys(crops.smartCrops).length} crops)`);
      } catch (err) {
        // The variants are already up and the article is usable; losing the
        // crops costs framing, not the image. Say so rather than hide it.
        console.warn(
          `  uploaded ${image.file} BUT smart crops failed: ${
            err instanceof Error ? err.message : String(err)
          }`,
        );
      }

      uploaded.set(image.file, {
        url: `${publicUrl}/${key}`,
        key,
        variants,
        smartCrops,
        focalPoint,
        detectionData,
        width: meta.width,
        height: meta.height,
        size: buffer.length,
      });
    }
  } else {
    console.log('\n--skip-media: images are NOT uploaded; media rows reference local paths.');
    for (const image of images) {
      uploaded.set(image.file, {
        url: `local://${frontMatter.slug}/${image.file}`,
        key: `local/${frontMatter.slug}/${image.file}`,
        variants: null,
        size: imageBuffers.get(image.file)!.length,
      });
    }
  }

  const content = markdownToTiptap(markdown);
  // Append the credited figures after the body. Placing them inline would mean
  // guessing where the writer wanted each one, and ingest does not guess.
  const contentWithFigures = {
    ...(content as { type: string; content: unknown[] }),
    content: [
      ...((content as { content?: unknown[] }).content ?? []),
      ...frontMatter.images.map((image) => toFigureBlock(image, uploaded.get(image.file)!.url)),
    ],
  };

  const cover = uploaded.get(frontMatter.cover.file)!;

  await sql.begin(async (tx) => {
    const [row] = await tx<{ id: string }[]>`
      insert into articles
        (title, slug, excerpt, content, cover_image_url, cover_image_variants,
         cover_image_smart_crops, cover_image_focal_point, cover_image_detection_data,
         meta_description, status, author_id, primary_category_id, published_at,
         authorship, review_status, is_ai_generated)
      values
        (${frontMatter.title}, ${frontMatter.slug}, ${frontMatter.excerpt ?? null},
         ${JSON.stringify(contentWithFigures)}::jsonb, ${cover.url},
         ${cover.variants ? JSON.stringify(cover.variants) : null}::jsonb,
         ${cover.smartCrops ? JSON.stringify(cover.smartCrops) : null}::jsonb,
         ${cover.focalPoint ? JSON.stringify(cover.focalPoint) : null}::jsonb,
         ${cover.detectionData ? JSON.stringify(cover.detectionData) : null}::jsonb,
         ${frontMatter.metaDescription}, ${effectiveStatus}, ${author.id}, ${pillar.id},
         ${effectiveStatus === 'published' ? (frontMatter.publishedAt ?? new Date().toISOString()) : null},
         ${authorship}::article_authorship,
         'pending_review'::article_review_status,
         ${authorship !== 'human'})
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image_url = excluded.cover_image_url,
        cover_image_variants = excluded.cover_image_variants,
        cover_image_smart_crops = excluded.cover_image_smart_crops,
        cover_image_focal_point = excluded.cover_image_focal_point,
        cover_image_detection_data = excluded.cover_image_detection_data,
        meta_description = excluded.meta_description,
        status = excluded.status,
        primary_category_id = excluded.primary_category_id,
        -- These three were MISSING, and their absence had teeth. Re-ingesting a
        -- draft with --publish flipped the status to published while leaving
        -- published_at NULL: a live article with no date, a wrong sitemap
        -- lastmod, and a JSON-LD datePublished of null. The approved author was
        -- silently ignored on update too, so a byline correction in the file
        -- never reached the page.
        author_id = excluded.author_id,
        published_at = excluded.published_at,
        -- Re-ingested after an edit, the article is AI content again and goes
        -- BACK in the owner's queue. Carrying a previous "reviewed" forward
        -- would mean a human sign-off silently covering text they never read —
        -- the one outcome this whole tag exists to prevent.
        -- (No backticks in this comment: it lives inside a tagged template
        -- literal, where a backtick would terminate the SQL string.)
        authorship = excluded.authorship,
        review_status = excluded.review_status,
        reviewed_at = null,
        reviewed_by = null,
        -- Compat mirror for rollback safety — removed in the follow-up migration that drops these columns.
        is_ai_generated = excluded.is_ai_generated,
        human_reviewed_at = null,
        updated_at = now()
      returning id`;

    // Both the pillar AND the cluster. The pillar link is what puts the article
    // at /artikel/<pillar>/<slug>; the cluster link is what makes it appear in
    // the right section of the pillar page and what scopes its sibling links.
    // On --update these are RECONCILED, not merely added. Adding only would
    // leave an article listed under the cluster it was moved OUT of, on a page
    // whose entire job is to be an accurate map of its pillar. Only categories
    // that participate in the pillar architecture are touched — a legacy
    // WordPress category on an older article is somebody else's decision.
    await tx`
      delete from article_categories
      where article_id = ${row.id}
        and category_id <> ${pillar.id}
        and category_id <> ${cluster.id}
        and category_id in (select id from inspire_categories where pillar_code is not null)`;
    for (const categoryId of [pillar.id, cluster.id]) {
      await tx`
        insert into article_categories (article_id, category_id)
        values (${row.id}, ${categoryId})
        on conflict do nothing`;
    }

    // Same reconciliation for tags: a tag removed from the approved file must
    // come off the article, not linger in the sidebar.
    await tx`delete from article_tags where article_id = ${row.id}`;
    for (const tagName of frontMatter.tags) {
      const tagSlug = tagName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      const [tag] = await tx<{ id: string }[]>`
        insert into inspire_tags (name, slug) values (${tagName}, ${tagSlug})
        on conflict (slug) do update set name = excluded.name
        returning id`;
      await tx`
        insert into article_tags (article_id, tag_id) values (${row.id}, ${tag.id})
        on conflict do nothing`;
    }

    for (const image of images) {
      const up = uploaded.get(image.file)!;
      const [mediaRow] = await tx<{ id: string }[]>`
        insert into media
          (filename, r2_key, url, original_url, mime_type, file_size, width, height,
           alt, caption, variants, smart_crops, focal_point, detection_data,
           credit, credit_url, license_class, licensor_name,
           source, original_article_id, uploaded_by)
        values
          (${basename(image.file)}, ${up.key}, ${up.url}, ${up.url},
           ${'image/' + (extname(image.file).slice(1) || 'jpeg')}, ${up.size},
           ${up.width ?? null}, ${up.height ?? null}, ${image.alt}, ${image.caption ?? ''},
           ${up.variants ? JSON.stringify(up.variants) : null}::jsonb,
           ${up.smartCrops ? JSON.stringify(up.smartCrops) : null}::jsonb,
           ${up.focalPoint ? JSON.stringify(up.focalPoint) : null}::jsonb,
           ${up.detectionData ? JSON.stringify(up.detectionData) : null}::jsonb,
           ${image.credit}, ${image.creditUrl ?? null}, ${image.licenseClass}, ${image.licensorName},
           'article_upload', ${row.id}, ${author.id})
        on conflict (r2_key) do update set
          alt = excluded.alt,
          caption = excluded.caption,
          variants = excluded.variants,
          smart_crops = excluded.smart_crops,
          focal_point = excluded.focal_point,
          detection_data = excluded.detection_data,
          width = excluded.width,
          height = excluded.height,
          file_size = excluded.file_size,
          mime_type = excluded.mime_type,
          credit = excluded.credit,
          credit_url = excluded.credit_url,
          license_class = excluded.license_class,
          licensor_name = excluded.licensor_name,
          updated_at = now()
        returning id`;
      await tx`
        insert into media_article_usage (media_id, article_id)
        values (${mediaRow.id}, ${row.id})
        on conflict do nothing`;
    }
  });

  console.log(`\nDone. /artikel/${pillar.slug}/${frontMatter.slug} (${effectiveStatus})`);
  console.log('It will appear on the pillar page under its cluster with no further action.');

  // Drop the content caches. The public read layer caches with
  // `revalidate: false` and is invalidated only by `revalidateTag` calls from
  // the admin write paths — none of which fire for a direct database write. An
  // ingested article would otherwise sit in the database and be invisible on
  // the site indefinitely: no pillar entry, no sitemap row, no page. Caught in
  // review; it is the difference between an ingest path that works and one
  // that appears to.
  if (args.revalidateUrl) {
    const secret = process.env.CRON_SECRET;
    if (!secret) {
      console.warn(
        '\n⚠ CRON_SECRET is not set, so the caches were NOT dropped. The article is in\n' +
          '  the database but the site will keep serving cached pages until they are.',
      );
    } else {
      const endpoint = new URL('/api/cron/revalidate-content', args.revalidateUrl).toString();
      // Three attempts. A cold serverless function or a momentary blip must not
      // be the reason a correctly-written article stays invisible, and the
      // request is idempotent so retrying costs nothing.
      let ok = false;
      let detail = '';
      for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { authorization: `Bearer ${secret}` },
          });
          ok = res.ok;
          detail = `HTTP ${res.status}`;
        } catch (err) {
          detail = err instanceof Error ? err.message : String(err);
        }
        if (!ok && attempt < 3) await new Promise((r) => setTimeout(r, attempt * 1000));
      }
      if (ok) {
        console.log('Content caches dropped — the article is visible on the site now.');
      } else {
        // Non-zero exit: the row is written but the site is still serving the
        // old pages, so the run did NOT achieve what it was asked to. Reporting
        // that as success is how a publishing path quietly stops working.
        console.error(
          `\n⚠ Cache drop failed after 3 attempts (${detail}).\n` +
            '  The article IS written, but the site will keep serving stale pages until the\n' +
            '  caches are cleared. Re-run the revalidate call before calling this published.',
        );
        await sql.end();
        process.exit(2);
      }
    }
  } else if (!args.skipMedia) {
    // Only worth shouting about on a real run: a --skip-media run is a local
    // verification and has no site in front of it to go stale.
    console.warn(
      '\n⚠ No --revalidate-url given, so the site caches were NOT dropped. The article is\n' +
        '  in the database and will stay invisible on the site until they are. Pass the\n' +
        '  site base URL to finish the job.',
    );
  }
  await sql.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
