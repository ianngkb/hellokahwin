#!/usr/bin/env node
/**
 * Append a drafted `Soalan lazim` block to each article's authored body, and
 * write it to the database.
 *
 * SEO-13, 01 September 2026.
 *
 * ── THE UNDO IS WRITTEN BEFORE THE WRITE, NOT AFTER ───────────────────────
 * `--dry-run` (the default) writes `undo/<slug>.json` holding the article's
 * COMPLETE prior `content` document, and emits nothing to the database.
 * `--apply` refuses to run unless every undo file already exists on disk. That
 * ordering is the whole point: a recovery path you would have to reconstruct
 * afterwards is a recovery path in principle, and this item's standing rule
 * asks for one in fact.
 *
 * To reverse a single article:
 *   pnpm exec tsx scripts/seo/faq-apply-blocks.mts --undo <undo-dir> --slug <slug> --apply
 * To reverse everything:
 *   pnpm exec tsx scripts/seo/faq-apply-blocks.mts --undo <undo-dir> --apply
 *
 * ── WHERE THE BLOCK GOES ──────────────────────────────────────────────────
 * Immediately before the article's closing section — `Sumber`, `Kesimpulan`,
 * `Langkah seterusnya`, `Penutup` — because sources and next steps should stay
 * last, and that is where the 47 articles already carrying a block put theirs
 * (`doa-pengantin-baru` ends `Soalan lazim` then `Langkah seterusnya`). With no
 * such section it goes at the end.
 *
 * ── WHAT IS NOT TOUCHED ───────────────────────────────────────────────────
 * `fts` is left alone. The column exists but nothing reads it: HelloKahwin's
 * search route (`src/app/api/v1/search/route.ts`) is a title/excerpt ILIKE,
 * inherited from twn-new where a hybrid fts search did exist. Recording that
 * here because "the tsvector is now stale" is the kind of thing a later reader
 * would otherwise have to re-derive.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/faq-apply-blocks.mts <drafts-dir> <undo-dir> [--apply]
 */

import 'dotenv/config';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';
import { hasFaqBlockHeading } from '../../src/lib/inspire/faq-schema';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const UNDO_MODE = args.includes('--undo');
const positional = args.filter((a) => !a.startsWith('--'));

const CLOSING_SECTION = /^(sumber|kesimpulan|langkah\s+seterusnya|penutup|nota)\b/i;
const FAQ_HEADING = 'Soalan lazim';

const sql = postgres(process.env.DATABASE_URL, { max: 2, prepare: false, ssl: 'require' });

const heading = (level, text) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});
const paragraph = (text) => ({ type: 'paragraph', content: [{ type: 'text', text }] });

const nodeText = (node) => {
  if (!node || typeof node !== 'object') return '';
  if (node.type === 'text') return node.text ?? '';
  if (!Array.isArray(node.content)) return '';
  return node.content.map(nodeText).join('');
};

/**
 * Insert the block into `doc.content`.
 *
 * Only the doc's OWN top-level children are considered as an insertion point.
 * A heading buried inside a `sectionBlock` wrapper is somebody else's
 * container, and splicing a sibling in beside it would put the block inside
 * that section rather than after it.
 */
function withFaqBlock(doc, level, entries) {
  const block = [heading(level, FAQ_HEADING)];
  for (const e of entries) {
    block.push(heading(level + 1, e.question));
    block.push(paragraph(e.answer));
  }

  const content = Array.isArray(doc?.content) ? [...doc.content] : [];
  let at = content.length;
  for (let i = content.length - 1; i >= 0; i--) {
    const n = content[i];
    if (n?.type === 'heading' && n.attrs?.level === level && CLOSING_SECTION.test(nodeText(n).trim())) {
      at = i;
    }
  }
  content.splice(at, 0, ...block);
  return { ...doc, content };
}

