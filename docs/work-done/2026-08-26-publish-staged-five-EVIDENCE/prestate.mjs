import fs from 'node:fs';
import postgres from 'postgres';

const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });

const SLUGS = [
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan',
];
const TAG_NAMES = [
  'dulang hantaran',
  'hantaran',
  'gubahan hantaran',
  'persiapan kahwin',
  'bajet kahwin',
  'sirih junjung',
  'adat perkahwinan',
  'walimatul urus',
  'adab tetamu majlis',
  'jemputan kahwin',
  'kenduri kahwin',
  'skrip pengacara majlis perkahwinan',
  'aturcara majlis perkahwinan',
  'teks pengacara majlis',
  'protokol majlis',
];
const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
const TAG_SLUGS = [...new Set(TAG_NAMES.map(slugify))];

const at = new Date().toISOString();
const out = [];
const P = (s) => {
  out.push(s);
  console.log(s);
};

P(`=== PRE-WRITE STATE, production, ${at} ===`);
const [a] = await sql`select count(*)::int n from articles`;
const [ap] = await sql`select count(*)::int n from articles where status='published'`;
const [m] = await sql`select count(*)::int n from media`;
const [t] = await sql`select count(*)::int n from inspire_tags`;
const census =
  await sql`select jsonb_typeof(content) t, count(*)::int n from articles group by 1 order by 1`;
P(`articles total            ${a.n}`);
P(`articles published        ${ap.n}`);
P(`media total               ${m.n}`);
P(`inspire_tags total        ${t.n}`);
P(`jsonb_typeof(content)     ${JSON.stringify(census)}`);

const clash = await sql`select slug,status from articles where slug = any(${SLUGS})`;
P(
  `\ntarget slugs already in articles: ${clash.length ? JSON.stringify(clash) : 'NONE — all five are new inserts'}`,
);

const perPillar = await sql`
  select c.slug, c.name, count(a.id)::int n
    from inspire_categories c
    left join articles a on a.primary_category_id = c.id and a.status='published'
   where c.parent_id is null
   group by c.slug, c.name order by c.slug`;
P('\npublished per top-level category:');
for (const r of perPillar) P(`  ${r.slug.padEnd(26)} ${String(r.n).padStart(3)}   ${r.name}`);

const existing = await sql`select slug from inspire_tags where slug = any(${TAG_SLUGS})`;
const have = new Set(existing.map((r) => r.slug));
P('\ntag slugs this batch needs — PRE-EXISTING ones must NOT be deleted on undo:');
for (const s of TAG_SLUGS) P(`  ${have.has(s) ? 'PRE-EXISTING' : 'WILL BE NEW '}  ${s}`);
P(`\nnew tags this run will create: ${TAG_SLUGS.filter((s) => !have.has(s)).length}`);

const [k] =
  await sql`select id, jsonb_typeof(content) t, length(content::text) len, updated_at from articles where slug='kursus-kahwin'`;
P(
  `\nkursus-kahwin row: id=${k.id} shape=${k.t} content bytes=${k.len} updated_at=${k.updated_at.toISOString()}`,
);
P(
  `  snapshot of the exact before-state: .tmp-ops/pub5/kursus.BEFORE.json (${fs.statSync('.tmp-ops/pub5/kursus.BEFORE.json').size} bytes)`,
);

fs.writeFileSync('.tmp-ops/pub5/prestate.txt', out.join('\n') + '\n');
fs.writeFileSync(
  '.tmp-ops/pub5/prestate.json',
  JSON.stringify(
    {
      at,
      articles: a.n,
      published: ap.n,
      media: m.n,
      tags: t.n,
      census,
      slugs: SLUGS,
      tagSlugs: TAG_SLUGS,
      preExistingTags: [...have],
      kursusId: k.id,
    },
    null,
    1,
  ),
);
await sql.end();
