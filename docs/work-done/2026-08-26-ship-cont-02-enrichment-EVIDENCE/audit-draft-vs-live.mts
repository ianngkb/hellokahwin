/**
 * Does the reader have what the draft says? — the ship check for CONTENT.
 *
 *   pnpm --silent audit:drafts --db <url> --drafts <dir> [--drafts <dir> …]
 *
 * WHY THIS EXISTS, and it is not a linter.
 *
 * Stage 9b of the content production workflow — "Fixed is not shipped" — is
 * written in git terms: `git status --short`, `git rev-list origin/master..HEAD`.
 * For code that chain ends at a reader: committed, pushed, deployed, working.
 * **For content it forks, and git can only see the branch that does not matter.**
 * Committing a draft ships the SOURCE. Only an ingest writes the ROW, and the
 * row is what a reader gets. No git command in any repository can see it.
 *
 * Both git states report "done" for content, which is the whole problem:
 *
 *   - UNTRACKED — how CONT-02's drafts stood when it ran, 26 Aug 00:31. They
 *     appear as `??` and Stage 9b itself says "uncommitted files unrelated to
 *     the item are fine", so they read as noise.
 *   - COMMITTED — how they stood six hours later, after `d4c4237` swept them
 *     into git at 09:03. Now `git status --short` is clean and the commit ships
 *     the draft. The reader still saw one image on `borang-nikah`.
 *
 * That is exactly what happened to CONT-02. The images were sourced, licensed,
 * credited, alt-texted, registered and validated; the log was accurate and
 * complete; and 69 of 145 photographs across 23 published articles had never
 * been ingested. The reader saw one image on `borang-nikah` while the draft
 * declared four.
 *
 * This is the command Stage 9b lacked. It answers one question per published
 * article — **does production serve every image its draft declares** — and it
 * exits non-zero when the answer is no, so it can be a gate rather than a
 * report somebody reads.
 *
 * HOW THE TWO SIDES ARE MATCHED. Not by URL: ingest stamps every upload with
 * `Date.now()` and stores the WebP derivative, so nothing in `articles.content`
 * ever looks like anything in a draft. The only spelling the two share is the
 * declared filename — `media.filename` on the live side, `basename(file:)` on
 * the draft side.
 *
 * DUPLICATE SLUGS. Pass `--drafts` more than once, in priority order. The first
 * directory that yields a given slug wins, so
 * `--drafts drafts/ingest --drafts drafts` reads the twenty-five `ingest/`
 * copies and then fills in only the articles that have no `ingest/` twin.
 */
import postgres from 'postgres';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, basename as pathBasename, relative } from 'node:path';
import { parseArticleFile } from '../src/lib/inspire/article-file';

interface Args {
  db: string;
  draftDirs: string[];
  json: string;
}

function parseArgs(argv: string[]): Args {
  let db = '';
  let json = '';
  const draftDirs: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--db') db = argv[++i] ?? '';
    else if (a === '--drafts') draftDirs.push(argv[++i] ?? '');
    else if (a === '--json') json = argv[++i] ?? '';
  }
  if (!db) {
    // Same guard as ingest and the pillar seed, for the same reason: there is
    // no default, because the default would be production.
    console.error(
      '  - no --db <postgres-url> given. There is deliberately no default: DATABASE_URL points at production.',
    );
    process.exit(1);
  }
  if (!draftDirs.length) {
    console.error(
      '  - no --drafts <dir> given. Pass it once per directory, in priority order:\n' +
        '      --drafts <docs>/drafts/ingest --drafts <docs>/drafts',
    );
    process.exit(1);
  }
  return { db, draftDirs, json };
}

/** `inspire/<article>/<stamp>-<name>` — the variant filename stripped off. */
function stem(urlOrKey: string): string {
  let path = urlOrKey.replace(/\\+$/, '');
  try {
    path = new URL(path).pathname;
  } catch {
    // already a bare key
  }
  const parts = path.replace(/^\/+/, '').split('?')[0].split('/');
  const last = parts[parts.length - 1];
  if (/^(high|low|original|crop-)/.test(last)) parts.pop();
  else parts[parts.length - 1] = last.replace(/\.[a-z0-9]+$/i, '');
  return parts.join('/');
}

/** Every `src` in a TipTap document, whatever node type carries it. */
function collectSrcs(node: unknown, out: string[]): void {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const n of node) collectSrcs(n, out);
    return;
  }
  const n = node as { attrs?: { src?: unknown }; content?: unknown };
  if (n.attrs && typeof n.attrs.src === 'string') out.push(n.attrs.src);
  if (n.content) collectSrcs(n.content, out);
}

interface Draft {
  slug: string;
  path: string;
  cover: string;
  body: string[];
}

