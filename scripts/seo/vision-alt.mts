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
 * alt an editor happened to write that way, and would not notice if the ordinal
 * had drifted. An exact match against a recomputed string never describes the
 * wrong photograph.
 *
 * What it does instead is MISS one, silently, and that is the trade. The stored
 * string carries the article's title, so renaming an article after the backfill
 * ran stops it matching: those images quietly leave the target set, are never
 * extracted and never described, and the run finishes reporting success while
 * they keep the old title and a number. Nothing in the matching can notice.
 * `--expect <n>` is how you make it notice — pass the number you were told to
 * expect and a corpus that no longer holds it stops the run.
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
 *   6. No newline and no `|`, either of which breaks the row of the dry-run
 *      table somebody reads before authorising the write.
 *   7. Written from THIS photograph: each description carries the `src` it was
 *      written against, and a mismatch stops the run.
 *
 * ── WHAT NO RULE HERE CHECKS ──────────────────────────────────────────────
 *
 * That the text is Malay, and that it describes the photograph rather than
 * some other photograph. Both are held by a person reading the dry-run report,
 * and neither is mechanisable here: these pages name venues and vendors in
 * English ("The Danna Langkawi", "Sime Darby Convention Centre", "Jimmy Choo"),
 * so any English-stopword test rejects correct alts, and no string check can
 * see a picture. The dry-run report prints every row with its image URL for
 * exactly this reason. Read a sample of it before passing `--apply`.
 *
 * Usage (DATABASE_URL injected, never typed):
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --extract out.jsonl --expect 369
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --descriptions d.json --undo dir --report r.md --expect 369
 *   pwsh -File scripts/seo/run-with-db.ps1 pnpm exec tsx scripts/seo/vision-alt.mts --descriptions d.json --undo dir --report r.md --expect 369 --apply
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
/**
 * A flag's value, or nothing.
 *
 * The next token is REFUSED when it is itself a flag. Taking it unconditionally
 * meant `--undo --report r.md` bound the undo directory to the literal string
 * `--report`, passed the "you must pass --undo" gate, and created a directory
 * named `--report` holding the manifest a production apply then trusts.
 */
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  if (i === -1) return undefined;
  const value = argv[i + 1];
  if (value === undefined || value.startsWith('--')) {
    throw new Error(`${name} needs a value, and "${value ?? '(nothing)'}" is not one`);
  }
  return value;
};
const extractPath = flag('--extract');
const descriptionsPath = flag('--descriptions');
const undoDir = flag('--undo');
const reportPath = flag('--report');
const expectRaw = flag('--expect');

/**
 * How many images this run expects to find on the positional fallback.
 *
 * Optional, and worth passing. An article renamed after the backfill ran no
 * longer matches `fallbackImageAlt(title, ordinal)`, so its images drop out of
 * the target set SILENTLY — never extracted, never described, and the run
 * reports success while they keep the old title and a number forever. Nothing
 * about the matching can notice that on its own. A count can.
 */
const expected = expectRaw === undefined ? undefined : Number(expectRaw);
if (expected !== undefined && !Number.isInteger(expected)) {
  throw new Error(`--expect takes a whole number, not "${expectRaw}"`);
}

if (!extractPath && !descriptionsPath) {
  throw new Error('nothing to do: pass --extract <file.jsonl> or --descriptions <file.json>');
}
if (descriptionsPath && (!undoDir || !reportPath)) {
  throw new Error('--descriptions needs --undo <dir> and --report <file.md>');
}

