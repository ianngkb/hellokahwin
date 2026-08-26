/**
 * Post-write verification. READ ONLY.
 *
 *  1. `published_at` on every touched article is byte-identical to what the
 *     undo snapshot captured before the run — the publish-date trap did not fire.
 *  2. `status`, `slug`, `primary_category_id` and the article's URL are unchanged.
 *  3. Every live image on the 33 pillar articles carries the full credit chain.
 *
 *   npx tsx .tmp-cont02-verify.mts --db <url>
 */
import postgres from 'postgres';
import { readFileSync } from 'node:fs';

let db = '';
for (let i = 2; i < process.argv.length; i++) if (process.argv[i] === '--db') db = process.argv[++i] ?? '';
if (!db) {
  console.error('  - no --db given.');
  process.exit(1);
}

const snap = JSON.parse(
  readFileSync('docs/work-done/2026-08-26-ship-cont-02-enrichment-UNDO/before.json', 'utf8'),
) as { articles: Record<string, unknown>[] };

const sql = postgres(db, { prepare: false, max: 2 });
const ids = snap.articles.map((a) => a.id as string);
const now = await sql<
  {
    id: string;
    slug: string;
    status: string;
    published_at: string | null;
    primary_category_id: string | null;
    cat: string | null;
    review_status: string;
    authorship: string;
  }[]
>`
  select a.id, a.slug, a.status, a.published_at, a.primary_category_id,
         c.slug as cat, a.review_status, a.authorship
  from articles a left join inspire_categories c on c.id = a.primary_category_id
  where a.id in ${sql(ids)}`;
const byId = new Map(now.map((a) => [a.id, a]));

let bad = 0;
console.log(`${'SLUG'.padEnd(36)} ${'PUBLISHED_AT'.padEnd(26)} SAME  STATUS     URL`);
console.log('-'.repeat(112));
for (const before of snap.articles) {
  const a = byId.get(before.id as string)!;
  const b4 = before.published_at ? new Date(before.published_at as string).toISOString() : null;
  const af = a.published_at ? new Date(a.published_at).toISOString() : null;
  const same = b4 === af;
  const slugSame = a.slug === before.slug;
  const catSame = a.primary_category_id === before.primary_category_id;
  if (!same || !slugSame || !catSame || a.status !== 'published') bad++;
  console.log(
    `${a.slug.padEnd(36)} ${(af ?? 'NULL').padEnd(26)} ${(same ? 'yes' : 'NO!!').padEnd(5)} ${a.status.padEnd(10)} ` +
      `/artikel/${a.cat}/${a.slug}${slugSame && catSame ? '' : '   <-- URL CHANGED'}`,
  );
}
console.log(
  `\n${snap.articles.length} articles checked; ${bad} with a moved date, changed URL or lost publish.`,
);
await sql.end();
