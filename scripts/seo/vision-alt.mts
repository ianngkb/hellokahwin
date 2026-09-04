#!/usr/bin/env node
/**
 * Replace the positional fallback alts on the real-wedding photo essays with
 * descriptions of what is actually in each frame.
 *
 * ── WHAT THIS FINISHES ────────────────────────────────────────────────────
 *
 * `backfill-image-alt.mts` put a value in every empty `alt` in published
 * content, on a four-rung chain. 369 of them reached the last rung and were
 * stored as `${article.title} — gambar ${n}`. That string is TRUE and it is
 * better than the `alt=""` it replaced, but it is not a description: it is the
 * same sentence twenty-five times down a page of twenty-five different
 * photographs, and a screen reader reading it aloud learns the article's title
 * and nothing else. The images are the photo essays, where fifteen consecutive
 * pictures share one paragraph and the document distinguishes none of them —
 * so describing them needs somebody, or something, to look at them. That is
 * what `--extract` is for, and what `--descriptions` brings back.
 *
 * ── HOW AN IMAGE IS IDENTIFIED, AND WHY NOT BY REGEX ──────────────────────
 *
 * A target is an image whose stored alt is EXACTLY
 * `fallbackImageAlt(title, ordinal)` — the same function, the same ordinal,
 * recomputed from the same shared walker the backfill used
 * (`_content-images.mts`). A regex for `/— gambar \d+$/` would also match an
 * alt an editor happened to write that way, and would not notice if the
 * ordinal had drifted. An exact match against a recomputed string cannot: if
 * the two walkers ever disagree about what counts as an image, the count comes
 * back short and the run stops instead of describing the wrong photograph.
 *
 * ── THE MODES ─────────────────────────────────────────────────────────────
 *
 *   --extract <file.jsonl>
 *       One JSON object per article: the article's own words (title, headings,
 *       captions, prose) and every target image with its `mid.webp` URL. The
 *       article's words are there so a description can name the venue the
 *       ARTICLE names, and nothing else.
 *
 *   --descriptions <file.json> --undo <dir> --report <file.md>
 *       Dry run. Checks every description against the rules below, writes the
 *       undo files, the manifest and the report. Writes nothing to the database.
 *
 *   ... --apply
 *       The same, with the write, through `_content-apply.mts`.
 *
 * ── WHAT A DESCRIPTION HAS TO SURVIVE ─────────────────────────────────────
 *
 * Every rule here is a HARD FAILURE for the whole run, not a skipped row. A
 * partly-described article is worse than an undescribed one: it looks finished.
 *
 *   1. Every target image has a description, and every description names a
 *      target image. No strays, no gaps.
 *   2. 125 characters, the same budget the backfill used — screen readers
 *      truncate around there and a long alt stops being useful well before.
 *   3. Not the positional fallback again, in any ordinal.
 *   4. No `gambar`/`foto`/`imej` opener. "Gambar pelamin" tells a
 *      screen-reader user the image is an image, which they know.
 *   5. Unique on the page, case-insensitively, against the other new alts AND
 *      against the alts already stored there — the accessible-name collision
 *      `backfill-image-alt.mts` guards with its `(gambar N)` suffix.
 *
 * Usage (DATABASE_URL injected, never typed):
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --extract out.jsonl
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --descriptions d.json --undo dir --report r.md
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --descriptions d.json --undo dir --report r.md --apply
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fallbackImageAlt } from '../../src/lib/inspire/image-alt';
import { getArticleVariantUrl } from '../../src/lib/storage/article-image-variant';
import {
  connect,
  contentHash,
  newRunId,
  parseMode,
  requireManifest,
  type Manifest,
} from './_db.mts';
import { applyContentMigration, type ArticleRow } from './_content-apply.mts';
import { textOf, walkArticleImages } from './_content-images.mts';

const SCRIPT = 'vision-alt';

/** Same budget as the backfill, for the same reason. */
const MAX_ALT = 125;

