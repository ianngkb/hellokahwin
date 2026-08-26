/**
 * CONT-02 ship audit — READ ONLY.
 *
 * For every published article, compare the images the DRAFT declares against
 * the images PRODUCTION actually serves, by declared filename.
 *
 * Identity is `media.filename` on the live side and `basename(file:)` on the
 * draft side, because that is the only spelling the two share: ingest stamps
 * every upload with `Date.now()` and stores the WebP derivative, so the URL in
 * `content` never matches anything written in a draft.
 *
 *   npx tsx .tmp-cont02-audit.mts --db <url> --json out.json
 */
import postgres from 'postgres';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename as pathBasename } from 'node:path';
import { parseArticleFile } from './src/lib/inspire/article-file';

const DRAFTS =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts';

/** The eight P1/P6 files with no `ingest/` twin — the root copy IS the canonical one. */
const ROOT_CANONICAL = [
  'borang-nikah.md',
  'lafaz-taklik.md',
  'rukun-nikah.md',
  'syarat-sah-nikah.md',
  'C6-2-A1-harga-sewa-dewan-kahwin.md',
  'C6-2-A2-checklist-kahwin.md',
  'C6-2-A3-pakej-dewan-kahwin.md',
  'C6-2-A4-bajet-kahwin.md',
];

let db = '';
let out = '';
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
  else if (process.argv[i] === '--json') out = process.argv[++i] ?? '';
}
if (!db) {
  console.error('  - no --db given. There is deliberately no default.');
  process.exit(1);
}

function stem(urlOrKey: string): string {
  let path = urlOrKey.replace(/\\+$/, '');
  try {
    path = new URL(path).pathname;
  } catch {
    /* already a bare key */
  }
  const parts = path.replace(/^\/+/, '').split('?')[0].split('/');
  const last = parts[parts.length - 1];
  if (/^(high|low|original|crop-)/.test(last)) parts.pop();
  else parts[parts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return parts.join('/');
}

function collectSrcs(node: unknown, acc: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectSrcs(n, acc);
    return;
  }
  const n = node as { attrs?: { src?: unknown }; content?: unknown };
  if (n.attrs && typeof n.attrs.src === 'string') acc.push(n.attrs.src);
  if (n.content) collectSrcs(n.content, acc);
}

// ── The draft side ────────────────────────────────────────────────────────
interface DraftInfo {
  path: string;
  slug: string;
  status: string;
  cover: string;
  body: string[];
}
const drafts = new Map<string, DraftInfo>();
const draftProblems: string[] = [];

const files = [
  ...readdirSync(join(DRAFTS, 'ingest'))
    .filter((f) => f.endsWith('.md'))
    .map((f) => join(DRAFTS, 'ingest', f)),
  ...ROOT_CANONICAL.map((f) => join(DRAFTS, f)),
];

for (const f of files) {
  let parsed;
  try {
    parsed = parseArticleFile(readFileSync(f, 'utf8'));
  } catch (e) {
    draftProblems.push(`${f}: ${(e as Error).message}`);
    continue;
  }
  const fm = parsed.frontMatter;
  drafts.set(fm.slug, {
    path: f.replace(/\\/g, '/').replace(DRAFTS + '/', ''),
    slug: fm.slug,
    status: fm.status,
    cover: pathBasename(fm.cover.file),
    body: fm.images.map((i) => pathBasename(i.file)),
  });
}

// ── The live side ─────────────────────────────────────────────────────────
const sql = postgres(db, { prepare: false, max: 2 });

const media = await sql<
  {
    id: string;
    filename: string;
    r2_key: string;
    credit: string | null;
    credit_url: string | null;
    license_class: string | null;
    licensor_name: string | null;
  }[]
>`select id, filename, r2_key, credit, credit_url, license_class, licensor_name from media`;
const byStem = new Map(media.map((m) => [stem(m.r2_key), m]));

const articles = await sql<
  {
    id: string;
    slug: string;
    title: string;
    cat: string | null;
    wp_id: number | null;
    cover_image_url: string | null;
    content: { content?: unknown[] } | null;
  }[]
>`
  select a.id, a.slug, a.title, c.slug as cat, a.wp_id, a.cover_image_url, a.content
  from articles a
  left join inspire_categories c on c.id = a.primary_category_id
  where a.status = 'published'
  order by c.slug nulls last, a.slug`;

interface Row {
  slug: string;
  cat: string | null;
  wpId: number | null;
  draftFile: string | null;
  draftStatus: string | null;
  liveCover: string | null;
  liveBody: string[];
  liveUnresolved: string[];
  liveCount: number;
  draftCount: number | null;
  missingLive: string[];
  extraLive: string[];
  uncredited: string[];
}

const rows: Row[] = [];

