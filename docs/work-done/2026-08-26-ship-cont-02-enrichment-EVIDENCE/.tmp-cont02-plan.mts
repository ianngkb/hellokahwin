/**
 * CONT-02 ship — PLAN DIFF. READ ONLY, no write of any kind.
 *
 * The question this answers: if I re-ingest a draft with `--update`, what does
 * production LOSE? Ingest replaces `articles.content` wholesale, and SEO-02
 * wrote 68 internal links straight into 45 live bodies on 26 Aug without
 * touching a single draft. So "the draft has three more photographs" is not the
 * whole change — the whole change is `planned document` vs `live document`.
 *
 * Method: reproduce ingest's pipeline exactly (`marked` -> `generateJSON` with
 * the same extensions -> `normaliseInternalLinkMarks`), strip figures from both
 * sides, canonicalise, and diff block by block.
 *
 *   npx tsx .tmp-cont02-plan.mts --db <url> --json out.json
 */
import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
import { basename as pathBasename } from 'node:path';
import { marked } from 'marked';
import { generateJSON } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';
import { InternalAwareLink, normaliseInternalLinkMarks } from './src/lib/inspire/internal-links';
import { parseArticleFile } from './src/lib/inspire/article-file';

let db = '';
let out = '';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--json') out = process.argv[++i] ?? '';
}
if (!db) {
  console.error('  - no --db given.');
  process.exit(1);
}

const audit = JSON.parse(readFileSync('.tmp-cont02/audit-BEFORE.json', 'utf8')) as {
  rows: {
    slug: string;
    draftFile: string | null;
    missingLive: string[];
    extraLive: string[];
    liveCover: string | null;
  }[];
  drafts: { slug: string; path: string; cover: string; body: string[] }[];
};
const DRAFTS =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts';
const draftPath = new Map(audit.drafts.map((d) => [d.slug, `${DRAFTS}/${d.path}`]));

function markdownExtensions() {
  return [
    StarterKit,
    ImageExtension,
    InternalAwareLink.configure({ openOnClick: false, defaultProtocol: 'https' }),
    UnderlineExtension,
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
  ];
}

function markdownToTiptap(markdown: string): { type: string; content?: unknown[] } {
  const html = marked.parse(markdown, { async: false, gfm: true }) as string;
  const doc = generateJSON(html, markdownExtensions() as never[]);
  normaliseInternalLinkMarks(doc);
  return doc as { type: string; content?: unknown[] };
}

const isFigure = (n: unknown) =>
  !!n && typeof n === 'object' && (n as { type?: string }).type === 'figureBlock';

/**
 * Key-order-independent serialisation.
 *
 * Postgres `jsonb` does not preserve key order — it stores `{"text":…,"type":"text"}`
 * where TipTap emitted `{"type":"text","text":…}`. A raw `JSON.stringify` diff
 * therefore reports every single block as changed, which is how a real diff
 * would hide. Sort the keys on both sides and compare that.
 */
function canon(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canon);
  if (value && typeof value === 'object') {
    const o = value as Record<string, unknown>;
    const sorted: Record<string, unknown> = {};
    for (const k of Object.keys(o).sort()) sorted[k] = canon(o[k]);
    return sorted;
  }
  return value;
}
const key = (n: unknown) => JSON.stringify(canon(n ?? null));

/** Every `href` carried by a link mark anywhere in the document, in order. */
function collectHrefs(node: unknown, acc: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectHrefs(n, acc);
    return;
  }
  const n = node as {
    marks?: { type?: string; attrs?: { href?: unknown } }[];
    content?: unknown;
  };
  if (Array.isArray(n.marks))
    for (const m of n.marks)
      if (m.type === 'link' && typeof m.attrs?.href === 'string') acc.push(m.attrs.href);
  if (n.content) collectHrefs(n.content, acc);
}

/** Plain text of a node, for naming a block in a diff line. */
function textOf(node: unknown): string {
  const acc: string[] = [];
  const walk = (n: unknown): void => {
    if (!n || typeof n !== 'object') return;
    if (Array.isArray(n)) {
      for (const x of n) walk(x);
      return;
    }
    const o = n as { text?: unknown; content?: unknown };
    if (typeof o.text === 'string') acc.push(o.text);
    if (o.content) walk(o.content);
  };
  walk(node);
  return acc.join('').replace(/\s+/g, ' ').trim();
}

const sql = postgres(db, { prepare: false, max: 2 });
const live = await sql<
  { slug: string; content: { content?: unknown[] } | null; published_at: string | null; status: string; authorship: string | null }[]
>`select slug, content, published_at, status, authorship from articles where status = 'published'`;
const liveBySlug = new Map(live.map((a) => [a.slug, a]));

const targets = audit.rows.filter((r) => r.draftFile && r.missingLive.length > 0);
console.log(`Targets (draft ahead of production): ${targets.length}\n`);

interface Plan {
  slug: string;
  file: string;
  publishedAt: string | null;
  frontMatterPublishedAt: string | null;
  authorshipLive: string | null;
  liveProseBlocks: number;
  plannedProseBlocks: number;
  proseIdentical: boolean;
  firstDiffIndex: number | null;
  diffIndices: number[];
  firstDiffLive: string;
  firstDiffPlanned: string;
  hrefsLostFromLive: string[];
  hrefsGained: string[];
  addImages: string[];
}
const plans: Plan[] = [];

