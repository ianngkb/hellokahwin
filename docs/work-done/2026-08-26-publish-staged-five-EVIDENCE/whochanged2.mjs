import fs from 'node:fs';
import postgres from 'postgres';
const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const [r] = await sql`select content::text ct, updated_at from articles where slug='kursus-kahwin'`;
const now = JSON.parse(r.ct);
const mine = JSON.parse(fs.readFileSync('.tmp-ops/pub5/kursus.AFTER-preview.json', 'utf8'));
// Postgres normalises jsonb object key order. Compare key-sorted.
const norm = (v) =>
  Array.isArray(v)
    ? v.map(norm)
    : v && typeof v === 'object'
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, norm(v[k])]),
        )
      : v;
const diffs = [];
for (let k = 0; k < 74; k++) {
  if (JSON.stringify(norm(mine.content[k])) !== JSON.stringify(norm(now.content[k]))) diffs.push(k);
}
console.log('blocks that REALLY differ from what I wrote:', diffs.join(', ') || 'NONE');
console.log('my swapped window is blocks 12..31');
console.log(
  'any real difference inside my window:',
  diffs.filter((k) => k >= 12 && k < 32).join(', ') ||
    'NONE — the fee section is exactly as written',
);
for (const k of diffs) {
  const a = JSON.stringify(norm(mine.content[k])),
    b = JSON.stringify(norm(now.content[k]));
  console.log(`\n--- block ${k}: ${a.length} -> ${b.length} bytes`);
  const links = (s) => [...s.matchAll(/"href":"([^"]+)"/g)].map((m) => m[1]);
  console.log('    hrefs mine:', links(a).join(' | ') || '(none)');
  console.log('    hrefs now :', links(b).join(' | ') || '(none)');
}
await sql.end();