/** How much of the article's prose the extract carries as grounding. */
const PROSE_BUDGET = 4000;

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const extractPath = flag('--extract');
const descriptionsPath = flag('--descriptions');
const undoDir = flag('--undo');
const reportPath = flag('--report');

if (!extractPath && !descriptionsPath) {
  throw new Error('nothing to do: pass --extract <file.jsonl> or --descriptions <file.json>');
}
if (descriptionsPath && (!undoDir || !reportPath)) {
  throw new Error('--descriptions needs --undo <dir> and --report <file.md>');
}

interface Target {
  ordinal: number;
  src: string;
  /** The 680px article-body rung — 350 KB rather than the 1.4 MB `high`. */
  mid: string;
  heading: string | null;
  caption: string | null;
  oldAlt: string;
}

interface Article {
  id: string;
  slug: string;
  title: string;
  content: unknown;
  updated_at_raw: string;
}

/** Every image on this article still carrying the positional fallback. */
function findTargets(a: { title: string; content: unknown }): Target[] {
  const out: Target[] = [];
  walkArticleImages(a.content, (site) => {
    const stored = typeof site.alt === 'string' ? site.alt.trim() : '';
    if (!stored || stored !== fallbackImageAlt(a.title, site.ordinal)) return;
    const src = typeof site.src === 'string' ? site.src : '';
    out.push({
      ordinal: site.ordinal,
      src,
      mid: src ? getArticleVariantUrl(src, 'mid') : '',
      heading: site.heading,
      caption: typeof site.caption === 'string' && site.caption.trim() ? site.caption.trim() : null,
      oldAlt: stored,
    });
  });
  return out;
}

/** Every accessible name already on the page, whoever wrote it. */
function existingAlts(content: unknown): string[] {
  const out: string[] = [];
  walkArticleImages(content, (site) => {
    if (typeof site.alt === 'string' && site.alt.trim()) out.push(site.alt.trim());
  });
  return out;
}

/**
 * The article's own prose, in document order, headings included.
 *
 * This is the ONLY source a description may name a venue or a vendor from. A
 * photograph of a hotel ballroom does not say which hotel; the article does.
 */
function proseOf(doc: unknown): string {
  const parts: string[] = [];
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    const o = n as { type?: string; content?: unknown };
    if (o.type === 'paragraph' || o.type === 'heading') {
      const t = textOf(o);
      if (t) parts.push(t);
      return;
    }
    if (o.content) walk(o.content);
  };
  walk((doc as { content?: unknown } | null)?.content);
  return parts.join('\n').slice(0, PROSE_BUDGET);
}

/** `Gambar`, `Foto`, `Imej` as an opening word. */
const IMAGE_WORD_OPENER = /^\s*(gambar|foto|imej|image|photo|picture)\b/i;

/** The shape the fallback leaves behind, in any ordinal. */
const POSITIONAL_TAIL = /—\s*gambar\s+\d+\s*$/i;

interface Description {
  id: string;
  ordinal: number;
  alt: string;
}