for (const t of targets) {
  const path = draftPath.get(t.slug)!;
  const parsed = parseArticleFile(readFileSync(path, 'utf8'));
  const planned = markdownToTiptap(parsed.markdown);
  const plannedBlocks = (planned.content ?? []).filter((n) => !isFigure(n));

  const a = liveBySlug.get(t.slug)!;
  const liveBlocks = (a.content?.content ?? []).filter((n) => !isFigure(n));

  const diffIndices: number[] = [];
  const max = Math.max(plannedBlocks.length, liveBlocks.length);
  for (let i = 0; i < max; i++) if (key(plannedBlocks[i]) !== key(liveBlocks[i])) diffIndices.push(i);
  const firstDiffIndex = diffIndices.length ? diffIndices[0] : null;

  const liveHrefs: string[] = [];
  collectHrefs(liveBlocks, liveHrefs);
  const plannedHrefs: string[] = [];
  collectHrefs(plannedBlocks, plannedHrefs);
  const countOf = (xs: string[]) => {
    const m = new Map<string, number>();
    for (const x of xs) m.set(x, (m.get(x) ?? 0) + 1);
    return m;
  };
  const lc = countOf(liveHrefs);
  const pc = countOf(plannedHrefs);
  const lost: string[] = [];
  const gained: string[] = [];
  for (const [h, n] of lc) {
    const d = n - (pc.get(h) ?? 0);
    for (let i = 0; i < d; i++) lost.push(h);
  }
  for (const [h, n] of pc) {
    const d = n - (lc.get(h) ?? 0);
    for (let i = 0; i < d; i++) gained.push(h);
  }

  plans.push({
    slug: t.slug,
    file: path,
    publishedAt: a.published_at ? new Date(a.published_at).toISOString() : null,
    frontMatterPublishedAt: parsed.frontMatter.publishedAt ?? null,
    authorshipLive: a.authorship,
    liveProseBlocks: liveBlocks.length,
    plannedProseBlocks: plannedBlocks.length,
    proseIdentical: firstDiffIndex === null,
    firstDiffIndex,
    diffIndices,
    firstDiffLive: firstDiffIndex === null ? '' : textOf(liveBlocks[firstDiffIndex]).slice(0, 160),
    firstDiffPlanned:
      firstDiffIndex === null ? '' : textOf(plannedBlocks[firstDiffIndex]).slice(0, 160),
    hrefsLostFromLive: lost,
    hrefsGained: gained,
    addImages: t.missingLive,
  });
}

const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '~' : s.padEnd(n));
console.log(
  `${pad('SLUG', 36)} ${pad('LIVEBLK', 8)} ${pad('PLANBLK', 8)} ${pad('PROSE', 7)} ${pad('LINKSLOST', 10)} ${pad('LINKSNEW', 9)} ${pad('PUB_AT_IN_FM', 13)} +IMG`,
);
console.log('-'.repeat(120));
for (const p of plans) {
  console.log(
    `${pad(p.slug, 36)} ${pad(String(p.liveProseBlocks), 8)} ${pad(String(p.plannedProseBlocks), 8)} ` +
      `${pad(p.proseIdentical ? 'same' : `${p.diffIndices.length}blk`, 7)} ${pad(String(p.hrefsLostFromLive.length), 10)} ` +
      `${pad(String(p.hrefsGained.length), 9)} ${pad(p.frontMatterPublishedAt ? 'yes' : 'NO', 13)} ${p.addImages.length}`,
  );
}

console.log('\n--- INTERNAL LINKS PRODUCTION WOULD LOSE ---');
let lostTotal = 0;
for (const p of plans.filter((x) => x.hrefsLostFromLive.length)) {
  lostTotal += p.hrefsLostFromLive.length;
  console.log(`${p.slug}`);
  for (const h of p.hrefsLostFromLive) console.log(`   - ${h}`);
}
if (!lostTotal) console.log('  none');

console.log('\n--- LINKS THE DRAFT ADDS THAT PRODUCTION DOES NOT HAVE ---');
let gainTotal = 0;
for (const p of plans.filter((x) => x.hrefsGained.length)) {
  gainTotal += p.hrefsGained.length;
  console.log(`${p.slug}`);
  for (const h of p.hrefsGained) console.log(`   + ${h}`);
}
if (!gainTotal) console.log('  none');

console.log('\n--- PROSE BLOCKS THAT DIFFER ---');
for (const p of plans.filter((x) => !x.proseIdentical)) {
  console.log(`${p.slug}  ${p.diffIndices.length} block(s) differ: ${p.diffIndices.join(',')}`);
  console.log(`   live:    ${p.firstDiffLive}`);
  console.log(`   planned: ${p.firstDiffPlanned}`);
}
if (plans.every((p) => p.proseIdentical)) console.log('  none — every planned body matches live prose exactly');

console.log(
  `\nDrafts missing publishedAt (would restamp the publish date): ` +
    `${plans.filter((p) => !p.frontMatterPublishedAt).length} of ${plans.length}`,
);

if (out) writeFileSync(out, JSON.stringify(plans, null, 1));
await sql.end();
