#!/usr/bin/env node
/**
 * Store `alt` text on every undescribed image in published content.
 *
 * Ahrefs, 28 Ogos 2026: "Missing alt text", 172 images. Phase 1 closed the
 * worst of it at RENDER time — `fallbackImageAlt` now serves
 * `${article.title} — gambar ${n}` instead of the `alt=""` that declares a
 * photograph decorative. This puts a value in the database, so the alt is the
 * article's data rather than a property of one renderer.
 *
 * ── THE CHAIN, AND WHAT EACH RUNG IS WORTH ────────────────────────────────
 *
 * Per the brief: the article title, the nearby caption or heading, and the
 * vendor credit. In priority order, per image:
 *
 *  1. A DESCRIPTIVE caption. Used almost verbatim; the editor described the
 *     picture and nobody here can do better.
 *  2. The SECTION HEADING plus an authored phrase saying what the section is.
 *     Every one of the 13 listicles involved has headings that name their
 *     subject ("16. Jardin Event Venue", "Kek Hantaran", "Pendaftaran
 *     Kursus").
 *  3. A CREDIT-ONLY caption ("SOURCE: Syafiq Lomotech"), attributed AS a
 *     credit rather than promoted to the subject. It ranks below the heading
 *     because a credit names whoever supplied the photograph, which is often
 *     the photographer and not the venue.
 *  4. `fallbackImageAlt` — the article title and the image's position. This is
 *     the last rung, and it is IMPORTED rather than reproduced, so a stored
 *     alt from this rung is byte-identical to what the renderer would have
 *     shown.
 *
 * ── BE HONEST ABOUT RUNG 4 ────────────────────────────────────────────────
 *
 * Rung 4 is not a description. It is true, and it is better than `alt=""`, and
 * it is what the brief asks to store — but an image that reaches it is still
 * an image nobody has described. The great majority of them are the
 * real-wedding photo essays, where fifteen consecutive photographs share one
 * paragraph and the document distinguishes none of them; describing those
 * needs an editor or a vision model. So the report ends with the TOP 20
 * ARTICLES BY IMAGE COUNT and how many of each article's images reached rung
 * 4, which is the spot-check list the brief asks for and the worklist for
 * whoever does that pass. Storing the fallback must not make the gap invisible.
 *
 * ── DRY RUN FIRST, ALWAYS ─────────────────────────────────────────────────
 * See `_content-apply.mts` for the order of checks the apply performs and
 * `_db.mts` for why each exists.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/backfill-image-alt.mts --undo <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/backfill-image-alt.mts --undo <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { fallbackImageAlt } from '../../src/lib/inspire/image-alt';
import {
  connect,
  contentHash,
  newRunId,
  parseMode,
  requireManifest,
  type Manifest,
} from './_db.mts';
import { applyContentMigration, type ArticleRow } from './_content-apply.mts';

const SCRIPT = 'backfill-image-alt';

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const undoDir = flag('--undo');
const reportPath = flag('--report');
if (!undoDir || !reportPath) throw new Error('--undo <dir> and --report <file.md> are mandatory');
const manifestPath = join(undoDir, '_manifest.json');

/** Screen readers truncate around here, and a long alt stops being useful well before. */
const MAX_ALT = 125;

const here = dirname(fileURLToPath(import.meta.url));
const phrases: Record<string, string> = JSON.parse(
  readFileSync(join(here, 'image-alt-phrases.json'), 'utf8'),
).phrases;

/** The visible text of a TipTap node, marks and nesting included. */
function textOf(node: unknown): string {
  let out = '';
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    const o = n as { type?: string; text?: string; content?: unknown };
    if (o.type === 'text' && typeof o.text === 'string') out += o.text;
    if (o.content) walk(o.content);
  };
  walk(node);
  return out.trim();
}

/**
 * The heading text as a subject: the list number a listicle heading opens with
 * is numbering, not a name, and reading "16. Jardin Event Venue" aloud is
 * worse than reading "Jardin Event Venue".
 */
