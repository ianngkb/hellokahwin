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
 * a future editor tool would call, and the canonical path it resolves to is
 * built by `buildArticlePath` — the same builder the admin editor uses when it
 * writes a slug-change redirect. Nothing in this script decides where a link
 * lands; it only finds the hrefs and reports what the resolver said.
 *
 * ── DRY RUN FIRST, ALWAYS ─────────────────────────────────────────────────
 * The default run writes three things and touches nothing: the diff report,
 * one undo document per article, and `_manifest.json` recording each row's
 * `updated_at` and a hash of the exact document it transformed. `--apply`
 * refuses to start without that manifest and aborts if any row has moved since
 * — see `_content-apply.mts` for the full order of checks, and `_db.mts` for
 * why each one is there.
 *
 * Usage:
 *   pnpm exec tsx scripts/seo/rewrite-internal-hrefs.mts --undo <dir> --report <file.md>
 *   pnpm exec tsx scripts/seo/rewrite-internal-hrefs.mts --undo <dir> --report <file.md> --apply
 */
import 'dotenv/config';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  resolveInternalHref,
  type InternalHrefTargets,
} from '../../src/lib/inspire/internal-links';
import { buildArticlePath } from '../../src/lib/redirects/article-slug-change';
import {
  assertRedirectsTableEmpty,
  connect,
  contentHash,
  newRunId,
  parseMode,
  requireManifest,
  type Manifest,
} from './_db.mts';
import { applyContentMigration, type ArticleRow } from './_content-apply.mts';

const SCRIPT = 'rewrite-internal-hrefs';

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

/**
 * Which stored spelling produced the hop, for the diff column the brief asks
 * for. Derived from the pair rather than reported by the resolver, so the
 * resolver stays a pure "where does this land" answer.
 */