async function restore(undoDir, slugFilter) {
  const files = readdirSync(undoDir)
    .filter((f) => f.endsWith('.json'))
    .filter((f) => !slugFilter || f === `${slugFilter}.json`);
  if (files.length === 0) {
    console.error(`no undo files matched in ${undoDir}`);
    process.exit(2);
  }
  for (const f of files) {
    const { slug, content } = JSON.parse(readFileSync(join(undoDir, f), 'utf8'));
    if (APPLY) {
      await sql`update articles set content = ${sql.json(content)}, updated_at = now() where slug = ${slug}`;
      console.log(`  restored ${slug}`);
    } else {
      console.log(`  would restore ${slug} (pass --apply)`);
    }
  }
  await sql.end();
}

async function main() {
  if (UNDO_MODE) {
    const undoDir = positional[0];
    const i = args.indexOf('--slug');
    return restore(undoDir, i === -1 ? null : args[i + 1]);
  }

  const [draftsDir, undoDir] = positional;
  if (!draftsDir || !undoDir) {
    console.error('usage: pnpm exec tsx scripts/seo/faq-apply-blocks.mts <drafts-dir> <undo-dir> [--apply]');
    process.exit(2);
  }
  mkdirSync(undoDir, { recursive: true });

  const drafts = readdirSync(draftsDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(draftsDir, f), 'utf8')))
    .filter((d) => !d.notApplicable);

  const slugs = drafts.map((d) => d.slug);
  const rows = await sql`select slug, content from articles where slug = any(${slugs})`;
  const bySlug = new Map(rows.map((r) => [r.slug, r.content]));

  // Pass 1 — write every undo file. Nothing reaches the database in this pass.
  for (const d of drafts) {
    const content = bySlug.get(d.slug);
    if (!content) {
      console.error(`  MISSING IN DB: ${d.slug}`);
      process.exit(1);
    }
    writeFileSync(
      join(undoDir, `${d.slug}.json`),
      JSON.stringify({ slug: d.slug, capturedAt: new Date().toISOString(), content }, null, 2),
    );
  }
  console.log(`undo records written for ${drafts.length} articles -> ${undoDir}`);

  // Pass 2 — refuse to write without a complete undo set on disk.
  const missingUndo = drafts.filter((d) => !existsSync(join(undoDir, `${d.slug}.json`)));
  if (missingUndo.length > 0) {
    console.error(`REFUSING TO WRITE — no undo record for: ${missingUndo.map((d) => d.slug).join(', ')}`);
    process.exit(1);
  }

  for (const d of drafts) {
    const before = bySlug.get(d.slug);
    // hasFaqBlockHeading, NOT a regex over the serialised doc. The regex
    // version of this line skipped `bajet-kahwin` and `checklist-kahwin`, which
    // merely CITE the JAIS soalan lazim page in prose. See faq-schema.ts.
    const already = hasFaqBlockHeading(before);
    if (already) {
      console.log(`  skip ${d.slug} — already carries a Soalan lazim block`);
      continue;
    }
    const after = withFaqBlock(before, d.headingLevel, d.entries);
    const addedAt = after.content.findIndex(
      (n) => n?.type === 'heading' && nodeText(n).trim() === FAQ_HEADING,
    );
    const followedBy = after.content[addedAt + 2 * d.entries.length + 1];
    const label = followedBy ? `before "${nodeText(followedBy).trim().slice(0, 40)}"` : 'at the end';

    if (APPLY) {
      await sql`update articles set content = ${sql.json(after)}, updated_at = now() where slug = ${d.slug}`;
      console.log(`  wrote ${d.slug.padEnd(40)} ${d.entries.length} Q at h${d.headingLevel}, ${label}`);
    } else {
      console.log(`  dry-run ${d.slug.padEnd(38)} ${d.entries.length} Q at h${d.headingLevel}, ${label}`);
    }
  }

  console.log(APPLY ? '\nWRITTEN to production.' : '\nDRY RUN — nothing written. Re-run with --apply.');
  await sql.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