function subjectFromHeading(heading: string): string {
  return heading
    .replace(/^\s*\d+\s*[.)]\s*/, '')
    .replace(/[:\s]+$/, '')
    .trim();
}

/** `SOURCE: Jardin Event Venue` and its many casings. */
const CREDIT_PREFIX = /^\s*(source|sumber|image|photo|foto|credit|kredit)\s*[:：]\s*/i;

/**
 * A caption is either a description of the picture or a credit for it, and the
 * two want opposite treatment. A credit names the venue or vendor; a
 * description already IS alt text.
 *
 * The test is deliberately conservative: a `SOURCE:` prefix, or a bare name
 * with no sentence in it. Anything with real prose is treated as a
 * description, because mistaking one for a credit would throw away the best
 * signal on the page.
 */
function readCaption(caption: string): { kind: 'credit' | 'description'; text: string } | null {
  const text = caption.trim();
  if (!text) return null;
  const credited = text.replace(CREDIT_PREFIX, '').trim();
  if (CREDIT_PREFIX.test(text)) {
    return credited ? { kind: 'credit', text: credited } : null;
  }
  // No prefix. Treat a short, sentence-free fragment as a bare credit line
  // ("TK Teo Photography"), and anything longer as a description.
  const wordCount = text.split(/\s+/).length;
  if (wordCount <= 5 && !/[.!?,]/.test(text)) return { kind: 'credit', text };
  return { kind: 'description', text };
}

/** Trim to the alt budget on a word boundary rather than mid-word. */
function clamp(text: string): string {
  if (text.length <= MAX_ALT) return text;
  const cut = text.slice(0, MAX_ALT);
  const space = cut.lastIndexOf(' ');
  return (space > MAX_ALT * 0.6 ? cut.slice(0, space) : cut).trimEnd();
}

interface Assignment {
  slug: string;
  id: string;
  rung: 'caption' | 'credit' | 'heading' | 'title';
  context: string;
  alt: string;
}

interface DocResult {
  next: unknown;
  assignments: Assignment[];
  /** Every image in the article, described or not — the denominator for the top-20 list. */
  totalImages: number;
}

/**
 * Walk one article in document order, filling in every blank `alt`.
 *
 * Clones first: the apply path re-runs this against a freshly locked row and
 * compares the result to the hash the dry run promised, so the input must
 * survive the call unchanged.
 *
 * The traversal is RECURSIVE and unwraps `sectionBlock` the way
 * `article-renderer.tsx` does. It used to look for a node type called
 * `section`, which does not exist — every image inside a real section was
 * skipped silently, and the ordinal sequence would have drifted out of step
 * with the renderer's.
 */
