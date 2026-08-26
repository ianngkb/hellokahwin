import fs from 'node:fs';
import postgres from 'postgres';
const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const rows = await sql`select slug, wp_id, jsonb_typeof(content) t, content->>'type' doctype,
  (select string_agg(distinct k,',') from jsonb_object_keys(content) k) keys,
  jsonb_typeof(content->'content') ctype
  from articles order by (wp_id is null), slug`;
const groups = new Map();
for (const r of rows) {
  const k = `jsonb_typeof=${r.t} · top-level keys={${r.keys}} · type="${r.doctype}" · content is ${r.ctype}`;
  if (!groups.has(k)) groups.set(k, []);
  groups.get(k).push(r);
}
console.log('=== content SHAPES across all', rows.length, 'articles ===');
for (const [k, v] of groups) {
  const wp = v.filter((r) => r.wp_id !== null).length;
  console.log(`\n${v.length} rows  (${wp} WordPress-migrated, ${v.length - wp} ingested)`);
  console.log('  ' + k);
  console.log(
    '  e.g. ' +
      v
        .slice(0, 4)
        .map((r) => r.slug)
        .join(', '),
  );
}
const [s] = await sql`select count(*)::int n from articles where jsonb_typeof(content)='string'`;
console.log(
  `\nrows whose content is a STRING (the shape the audit script and the swap instructions describe): ${s.n}`,
);
const [wp] = await sql`select count(*)::int n from articles where wp_id is not null`;
console.log(`rows carrying a wp_id (WordPress migration): ${wp.n}`);
await sql.end();