function readDrafts(dirs: string[]): { drafts: Map<string, Draft>; skipped: string[] } {
  const drafts = new Map<string, Draft>();
  const skipped: string[] = [];
  for (const dir of dirs) {
    let entries: string[];
    try {
      entries = readdirSync(dir);
    } catch {
      console.error(`  - --drafts ${dir} is not a readable directory`);
      process.exit(1);
    }
    for (const name of entries.sort()) {
      if (!name.endsWith('.md')) continue;
      const full = join(dir, name);
      if (!statSync(full).isFile()) continue;
      let fm;
      try {
        fm = parseArticleFile(readFileSync(full, 'utf8')).frontMatter;
      } catch {
        // A working revision (`…-REVIEWED.md`, a section fragment) rather than
        // an article file. Counted, not treated as a failure — this command
        // reports on articles, and a file with no `slug:` is not one.
        skipped.push(full);
        continue;
      }
      // FIRST DIRECTORY WINS. A later `--drafts` fills gaps; it never overrides.
      if (drafts.has(fm.slug)) continue;
      drafts.set(fm.slug, {
        slug: fm.slug,
        path: full,
        cover: pathBasename(fm.cover.file),
        body: fm.images.map((i) => pathBasename(i.file)),
      });
    }
  }
  return { drafts, skipped };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const { drafts, skipped } = readDrafts(args.draftDirs);
  const sql = postgres(args.db, { prepare: false, max: 2 });

  const media = await sql<{ filename: string; r2_key: string }[]>`
    select filename, r2_key from media`;
  const byStem = new Map(media.map((m) => [stem(m.r2_key), m]));

  const articles = await sql<
    {
      slug: string;
      cat: string | null;
      cover_image_url: string | null;
      content: { content?: unknown[] } | null;
    }[]
  >`
    select a.slug, c.slug as cat, a.cover_image_url, a.content
    from articles a
    left join inspire_categories c on c.id = a.primary_category_id
    where a.status = 'published'
    order by c.slug nulls last, a.slug`;

  interface Row {
    slug: string;
    cat: string | null;
    draft: string | null;
    live: string[];
    declared: string[] | null;
    missing: string[];
    extra: string[];
    unresolved: string[];
  }
  const rows: Row[] = [];

  for (const a of articles) {
    const srcs: string[] = [];
    collectSrcs(a.content?.content ?? [], srcs);
    const live: string[] = [];
    const unresolved: string[] = [];
    for (const src of [...(a.cover_image_url ? [a.cover_image_url] : []), ...srcs]) {
      const m = byStem.get(stem(src));
      // An image the audit cannot resolve is an image the audit is not
      // checking, and silence there is how the last gap hid. Say it out loud.
      if (m) live.push(m.filename);
      else unresolved.push(src);
    }
    const d = drafts.get(a.slug) ?? null;
    const declared = d ? [d.cover, ...d.body] : null;
    rows.push({
      slug: a.slug,
      cat: a.cat,
      draft: d?.path ?? null,
      live,
      declared,
      missing: declared ? declared.filter((x) => !live.includes(x)) : [],
      extra: declared ? live.filter((x) => !declared.includes(x)) : [],
      unresolved,
    });
  }

  const pad = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '~' : s.padEnd(n));
  const matched = rows.filter((r) => r.draft);
  const behind = matched.filter((r) => r.missing.length);
  const ahead = matched.filter((r) => r.extra.length);

  console.log(`published articles      ${articles.length}`);
  console.log(`with a draft to compare ${matched.length}`);
  console.log(
    `drafts read             ${drafts.size}${skipped.length ? `  (${skipped.length} file(s) skipped: not article files)` : ''}`,
  );

  console.log(
    `\n${pad('SLUG', 38)} ${pad('LIVE', 5)} ${pad('DRAFT', 6)} ${pad('MISSING', 8)} EXTRA`,
  );
  console.log('-'.repeat(72));
  for (const r of matched)
    console.log(
      `${pad(r.slug, 38)} ${pad(String(r.live.length), 5)} ${pad(String(r.declared!.length), 6)} ` +
        `${pad(String(r.missing.length), 8)} ${r.extra.length}`,
    );

  if (behind.length) {
    console.log('\nTHE DRAFT DECLARES AN IMAGE PRODUCTION DOES NOT SERVE:');
    for (const r of behind) {
      console.log(`  /artikel/${r.cat}/${r.slug}   (${r.draft})`);
      for (const m of r.missing) console.log(`     + ${m}`);
    }
  }
  if (ahead.length) {
    // Not a failure on its own: a live article can carry an image its draft
    // never had, and losing it to an `--update` is the risk worth naming.
    console.log('\nPRODUCTION SERVES AN IMAGE THE DRAFT DOES NOT DECLARE:');
    console.log('  (an --update from this draft would REMOVE these from the page)');
    for (const r of ahead) {
      console.log(`  /artikel/${r.cat}/${r.slug}`);
      for (const e of r.extra) console.log(`     - ${e}`);
    }
  }
  const unres = rows.filter((r) => r.unresolved.length);
  if (unres.length) {
    console.log('\nLIVE IMAGE URLS WITH NO MEDIA ROW (not checked by this audit):');
    for (const r of unres) for (const u of r.unresolved) console.log(`  ? ${r.slug}: ${u}`);
  }

  const noDraft = rows.filter((r) => !r.draft);
  const noArticle = [...drafts.values()].filter((d) => !articles.some((a) => a.slug === d.slug));
  console.log(
    `\npublished articles with no draft here: ${noDraft.length}` +
      (noDraft.length
        ? ` (${noDraft
            .slice(0, 5)
            .map((r) => r.slug)
            .join(', ')}${noDraft.length > 5 ? ', …' : ''})`
        : ''),
  );
  console.log(
    `drafts with no published article:     ${noArticle.length}` +
      (noArticle.length
        ? ` (${noArticle.map((d) => `${d.slug} → ${relative(process.cwd(), d.path)}`).join(', ')})`
        : ''),
  );

  if (args.json) writeFileSync(args.json, JSON.stringify(rows, null, 1));
  await sql.end();

  if (behind.length) {
    console.log(
      `\nFAIL — ${behind.length} published article(s) are behind their draft, ` +
        `${behind.reduce((s, r) => s + r.missing.length, 0)} image(s) in total. ` +
        `Written is not shipped: re-ingest with --commit --update --publish.`,
    );
    process.exit(1);
  }
  console.log('\nPASS — every published article serves every image its draft declares.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