for (const a of articles) {
  const srcs: string[] = [];
  collectSrcs(a.content?.content ?? [], srcs);
  const refs = [
    ...(a.cover_image_url ? [{ where: 'cover' as const, src: a.cover_image_url }] : []),
    ...srcs.map((s) => ({ where: 'body' as const, src: s })),
  ];
  const liveBody: string[] = [];
  const liveUnresolved: string[] = [];
  const uncredited: string[] = [];
  let liveCover: string | null = null;
  for (const r of refs) {
    const m = byStem.get(stem(r.src));
    if (!m) {
      liveUnresolved.push(`${r.where}:${r.src}`);
      continue;
    }
    if (r.where === 'cover') liveCover = m.filename;
    else liveBody.push(m.filename);
    if (
      !m.credit?.trim() ||
      !m.credit_url?.trim() ||
      !m.license_class?.trim() ||
      !m.licensor_name?.trim()
    ) {
      uncredited.push(
        `${r.where}:${m.filename} (credit=${m.credit ? 'y' : 'MISSING'} url=${m.credit_url ? 'y' : 'MISSING'} class=${m.license_class ?? 'MISSING'} licensor=${m.licensor_name ? 'y' : 'MISSING'})`,
      );
    }
  }

  const d = drafts.get(a.slug) ?? null;
  const liveAll = [...(liveCover ? [liveCover] : []), ...liveBody];
  const draftAll = d ? [d.cover, ...d.body] : null;

  rows.push({
    slug: a.slug,
    cat: a.cat,
    wpId: a.wp_id,
    draftFile: d?.path ?? null,
    draftStatus: d?.status ?? null,
    liveCover,
    liveBody,
    liveUnresolved,
    liveCount: liveAll.length,
    draftCount: draftAll?.length ?? null,
    missingLive: draftAll ? draftAll.filter((x) => !liveAll.includes(x)) : [],
    extraLive: draftAll ? liveAll.filter((x) => !draftAll.includes(x)) : [],
    uncredited,
  });
}

// ── Report ────────────────────────────────────────────────────────────────
const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '~' : s.padEnd(n));

console.log(`Published articles in production: ${articles.length}`);
console.log(`Canonical draft files read:       ${drafts.size}`);
if (draftProblems.length) {
  console.log(`\nDRAFTS THAT DO NOT PARSE (${draftProblems.length}):`);
  for (const p of draftProblems) console.log(`  x ${p}`);
}

console.log(
  `\n${pad('CAT', 22)} ${pad('SLUG', 36)} ${pad('LIVE', 5)} ${pad('DRAFT', 6)} ${pad('MISSING', 8)} ${pad('EXTRA', 6)} SOURCE`,
);
console.log('-'.repeat(120));
for (const r of rows) {
  console.log(
    `${pad(r.cat ?? '-', 22)} ${pad(r.slug, 36)} ${pad(String(r.liveCount), 5)} ${pad(r.draftCount == null ? '-' : String(r.draftCount), 6)} ${pad(String(r.missingLive.length), 8)} ${pad(String(r.extraLive.length), 6)} ${r.draftFile ?? (r.wpId != null ? `legacy wp#${r.wpId}` : 'NO DRAFT')}`,
  );
}

const withDraft = rows.filter((r) => r.draftFile);
const behind = withDraft.filter((r) => r.missingLive.length > 0);
const ahead = withDraft.filter((r) => r.extraLive.length > 0);

console.log('\n--- ARTICLES WHERE THE DRAFT HAS AN IMAGE PRODUCTION LACKS ---');
for (const r of behind) {
  console.log(`${r.slug}  (+${r.missingLive.length})`);
  for (const m of r.missingLive) console.log(`   + ${m}`);
}
if (!behind.length) console.log('  none');

console.log('\n--- ARTICLES WHERE PRODUCTION HAS AN IMAGE THE DRAFT LACKS ---');
for (const r of ahead) {
  console.log(`${r.slug}  (-${r.extraLive.length})`);
  for (const m of r.extraLive) console.log(`   - ${m}`);
}
if (!ahead.length) console.log('  none');

const uncred = rows.filter((r) => r.uncredited.length);
console.log('\n--- LIVE IMAGES WITHOUT A FULL CREDIT CHAIN ---');
for (const r of uncred) {
  console.log(r.slug);
  for (const u of r.uncredited) console.log(`   x ${u}`);
}
if (!uncred.length) console.log('  none');

const unres = rows.filter((r) => r.liveUnresolved.length);
console.log('\n--- LIVE IMAGE URLS WITH NO MEDIA ROW ---');
for (const r of unres) {
  console.log(r.slug);
  for (const u of r.liveUnresolved) console.log(`   ? ${u}`);
}
if (!unres.length) console.log('  none');

console.log(
  `\nTOTALS  live images: ${rows.reduce((s, r) => s + r.liveCount, 0)}   ` +
    `draft images (matched articles): ${withDraft.reduce((s, r) => s + (r.draftCount ?? 0), 0)}   ` +
    `articles behind: ${behind.length}   articles ahead: ${ahead.length}`,
);

const draftSlugs = [...drafts.keys()];
const liveSlugs = new Set(articles.map((a) => a.slug));
const notLive = draftSlugs.filter((s) => !liveSlugs.has(s));
console.log(
  `\nCanonical drafts with NO published article: ${notLive.length ? notLive.join(', ') : 'none'}`,
);

if (out) {
  writeFileSync(out, JSON.stringify({ rows, drafts: [...drafts.values()] }, null, 1));
  console.log(`\nwrote ${out}`);
}

await sql.end();
