#!/usr/bin/env node
/**
 * Rewrite stale internal hrefs inside published article bodies to the URL they
 * actually resolve to.
 *
 * Ahrefs, 28 Ogos 2026: "Page has links to redirect", 27 pages. The redirects
 * work; the stored hrefs are pre-migration. See the resolver's own header in
 * `src/lib/inspire/internal-links.ts` for the rule — this file is only the
 * traversal, the diff and the write.
 *
 * ── THE RULE IS IMPORTED, NOT RESTATED ────────────────────────────────────
 * `resolveInternalHref` is the same function the tests cover and the same one
 * a future editor tool would call. Nothing in this script decides where a link
 * lands; it only finds the hrefs and reports what the resolver said.
 *
 * ── THE UNDO IS WRITTEN BEFORE THE WRITE ──────────────────────────────────
 * Two of them, deliberately. `snapshot()` copies `articles.id/content/updated_at`
 * into a backup TABLE in the same database before the first UPDATE, and the
 * dry run writes the full prior document per article to `<undo-dir>/<slug>.json`.
 * `--apply` refuses to run unless the undo directory already holds a file for
 * every article it is about to touch: a recovery path you would have to
 * reconstruct afterwards is a recovery path in principle only.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/rewrite-internal-hrefs.mts --undo <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/rewrite-internal-hrefs.mts --undo <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveInternalHref,
  type InternalHrefTargets,
} from '../../src/lib/inspire/internal-links';
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

/**
 * Which stored spelling produced the hop, for the diff column the brief asks
 * for. Derived from the pair rather than reported by the resolver, so the
 * resolver stays a pure "where does this land" answer.
 */
function ruleFor(before: string, after: string): string {
  const rules: string[] = [];
  if (/^http:\/\//i.test(before)) rules.push('scheme');
  if (/^https?:\/\//i.test(before)) rules.push('absolute-to-relative');
  const path = before.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0];
  if (path.length > 1 && path.endsWith('/')) rules.push('trailing-slash');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1) rules.push('legacy-flat-permalink');
  else if (segments[0] === 'artikel' && segments.length === 3) rules.push('category-segment');
  else if (segments[0] === 'category' || segments[0] === 'tag') rules.push('wp-pattern');
  if (rules.length === 0) rules.push(after === before ? 'none' : 'other');
  return rules.join('+');
}

interface Change {
  slug: string;
  id: string;
  before: string;
  after: string;
  rule: string;
}

/**
 * Rewrite every internal href in a TipTap document in place, and report what
 * changed. Both spellings the corpus uses are covered: a `link` MARK on a text
 * node (everything ingested) and a bare `href` ATTR on a node (legacy rows).
 */
function rewriteDoc(
  doc: unknown,
  targets: InternalHrefTargets,
  hits: Omit<Change, 'slug' | 'id'>[],
) {
  const consider = (bag: Record<string, unknown>) => {
    const href = bag.href;
    if (typeof href !== 'string') return;
    const after = resolveInternalHref(href, targets);
    if (after === null) return;
    hits.push({ before: href, after, rule: ruleFor(href, after) });
    bag.href = after;
  };
  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as {
      marks?: { type?: string; attrs?: Record<string, unknown> }[];
      attrs?: Record<string, unknown>;
      content?: unknown;
    };
    for (const mark of n.marks ?? []) {
      if (mark.type === 'link' && mark.attrs) consider(mark.attrs);
    }
    if (n.attrs) consider(n.attrs);
    if (n.content) walk(n.content);
  };
  walk(doc);
}

const sql = connect();
try {
  const cats = await sql<{ id: string; slug: string }[]>`select id, slug from inspire_categories`;
  const arts = await sql<
    {
      id: string;
      slug: string;
      title: string;
      status: string;
      primary_category_id: string | null;
      content: unknown;
    }[]
  >`select id, slug, title, status, primary_category_id, content from articles`;

  const catSlugById = new Map(cats.map((c) => [c.id, c.slug]));
  // PUBLISHED only, and only where the category segment is actually known. A
  // link into a draft resolves to nothing today, and rewriting it to a path
  // that 404s would turn a one-hop redirect into a dead link.
  const articlePathBySlug = new Map<string, string>();
  for (const a of arts) {
    if (a.status !== 'published' || !a.primary_category_id) continue;
    const categorySlug = catSlugById.get(a.primary_category_id);
    if (!categorySlug) continue;
    articlePathBySlug.set(a.slug, `/artikel/${categorySlug}/${a.slug}`);
  }
  const targets: InternalHrefTargets = {
    categorySlugs: new Set(cats.map((c) => c.slug)),
    articlePathBySlug,
  };

  const published = arts.filter((a) => a.status === 'published');
  const changes: Change[] = [];
  const touched: { id: string; slug: string; content: unknown }[] = [];

  mkdirSync(undoDir, { recursive: true });
  for (const a of published) {
    const before = JSON.parse(JSON.stringify(a.content));
    const hits: Omit<Change, 'slug' | 'id'>[] = [];
    rewriteDoc(a.content, targets, hits);
    if (hits.length === 0) continue;
    for (const h of hits) changes.push({ slug: a.slug, id: a.id, ...h });
    touched.push({ id: a.id, slug: a.slug, content: a.content });
    if (!apply) {
      writeFileSync(
        join(undoDir, `${a.slug}.json`),
        JSON.stringify({ id: a.id, slug: a.slug, content: before }, null, 1),
      );
    }
  }

  const byRule = new Map<string, number>();
  for (const c of changes) byRule.set(c.rule, (byRule.get(c.rule) ?? 0) + 1);

  const lines: string[] = [];
  lines.push('# Internal href rewrite — dry run', '');
  lines.push(`Published articles scanned: **${published.length}**`);
  lines.push(`Articles with at least one stale href: **${touched.length}**`);
  lines.push(`Hrefs to rewrite: **${changes.length}**`, '');
  lines.push('| rule | count |', '| --- | --- |');
  for (const [r, n] of [...byRule].sort((a, b) => b[1] - a[1])) lines.push(`| ${r} | ${n} |`);
  lines.push('', '| article (row id) | before | after | rule |', '| --- | --- | --- | --- |');
  for (const c of changes) {
    lines.push(`| ${c.slug} (${c.id}) | \`${c.before}\` | \`${c.after}\` | ${c.rule} |`);
  }
  writeFileSync(reportPath, lines.join('\n') + '\n');

  console.log(`scanned ${published.length} published articles`);
  console.log(`${changes.length} hrefs across ${touched.length} articles`);
  for (const [r, n] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${r}: ${n}`);
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
    const backup = await snapshot(sql, 'articles', 'hrefs', ['content', 'updated_at']);
    const how = backup.created ? 'created now' : 'already existed';
    console.log(`backup table ${backup.table} (${backup.rows} rows, ${how})`);
    let written = 0;
    for (const t of touched) {
      await sql`update articles set content = ${sql.json(t.content as never)}, updated_at = now() where id = ${t.id}`;
      written++;
    }
    console.log(`APPLIED — ${written} article rows updated`);
  }
} finally {
  await sql.end();
}
