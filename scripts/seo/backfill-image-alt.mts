#!/usr/bin/env node
/**
 * Store real `alt` text on the undescribed images that have something true to
 * say about them.
 *
 * Ahrefs, 28 Ogos 2026: "Missing alt text", 172 images. Phase 1 closed the
 * worst of it at RENDER time — `fallbackImageAlt` now serves
 * `${article.title} — gambar ${n}` instead of the `alt=""` that declares a
 * photograph decorative. This replaces that fallback with a stored alt
 * wherever the document itself supplies a subject.
 *
 * ── WHY 172 AND NOT 541 ───────────────────────────────────────────────────
 * 541 images in published content carry no alt. Only 172 of them sit under a
 * section heading; the other 369 are the real-wedding photo essays, where
 * fifteen consecutive photographs share one paragraph and the document says
 * nothing that distinguishes any one of them.
 *
 * Alt text is read aloud to someone who cannot see the image. Generating a
 * description of a photograph nobody has looked at would put a guess into
 * that field and present it as fact. The 369 keep the render-time fallback,
 * which is true, and describing them properly needs either an editor or a
 * vision model — a different job, named in the run's result file rather than
 * quietly attempted here.
 *
 * ── WHAT THE 172 GET ──────────────────────────────────────────────────────
 * All 13 articles involved are listicles: every one of the 172 sits under a
 * heading that NAMES its subject ("16. Jardin Event Venue", "Kek Hantaran",
 * "Pendaftaran Kursus"). The alt is that subject plus an authored phrase
 * saying what the section is, from `image-alt-phrases.json`. It reports where
 * the image sits in the document; it does not claim what is in the frame.
 *
 * A subject that carries several images gets `(gambar N)` so no two images on
 * one page share an accessible name.
 *
 * The undo is written before the write, exactly as in
 * `rewrite-internal-hrefs.mts`: a backup table plus one JSON file per article.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/backfill-image-alt.mts --undo <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/backfill-image-alt.mts --undo <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { connect, parseMode, snapshot } from './_db.mts';

const argv = process.argv.slice(2);
const { apply } = parseMode(argv);
const flag = (name: string): string | undefined => {
  const i = argv.indexOf(name);
  return i === -1 ? undefined : argv[i + 1];
};
const undoDir = flag('--undo');
const reportPath = flag('--report');
if (!undoDir || !reportPath) throw new Error('--undo <dir> and --report <file.md> are mandatory');

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

interface Change {
  slug: string;
  id: string;
  heading: string;
  alt: string;
}

const sql = connect();
try {
  const arts = await sql<
    { id: string; slug: string; title: string; content: unknown }[]
  >`select id, slug, title, content from articles where status = 'published' order by slug`;

  const bySlug = new Map(arts.map((a) => [a.slug, a]));
  const orphan = Object.keys(phrases).filter((s) => !bySlug.has(s));
  if (orphan.length) {
    throw new Error(`phrases name articles that are not published: ${orphan.join(', ')}`);
  }

  const changes: Change[] = [];
  const touched: { id: string; slug: string; content: unknown }[] = [];
  /** Images with no alt AND no heading above them: counted, never written. */
  let leftToFallback = 0;

  mkdirSync(undoDir, { recursive: true });
  for (const a of arts) {
    const before = JSON.parse(JSON.stringify(a.content));
    const phrase = phrases[a.slug];

    // Sections are an editor-only wrapper; flatten one level so a heading and
    // the images after it are neighbours here exactly as they are on the page.
    const flat: Record<string, unknown>[] = [];
    const push = (nodes: unknown): void => {
      if (!Array.isArray(nodes)) return;
      for (const n of nodes) {
        const node = n as { type?: string; content?: unknown } | null;
        if (!node) continue;
        if (node.type === 'section') push(node.content);
        else flat.push(node as Record<string, unknown>);
      }
    };
    push((a.content as { content?: unknown } | null)?.content);

    let heading: string | null = null;
    const perSubject = new Map<string, number>();
    const hits: Change[] = [];

    for (const node of flat) {
      if (node.type === 'heading') {
        heading = textOf(node);
        continue;
      }
      if (node.type !== 'image' && node.type !== 'figureBlock') continue;
      const attrs = (node.attrs ?? {}) as Record<string, unknown>;
      const stored = typeof attrs.alt === 'string' ? attrs.alt.trim() : '';
      if (stored) continue;
      if (!heading || !phrase) {
        leftToFallback++;
        continue;
      }
      const subject = subjectFromHeading(heading);
      if (!subject) {
        leftToFallback++;
        continue;
      }
      const seen = (perSubject.get(subject) ?? 0) + 1;
      perSubject.set(subject, seen);
      let alt = `${subject}, ${phrase}`;
      if (seen > 1) alt += ` (gambar ${seen})`;
      if (alt.length > MAX_ALT) {
        throw new Error(`alt over ${MAX_ALT} characters on ${a.slug}: ${alt}`);
      }
      attrs.alt = alt;
      node.attrs = attrs;
      hits.push({ slug: a.slug, id: a.id, heading, alt });
    }

    if (hits.length === 0) continue;
    changes.push(...hits);
    touched.push({ id: a.id, slug: a.slug, content: a.content });
    if (!apply) {
      writeFileSync(
        join(undoDir, `${a.slug}.json`),
        JSON.stringify({ id: a.id, slug: a.slug, content: before }, null, 1),
      );
    }
  }

  const byArticle = new Map<string, number>();
  for (const c of changes) byArticle.set(c.slug, (byArticle.get(c.slug) ?? 0) + 1);
  const uniqueAlts = new Set(changes.map((c) => `${c.slug}::${c.alt}`)).size;

  const lines: string[] = [];
  lines.push('# Image alt backfill — dry run', '');
  lines.push(`Alt values to write: **${changes.length}** across **${byArticle.size}** articles`);
  lines.push(`Undescribed images left on the render-time fallback: **${leftToFallback}**`);
  lines.push(
    `Distinct alt values within their own article: **${uniqueAlts}** of ${changes.length}`,
    '',
  );
  lines.push('| article | images described |', '| --- | --- |');
  for (const [slug, n] of [...byArticle].sort((x, y) => y[1] - x[1])) {
    lines.push(`| ${slug} | ${n} |`);
  }
  lines.push(
    '',
    '| article (row id) | heading above the image | new alt | chars |',
    '| --- | --- | --- | --- |',
  );
  for (const c of changes) {
    lines.push(`| ${c.slug} (${c.id}) | ${c.heading} | ${c.alt} | ${c.alt.length} |`);
  }
  writeFileSync(reportPath, lines.join('\n') + '\n');

  console.log(`${changes.length} alt values across ${byArticle.size} articles`);
  console.log(`${leftToFallback} undescribed images deliberately left on the render fallback`);
  console.log(`${uniqueAlts} of ${changes.length} alt values are unique within their article`);
  console.log(`report -> ${reportPath}`);

  if (!apply) {
    console.log(`undo documents -> ${undoDir} (${touched.length} files)`);
    console.log('DRY RUN — nothing written. Re-run with --apply.');
  } else {
    const missing = touched.filter((t) => !existsSync(join(undoDir, `${t.slug}.json`)));
    if (missing.length) {
      const named = missing
        .slice(0, 3)
        .map((m) => m.slug)
        .join(', ');
      throw new Error(
        `refusing to apply: ${missing.length} undo file(s) missing (${named}...). Run the dry run first.`,
      );
    }
    const backup = await snapshot(sql, 'articles', 'alt', ['content', 'updated_at']);
    const how = backup.created ? 'created now' : 'already existed';
    console.log(`backup table ${backup.table} (${backup.rows} rows, ${how})`);
    for (const t of touched) {
      await sql`update articles set content = ${sql.json(t.content as never)}, updated_at = now() where id = ${t.id}`;
    }
    console.log(`APPLIED — ${touched.length} article rows updated`);
  }
} finally {
  await sql.end();
}
