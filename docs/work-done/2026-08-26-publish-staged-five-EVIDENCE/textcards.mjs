import fs from 'node:fs';
import postgres from 'postgres';
const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
// A "text card" is a generated typographic PNG (kad-tajuk / cover-*.png / a
// graphic keyed from a .png draft file), as distinct from a sourced photograph.
const rows =
  await sql`select slug, content::text ct, cover_image_url from articles where status='published' order by slug`;
let bad = 0,
  imgs = 0;
const offenders = [];
for (const r of rows) {
  const srcs = [...r.ct.matchAll(/"src":\s*"([^"]+)"/g)].map((m) => m[1]);
  imgs += srcs.length;
  const card = srcs.filter((s) => /kad-tajuk|\/cover-|-cover[-.]|\.png/i.test(s));
  if (card.length) {
    bad += card.length;
    offenders.push(r.slug + ': ' + card.join(', '));
  }
}
console.log(`published articles scanned: ${rows.length}`);
console.log(`body image nodes scanned:   ${imgs}`);
console.log(`text-card style graphics:   ${bad}`);
if (offenders.length) offenders.forEach((o) => console.log('  ' + o));
else console.log('  none — zero text cards across all published articles');
// the five new ones, in detail
const five = [
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan',
];
console.log('\n=== body + cover image keys on the five new rows ===');
for (const r of rows.filter((r) => five.includes(r.slug))) {
  const srcs = [...r.ct.matchAll(/"src":\s*"([^"]+)"/g)].map((m) => m[1].split('/').pop());
  console.log('  ' + r.slug);
  console.log('     cover: ' + r.cover_image_url.split('/').pop());
  srcs.forEach((s) => console.log('     body : ' + s));
}
await sql.end();