function backfillDoc(doc: unknown, slug: string, id: string, title: string): DocResult {
  const next = structuredClone(doc);
  const phrase = phrases[slug];
  const assignments: Assignment[] = [];
  let totalImages = 0;
  let ordinal = 0;
  let heading: string | null = null;

  /**
   * Accessible names already used on this page, seeded with the alts editors
   * wrote. Counting only the generated ones let a generated value collide with
   * an existing name, which is the defect the `(gambar N)` suffix exists to
   * prevent in the first place.
   */
  const used = new Set<string>();
  const seed = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(seed);
    if (!n || typeof n !== 'object') return;
    const o = n as { type?: string; attrs?: Record<string, unknown>; content?: unknown };
    const alt = typeof o.attrs?.alt === 'string' ? o.attrs.alt.trim() : '';
    if (alt) used.add(alt);
    if (o.type === 'galleryBlock') {
      for (const g of parseGallery(o.attrs)) {
        if (typeof g.alt === 'string' && g.alt.trim()) used.add(g.alt.trim());
      }
    }
    if (o.content) seed(o.content);
  };
  seed(next);

  /** Make `candidate` unique on this page without inventing anything. */
  const unique = (candidate: string): string => {
    if (!used.has(candidate)) {
      used.add(candidate);
      return candidate;
    }
    for (let n = 2; ; n++) {
      const withOrdinal = clamp(`${candidate} (gambar ${n})`);
      if (!used.has(withOrdinal)) {
        used.add(withOrdinal);
        return withOrdinal;
      }
    }
  };

  const describe = (
    storedAlt: unknown,
    caption: unknown,
  ): { alt: string; rung: Assignment['rung']; context: string } | null => {
    const stored = typeof storedAlt === 'string' ? storedAlt.trim() : '';
    const thisOrdinal = ordinal++;
    totalImages++;
    if (stored) return null;

    const read = typeof caption === 'string' ? readCaption(caption) : null;
    if (read?.kind === 'description') {
      return { alt: unique(clamp(read.text)), rung: 'caption', context: read.text };
    }
    // HEADING BEFORE CREDIT, and the order is load-bearing. On these listicles
    // the heading names the SUBJECT ("1. Dewan Seri Siantan, Putrajaya") while
    // the caption names whoever supplied the photograph ("Source: Syafiq
    // Lomotech"). Credit-first produced "Syafiq Lomotech, salah satu dewan
    // kahwin murah di Selangor dan KL" — a photographer described as a
    // wedding hall, which is a false statement in the field a screen reader
    // reads aloud.
    if (heading && phrase) {
      const subject = subjectFromHeading(heading);
      if (subject) {
        return {
          alt: unique(clamp(`${subject}, ${phrase}`)),
          rung: 'heading',
          context: heading,
        };
      }
    }
    if (read?.kind === 'credit' && phrase) {
      // Phrased so it stays true whether the credit names the venue or the
      // photographer: the section says what the picture is of, and the credit
      // is attributed as a credit rather than promoted to the subject.
      const sentence = phrase.charAt(0).toUpperCase() + phrase.slice(1);
      return {
        alt: unique(clamp(`${sentence}, gambar daripada ${read.text}`)),
        rung: 'credit',
        context: `caption: ${read.text}`,
      };
    }
    const fallback = fallbackImageAlt(title, thisOrdinal);
    if (!fallback) return null;
    // NOT run through `unique`: this string is exactly what the renderer would
    // have produced for this image, and its ordinal already makes it unique.
    used.add(fallback);
    return { alt: fallback, rung: 'title', context: `ordinal ${thisOrdinal + 1}` };
  };

  const record = (r: { alt: string; rung: Assignment['rung']; context: string }) =>
    assignments.push({ slug, id, ...r });

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown };

    if (n.type === 'heading') {
      heading = textOf(n);
      return;
    }
    if (n.type === 'image' || n.type === 'figureBlock') {
      const attrs = (n.attrs ?? {}) as Record<string, unknown>;
      const result = describe(attrs.alt, attrs['data-caption']);
      if (result) {
        attrs.alt = result.alt;
        n.attrs = attrs;
        record(result);
      }
      return;
    }
    if (n.type === 'galleryBlock') {
      const images = parseGallery(n.attrs);
      let touched = false;
      for (const img of images) {
        const result = describe(img.alt, img.caption);
        if (result) {
          img.alt = result.alt;
          touched = true;
          record(result);
        }
      }
      if (touched && n.attrs) n.attrs['data-images'] = JSON.stringify(images);
      return;
    }
    // Everything else, `sectionBlock` included, is walked through.
    if (n.content) walk(n.content);
  };
  walk((next as { content?: unknown } | null)?.content);

  return { next, assignments, totalImages };
}

interface GalleryImage {
  src?: string;
  alt?: unknown;
  caption?: unknown;
}
function parseGallery(attrs: Record<string, unknown> | undefined): GalleryImage[] {
  const raw = attrs?.['data-images'];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GalleryImage[]) : [];
  } catch {
    return [];
  }
}