function ruleFor(before: string, after: string): string {
  const rules: string[] = [];
  if (/^http:\/\//i.test(before)) rules.push('scheme');
  if (/^\/\//.test(before)) rules.push('protocol-relative');
  else if (/^https?:\/\//i.test(before)) rules.push('absolute-to-relative');
  const path = before.replace(/^(https?:)?\/\/[^/]+/i, '').split(/[?#]/)[0];
  if (path.length > 1 && path.endsWith('/')) rules.push('trailing-slash');
  const segments = path.split('/').filter(Boolean);
  if (segments.length === 1) rules.push('legacy-flat-permalink');
  else if (segments[0] === 'artikel' && segments.length === 3) rules.push('category-segment');
  else if (segments[0] === 'category' || segments[0] === 'tag') rules.push('wp-pattern');
  if (rules.length === 0) rules.push(after === before ? 'none' : 'other');
  return rules.join('+');
}

interface Hit {
  before: string;
  after: string;
  rule: string;
}
interface Change extends Hit {
  slug: string;
  id: string;
}

/**
 * Rewrite every internal href in a TipTap document and return a NEW document
 * plus what changed. Both spellings the corpus uses are covered: a `link` MARK
 * on a text node (everything ingested) and a bare `href` ATTR on a node
 * (legacy rows).
 *
 * It clones first rather than mutating in place. The apply path re-runs this
 * against a freshly locked row and compares the result to the hash the dry run
 * promised, so the input must survive the call unchanged.
 */
function rewriteDoc(doc: unknown, targets: InternalHrefTargets): { next: unknown; hits: Hit[] } {
  const next = structuredClone(doc);
  const hits: Hit[] = [];
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
  walk(next);
  return { next, hits };
}

const sql = connect();
try {
  // The resolver knows where an article lives from its current primary
  // category. Once the redirects table has rows that is no longer the whole
  // truth, and the script says so rather than quietly under-resolving.
  await assertRedirectsTableEmpty(sql);

  const cats = await sql<{ id: string; slug: string }[]>`select id, slug from inspire_categories`;
  const arts = await sql<
    {
      id: string;
      slug: string;
      title: string;
      status: string;
      primary_category_id: string | null;
      content: unknown;
      updated_at: Date;
    }[]
  >`select id, slug, title, status, primary_category_id, content, updated_at from articles`;

  const catSlugById = new Map(cats.map((c) => [c.id, c.slug]));
  // PUBLISHED only, and only where the category segment is actually known. A
  // link into a draft resolves to nothing today, and rewriting it to a path
  // that 404s would turn a one-hop redirect into a dead link.
  const articlePathBySlug = new Map<string, string>();
  for (const a of arts) {
    if (a.status !== 'published' || !a.primary_category_id) continue;
    const categorySlug = catSlugById.get(a.primary_category_id);
    if (!categorySlug) continue;
    articlePathBySlug.set(a.slug, buildArticlePath(categorySlug, a.slug));
  }
  const targets: InternalHrefTargets = {
    categorySlugs: new Set(cats.map((c) => c.slug)),
    articlePathBySlug,
  };

  const published = arts.filter((a) => a.status === 'published');
  const changes: Change[] = [];

  if (!apply) {
    const runId = newRunId();
    const manifest: Manifest = {
      script: SCRIPT,
      runId,
      generatedAt: new Date().toISOString(),
      entries: [],
    };
    mkdirSync(undoDir, { recursive: true });
    for (const a of published) {
      const { next, hits } = rewriteDoc(a.content, targets);
      if (hits.length === 0) continue;
      for (const h of hits) changes.push({ slug: a.slug, id: a.id, ...h });
      manifest.entries.push({
        id: a.id,
        slug: a.slug,
        updatedAt: new Date(a.updated_at).toISOString(),
        preimageHash: contentHash(a.content),
        postimageHash: contentHash(next),
      });
      writeFileSync(
        join(undoDir, `${a.slug}.json`),
        JSON.stringify({ id: a.id, slug: a.slug, content: a.content }, null, 1),
      );
    }
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 1));

    const byRule = new Map<string, number>();
    for (const c of changes) byRule.set(c.rule, (byRule.get(c.rule) ?? 0) + 1);
    const lines: string[] = [];
    lines.push('# Internal href rewrite — dry run', '');
    lines.push(`Run id: \`${runId}\``);
    lines.push(`Published articles scanned: **${published.length}**`);
    lines.push(`Articles with at least one stale href: **${manifest.entries.length}**`);
    lines.push(`Hrefs to rewrite: **${changes.length}**`, '');
    lines.push('| rule | count |', '| --- | --- |');
    for (const [r, n] of [...byRule].sort((a, b) => b[1] - a[1])) lines.push(`| ${r} | ${n} |`);
    lines.push('', '| article (row id) | before | after | rule |', '| --- | --- | --- | --- |');
    for (const c of changes) {
      lines.push(`| ${c.slug} (${c.id}) | \`${c.before}\` | \`${c.after}\` | ${c.rule} |`);
    }
    writeFileSync(reportPath, lines.join('\n') + '\n');

    console.log(`scanned ${published.length} published articles`);
    console.log(`${changes.length} hrefs across ${manifest.entries.length} articles`);
    for (const [r, n] of [...byRule].sort((a, b) => b[1] - a[1])) console.log(`  ${r}: ${n}`);
    console.log(`report   -> ${reportPath}`);
    console.log(`undo     -> ${undoDir} (${manifest.entries.length} documents)`);
    console.log(`manifest -> ${manifestPath} (run ${runId})`);
    console.log('DRY RUN — nothing written. Re-run with --apply.');
  } else {
    let raw: string | undefined;
    try {
      raw = readFileSync(manifestPath, 'utf8');
    } catch {
      raw = undefined;
    }
    const manifest = requireManifest(raw, SCRIPT, manifestPath);
    const result = await applyContentMigration({
      sql,
      manifest,
      undoDir,
      backupSlug: 'hrefs',
      transform: (row: ArticleRow) => rewriteDoc(row.content, targets).next,
    });
    console.log(`backup table ${result.backupTable} (${result.backupRows} rows)`);
    console.log(`APPLIED — ${result.written} article rows updated`);
  }
} finally {
  await sql.end();
}
