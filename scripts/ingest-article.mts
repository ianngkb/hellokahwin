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
  type ArticleImage,
} from '../src/lib/inspire/article-file';
import { generateVariants, getDefaultPresets } from '../src/lib/storage/image-variants';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '../src/lib/r2/client';

interface Args {
  file: string;
  db: string;
  commit: boolean;
  update: boolean;
  /** Skip R2 entirely — used by local verification runs with no bucket access. */
  skipMedia: boolean;
}

function parseArgs(argv: string[]): Args {
  let file = '';
  let db = '';
  let commit = false;
  let update = false;
  let skipMedia = false;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') db = argv[++i] ?? '';
    else if (a === '--commit') commit = true;
    else if (a === '--dry-run') commit = false;
    else if (a === '--update') update = true;
    else if (a === '--skip-media') skipMedia = true;
    else if (!a.startsWith('--')) file = a;
  }
  const problems: string[] = [];
  if (!file) problems.push('no article file given: pnpm ingest <file.md> --db <url>');
  if (!db)
    problems.push(
      'no --db <postgres-url> given. There is deliberately no default: DATABASE_URL points at production.',
    );
  if (problems.length) {
    console.error(problems.map((p) => `  - ${p}`).join('\n'));
    process.exit(1);
  }
  return { file, db, commit, update, skipMedia };
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
  console.log(`Status:  ${frontMatter.status}`);
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
    { url: string; key: string; variants: unknown; width?: number; height?: number; size: number }
  >();
  if (!args.skipMedia) {
    const r2 = getR2Client();
    const bucket = getR2Bucket();
    const publicUrl = getR2PublicUrl();
    const presets = await getDefaultPresets();

    for (const image of images) {
      const buffer = imageBuffers.get(image.file)!;
      const ext = extname(image.file) || '.jpg';
      const name = basename(image.file, ext);
      // The established prefix: inspire/<article-slug>/<name>/original.<ext>
      const key = `inspire/${frontMatter.slug}/${name}/original${ext}`;
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
      const variants = await generateVariants(buffer, key, presets);
      uploaded.set(image.file, {
        url: `${publicUrl}/${key}`,
        key,
        variants,
        width: meta.width,
        height: meta.height,
        size: buffer.length,
      });
      console.log(`  uploaded ${image.file}`);
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
         meta_description, status, author_id, primary_category_id, published_at, is_ai_generated)
      values
        (${frontMatter.title}, ${frontMatter.slug}, ${frontMatter.excerpt ?? null},
         ${JSON.stringify(contentWithFigures)}::jsonb, ${cover.url},
         ${cover.variants ? JSON.stringify(cover.variants) : null}::jsonb,
         ${frontMatter.metaDescription}, ${frontMatter.status}, ${author.id}, ${pillar.id},
         ${frontMatter.status === 'published' ? (frontMatter.publishedAt ?? new Date().toISOString()) : null},
         false)
      on conflict (slug) do update set
        title = excluded.title,
        excerpt = excluded.excerpt,
        content = excluded.content,
        cover_image_url = excluded.cover_image_url,
        cover_image_variants = excluded.cover_image_variants,
        meta_description = excluded.meta_description,
        status = excluded.status,
        primary_category_id = excluded.primary_category_id,
        updated_at = now()
      returning id`;

    // Both the pillar AND the cluster. The pillar link is what puts the article
    // at /artikel/<pillar>/<slug>; the cluster link is what makes it appear in
    // the right section of the pillar page and what scopes its sibling links.
    for (const categoryId of [pillar.id, cluster.id]) {
      await tx`
        insert into article_categories (article_id, category_id)
        values (${row.id}, ${categoryId})
        on conflict do nothing`;
    }

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
           alt, caption, variants, credit, credit_url, license_class, licensor_name,
           source, original_article_id, uploaded_by)
        values
          (${basename(image.file)}, ${up.key}, ${up.url}, ${up.url},
           ${'image/' + (extname(image.file).slice(1) || 'jpeg')}, ${up.size},
           ${up.width ?? null}, ${up.height ?? null}, ${image.alt}, ${image.caption ?? ''},
           ${up.variants ? JSON.stringify(up.variants) : null}::jsonb,
           ${image.credit}, ${image.creditUrl ?? null}, ${image.licenseClass}, ${image.licensorName},
           'article_upload', ${row.id}, ${author.id})
        on conflict (r2_key) do update set
          alt = excluded.alt,
          caption = excluded.caption,
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

  console.log(`\nDone. /artikel/${pillar.slug}/${frontMatter.slug} (${frontMatter.status})`);
  console.log('It will appear on the pillar page under its cluster with no further action.');
  await sql.end();
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