/** Stop the run when the corpus no longer holds what the operator was told it holds. */
function assertExpectedCount(found: number): void {
  if (expected === undefined || found === expected) return;
  throw new Error(
    `refusing to continue: ${found} images carry the positional fallback, but --expect said ${expected}. ` +
      `An article renamed since the backfill ran stops matching and drops out of this set without a word, ` +
      `so the difference is reported rather than absorbed.`,
  );
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
    out.push({
      ordinal: site.ordinal,
      src: site.src,
      mid: getArticleVariantUrl(site.src, 'mid'),
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
  /**
   * The `src` of the photograph this sentence was written from.
   *
   * Not decoration, and not optional. `id` + `ordinal` names a POSITION, and a
   * position can be given a different picture: swap the image at ordinal 12
   * between the extract and the apply and the stored alt is still the
   * fallback, the ordinal is still 12, every rule still passes, the manifest
   * hash still matches — and a description of the old frame is written onto
   * the new one. A screen-reader user is then told, with total confidence,
   * about a photograph that is not there. Carrying the src is what makes the
   * binding checkable, and `describeDoc` refuses to write when it disagrees.
   */
  src: string;
}

function readDescriptions(path: string): Description[] {
  const parsed = JSON.parse(readFileSync(path, 'utf8')) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error(`${path} must be a JSON array of { id, ordinal, alt }`);
  }
  return parsed.map((row, i) => {
    // The null check comes FIRST. Reading `.id` off a null throws a bare
    // TypeError that says nothing about which file or which row.
    if (!row || typeof row !== 'object' || Array.isArray(row)) {
      throw new Error(`${path}[${i}] is ${JSON.stringify(row)}, not an object`);
    }
    const r = row as Partial<Description>;
    if (
      typeof r.id !== 'string' ||
      typeof r.ordinal !== 'number' ||
      typeof r.alt !== 'string' ||
      typeof r.src !== 'string' ||
      !r.src
    ) {
      throw new Error(
        `${path}[${i}] is not { id: string, ordinal: number, alt: string, src: string }`,
      );
    }
    if (!Number.isInteger(r.ordinal) || r.ordinal < 0) {
      throw new Error(`${path}[${i}] has ordinal ${r.ordinal}; ordinals are whole and 0-based`);
    }
    return { id: r.id, ordinal: r.ordinal, alt: r.alt.trim(), src: r.src };
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
  byOrdinal: Map<number, { alt: string; src: string }>,
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
    const supplied = byOrdinal.get(site.ordinal);
    if (supplied === undefined) {
      throw new Error(
        `no description for ${where}. Every image on the positional fallback needs one; a half-described article looks finished and is not.`,
      );
    }
    byOrdinal.delete(site.ordinal);
    const { alt } = supplied;

    // The sentence has to belong to THIS photograph, not merely to this slot.
    if (supplied.src !== site.src) {
      throw new Error(
        `description for ${where} was written from ${supplied.src}, but that ordinal now holds ${site.src}. ` +
          `The image was replaced after the extract; re-extract and re-describe it rather than writing a description of a photograph that is no longer there.`,
      );
    }

    if (!alt) throw new Error(`empty description for ${where}`);
    if (alt.length > MAX_ALT) {
      throw new Error(
        `description for ${where} is ${alt.length} characters, over the ${MAX_ALT} budget: ${alt}`,
      );
    }
    if (alt === stored || POSITIONAL_TAIL.test(alt)) {
      throw new Error(`description for ${where} is still the positional fallback: ${alt}`);
    }
    if (/[\r\n|]/.test(alt)) {
      throw new Error(
        `description for ${where} contains a newline or a pipe, which breaks the row of the dry-run table a human reads before authorising the write: ${JSON.stringify(alt)}`,
      );
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
      src: site.src,
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
    assertExpectedCount(images);
    // An EMPTY file, not a file holding one blank line: the consumer reads this
    // a line at a time and `JSON.parse('')` throws where "no articles" should
    // simply have been nothing to read.
    writeFileSync(extractPath, lines.length ? lines.join('\n') + '\n' : '');
    console.log(`${images} images on the positional fallback across ${lines.length} articles`);
    console.log(`extract -> ${extractPath}`);
  }

  if (descriptionsPath && undoDir && reportPath) {
    const manifestPath = join(undoDir, '_manifest.json');
    const descriptions = readDescriptions(descriptionsPath);
    const byArticle = new Map<string, Map<number, { alt: string; src: string }>>();
    for (const d of descriptions) {
      const m = byArticle.get(d.id) ?? new Map<number, { alt: string; src: string }>();
      if (m.has(d.ordinal)) {
        throw new Error(`two descriptions for article ${d.id} image ${d.ordinal + 1}`);
      }
      m.set(d.ordinal, { alt: d.alt, src: d.src });
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

    assertExpectedCount(rows.length);

    // Nothing to describe is a STOP, not a quiet success. Without this, an
    // empty descriptions file — or a second dry run after a successful apply,
    // when no image is left on the fallback — writes a manifest with no
    // entries, and the `--apply` that follows creates a whole backup table for
    // nothing and prints "APPLIED — 0 article rows updated" as though it had
    // done the job.
    if (rows.length === 0) {
      throw new Error(
        'nothing to describe: no published article carries the positional fallback. ' +
          'If this run was meant to write something, the descriptions file or the corpus is not what you think it is.',
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

      // The loop above just worked out, from the CURRENT database and the
      // CURRENT descriptions file, exactly which articles need writing. The
      // apply then writes only what the stored manifest names. If those two
      // disagree the difference is silent: descriptions appended after the dry
      // run pass every check above, are absent from the manifest, and are never
      // written — a partial application reported as "APPLIED — N rows updated".
      // `_content-apply.mts` cannot catch it, because it only ever sees the
      // manifest's own list.
      const now = manifest.entries.map((e) => e.id).sort();
      const then = stored.entries.map((e) => e.id).sort();
      if (now.length !== then.length || now.some((id, i) => id !== then[i])) {
        throw new Error(
          `refusing to apply: the dry run covered ${then.length} article(s), but ${now.length} need describing now. ` +
            `Re-run the dry run against this descriptions file and read the diff again.`,
        );
      }

      const result = await applyContentMigration({
        sql,
        manifest: stored,
        undoDir,
        backupSlug: 'visionalt',
        transform: (row: ArticleRow) => {
          // A FRESH map per call: `describeDoc` consumes it, and the apply path
          // may re-run the transform.
          const supplied = new Map(
            descriptions
              .filter((d) => d.id === row.id)
              .map((d) => [d.ordinal, { alt: d.alt, src: d.src }] as const),
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