function readDescriptions(path: string): Description[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must be a JSON array of { id, ordinal, alt }`);
  }
  return parsed.map((row, i) => {
    const r = row as Partial<Description>;
    if (typeof r.id !== 'string' || typeof r.ordinal !== 'number' || typeof r.alt !== 'string') {
      throw new Error(`${path}[${i}] is not { id: string, ordinal: number, alt: string }`);
    }
    return { id: r.id, ordinal: r.ordinal, alt: r.alt.trim() };
  });
}

interface Written {
  ordinal: number;
  src: string;
  oldAlt: string;
  alt: string;
}

/**
 * Write the descriptions into a clone of the article, or explain exactly why
 * the whole run has to stop.
 *
 * `byOrdinal` is CONSUMED rather than read: whatever is left in it afterwards
 * named an image this article does not have on the fallback, and the caller
 * turns that into the error. Callers pass a copy.
 */
function describeDoc(
  a: { id: string; slug: string; title: string; content: unknown },
  byOrdinal: Map<number, string>,
): { next: unknown; written: Written[] } {
  const next = structuredClone(a.content);
  const written: Written[] = [];

  // Seeded with every name already on the page, so a new alt cannot collide
  // with one an editor wrote. The fallbacks themselves are removed first —
  // they are the strings being replaced, and every one of them would otherwise
  // count as an existing name.
  const used = new Set(existingAlts(a.content).map((x) => x.toLowerCase()));
  for (const t of findTargets(a)) used.delete(t.oldAlt.toLowerCase());

  walkArticleImages(next, (site) => {
    const stored = typeof site.alt === 'string' ? site.alt.trim() : '';
    if (!stored || stored !== fallbackImageAlt(a.title, site.ordinal)) return;

    const where = `${a.slug} image ${site.ordinal + 1}`;
    const alt = byOrdinal.get(site.ordinal);
    if (alt === undefined) {
      throw new Error(
        `no description for ${where}. Every image on the positional fallback needs one; a half-described article looks finished and is not.`,
      );
    }
    byOrdinal.delete(site.ordinal);

    if (!alt) throw new Error(`empty description for ${where}`);
    if (alt.length > MAX_ALT) {
      throw new Error(
        `description for ${where} is ${alt.length} characters, over the ${MAX_ALT} budget: ${alt}`,
      );
    }
    if (alt === stored || POSITIONAL_TAIL.test(alt)) {
      throw new Error(`description for ${where} is still the positional fallback: ${alt}`);
    }
    if (IMAGE_WORD_OPENER.test(alt)) {
      throw new Error(
        `description for ${where} opens by saying it is an image, which a screen-reader user already knows: ${alt}`,
      );
    }
    const key = alt.toLowerCase();
    if (used.has(key)) {
      throw new Error(
        `description for ${where} repeats an accessible name already on the page: ${alt}`,
      );
    }
    used.add(key);

    site.setAlt(alt);
    written.push({
      ordinal: site.ordinal,
      src: typeof site.src === 'string' ? site.src : '',
      oldAlt: stored,
      alt,
    });
  });

  return { next, written };
}

const sql = connect();
try {
  const arts = await sql<Article[]>`
    select id, slug, title, content, updated_at::text as updated_at_raw from articles
    where status = 'published' order by slug`;

  if (extractPath) {
    const lines: string[] = [];
    let images = 0;
    for (const a of arts) {
      const targets = findTargets(a);
      if (targets.length === 0) continue;
      images += targets.length;
      lines.push(
        JSON.stringify({
          id: a.id,
          slug: a.slug,
          title: a.title,
          prose: proseOf(a.content),
          images: targets,
        }),
      );
    }
    writeFileSync(extractPath, lines.join('\n') + '\n');
    console.log(`${images} images on the positional fallback across ${lines.length} articles`);
    console.log(`extract -> ${extractPath}`);
  }

  if (descriptionsPath && undoDir && reportPath) {
    const manifestPath = join(undoDir, '_manifest.json');
    const descriptions = readDescriptions(descriptionsPath);
    const byArticle = new Map<string, Map<number, string>>();
    for (const d of descriptions) {
      const m = byArticle.get(d.id) ?? new Map<number, string>();
      if (m.has(d.ordinal)) {
        throw new Error(`two descriptions for article ${d.id} image ${d.ordinal + 1}`);
      }
      m.set(d.ordinal, d.alt);
      byArticle.set(d.id, m);
    }

    const manifest: Manifest = {
      script: SCRIPT,
      runId: newRunId(),
      generatedAt: new Date().toISOString(),
      entries: [],
    };
    const rows: (Written & { slug: string })[] = [];

    for (const a of arts) {
      const targets = findTargets(a);
      const supplied = byArticle.get(a.id);
      byArticle.delete(a.id);
      if (targets.length === 0) {
        if (supplied && supplied.size > 0) {
          throw new Error(
            `${supplied.size} description(s) for ${a.slug}, which has no image on the positional fallback.`,
          );
        }
        continue;
      }
      if (!supplied) {
        throw new Error(`no descriptions at all for ${a.slug} (${targets.length} images)`);
      }

      const { next, written } = describeDoc(a, supplied);
      if (supplied.size > 0) {
        const stray = [...supplied.keys()].map((o) => o + 1).join(', ');
        throw new Error(
          `${supplied.size} description(s) for ${a.slug} name images that are not on the positional fallback: ${stray}`,
        );
      }
      rows.push(...written.map((w) => ({ slug: a.slug, ...w })));
      manifest.entries.push({
        id: a.id,
        slug: a.slug,
        updatedAt: a.updated_at_raw,
        preimageHash: contentHash(a.content),
        postimageHash: contentHash(next),
      });
      if (!apply) {
        mkdirSync(undoDir, { recursive: true });
        writeFileSync(
          join(undoDir, `${a.slug}.json`),
          JSON.stringify({ id: a.id, slug: a.slug, content: a.content }, null, 1),
        );
      }
    }

    if (byArticle.size > 0) {
      throw new Error(
        `descriptions name article id(s) that are not published: ${[...byArticle.keys()].join(', ')}`,
      );
    }

    if (!apply) {
      mkdirSync(undoDir, { recursive: true });
      writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

      const lengths = rows.map((r) => r.alt.length);
      const out: string[] = [];
      out.push('# Vision alt text — dry run', '');
      out.push(`Run id: \`${manifest.runId}\``);
      out.push(
        `Descriptions to write: **${rows.length}** across **${manifest.entries.length}** articles`,
        '',
      );
      out.push(
        `Length ${Math.min(...lengths)}–${Math.max(...lengths)} characters against a ${MAX_ALT} budget, ` +
          `mean ${Math.round(lengths.reduce((s, n) => s + n, 0) / lengths.length)}.`,
        '',
      );
      out.push('## Per article', '');
      out.push('| article | images described |', '| --- | --- |');
      const perArticle = new Map<string, number>();
      for (const r of rows) perArticle.set(r.slug, (perArticle.get(r.slug) ?? 0) + 1);
      for (const [slug, n] of [...perArticle].sort((x, y) => y[1] - x[1])) {
        out.push(`| ${slug} | ${n} |`);
      }
      out.push('', '## Every alt written', '');
      out.push(
        '| article | image | old alt | new alt | chars |',
        '| --- | --- | --- | --- | --- |',
      );
      for (const r of rows) {
        out.push(`| ${r.slug} | ${r.src} | ${r.oldAlt} | ${r.alt} | ${r.alt.length} |`);
      }
      writeFileSync(reportPath, out.join('\n') + '\n');

      console.log(`${rows.length} descriptions across ${manifest.entries.length} articles`);
      console.log(`report   -> ${reportPath}`);
      console.log(`undo     -> ${undoDir} (${manifest.entries.length} documents)`);
      console.log(`manifest -> ${manifestPath} (run ${manifest.runId})`);
      console.log('DRY RUN — nothing written. Re-run with --apply.');
    } else {
      let raw: string | undefined;
      try {
        raw = readFileSync(manifestPath, 'utf8');
      } catch {
        raw = undefined;
      }
      const stored = requireManifest(raw, SCRIPT, manifestPath);
      const result = await applyContentMigration({
        sql,
        manifest: stored,
        undoDir,
        backupSlug: 'visionalt',
        transform: (row: ArticleRow) => {
          // A FRESH map per call: `describeDoc` consumes it, and the apply path
          // may re-run the transform.
          const supplied = new Map(
            descriptions.filter((d) => d.id === row.id).map((d) => [d.ordinal, d.alt] as const),
          );
          return describeDoc(row, supplied).next;
        },
      });
      console.log(`backup table ${result.backupTable} (${result.backupRows} rows)`);
      console.log(`APPLIED — ${result.written} article rows updated`);
    }
  }
} finally {
  await sql.end();
}