const sql = connect();
try {
  const arts = await sql<
    { id: string; slug: string; title: string; content: unknown; updated_at: Date }[]
  >`select id, slug, title, content, updated_at from articles where status = 'published' order by slug`;

  const bySlug = new Map(arts.map((a) => [a.slug, a]));
  const orphan = Object.keys(phrases).filter((s) => !bySlug.has(s));
  if (orphan.length) {
    throw new Error(`phrases name articles that are not published: ${orphan.join(', ')}`);
  }

  const perArticle = new Map<string, { total: number; byRung: Record<string, number> }>();
  const all: Assignment[] = [];
  const manifest: Manifest = {
    script: SCRIPT,
    runId: newRunId(),
    generatedAt: new Date().toISOString(),
    entries: [],
  };

  for (const a of arts) {
    const { next, assignments, totalImages } = backfillDoc(a.content, a.slug, a.id, a.title);
    const byRung: Record<string, number> = {};
    for (const x of assignments) byRung[x.rung] = (byRung[x.rung] ?? 0) + 1;
    if (totalImages > 0) perArticle.set(a.slug, { total: totalImages, byRung });
    if (assignments.length === 0) continue;
    all.push(...assignments);
    const over = assignments.find((x) => x.alt.length > MAX_ALT);
    if (over) throw new Error(`alt over ${MAX_ALT} characters on ${a.slug}: ${over.alt}`);
    manifest.entries.push({
      id: a.id,
      slug: a.slug,
      updatedAt: new Date(a.updated_at).toISOString(),
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

  const byRung: Record<string, number> = {};
  for (const x of all) byRung[x.rung] = (byRung[x.rung] ?? 0) + 1;
  const undescribed = byRung.title ?? 0;

  if (!apply) {
    mkdirSync(undoDir, { recursive: true });
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

    const lines: string[] = [];
    lines.push('# Image alt backfill — dry run', '');
    lines.push(`Run id: \`${manifest.runId}\``);
    lines.push(
      `Alt values to write: **${all.length}** across **${manifest.entries.length}** articles`,
      '',
    );
    lines.push('| rung | what it is | count |', '| --- | --- | --- |');
    lines.push(
      `| caption | the editor's own description of the picture | ${byRung.caption ?? 0} |`,
    );
    lines.push(
      `| credit | a source credit naming the venue or vendor, plus the article's phrase | ${byRung.credit ?? 0} |`,
    );
    lines.push(
      `| heading | the section heading's subject, plus the article's phrase | ${byRung.heading ?? 0} |`,
    );
    lines.push(
      `| title | article title and position — TRUE, but nobody has described this image | ${undescribed} |`,
    );
    lines.push('');
    lines.push(
      `**${undescribed} images reach the last rung.** They are stored with exactly the string the`,
      'renderer already produced, so nothing on the page changes; what changes is that the value is',
      'now data. These still need a human or a vision model to describe. The list below is that',
      'worklist, and the spot-check list the brief asks for.',
      '',
    );
    lines.push('## Top 20 articles by image count', '');
    lines.push(
      '| article | images | still undescribed | described from caption/credit/heading |',
      '| --- | --- | --- | --- |',
    );
    const top = [...perArticle.entries()].sort((a, b) => b[1].total - a[1].total).slice(0, 20);
    for (const [slug, s] of top) {
      const real = (s.byRung.caption ?? 0) + (s.byRung.credit ?? 0) + (s.byRung.heading ?? 0);
      lines.push(`| ${slug} | ${s.total} | ${s.byRung.title ?? 0} | ${real} |`);
    }
    lines.push('', '## Every alt written', '');
    lines.push(
      '| article (row id) | rung | context | new alt | chars |',
      '| --- | --- | --- | --- | --- |',
    );
    for (const x of all) {
      lines.push(`| ${x.slug} (${x.id}) | ${x.rung} | ${x.context} | ${x.alt} | ${x.alt.length} |`);
    }
    writeFileSync(reportPath, lines.join('\n') + '\n');

    console.log(`${all.length} alt values across ${manifest.entries.length} articles`);
    for (const [r, n] of Object.entries(byRung)) console.log(`  ${r}: ${n}`);
    console.log(`${undescribed} reach the title fallback and still need describing`);
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
      backupSlug: 'alt',
      transform: (row: ArticleRow) => backfillDoc(row.content, row.slug, row.id, row.title).next,
    });
    console.log(`backup table ${result.backupTable} (${result.backupRows} rows)`);
    console.log(`APPLIED — ${result.written} article rows updated`);
  }
} finally {
  await sql.end();
}
