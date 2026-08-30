import fs from 'node:fs';
import postgres from 'postgres';
const D =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts/';
const FILES = [
  ['C2-3-A1-dulang-hantaran', D + 'ingest/C2-3-A1-dulang-hantaran.md'],
  ['C2-3-A2-gubahan-hantaran', D + 'ingest/C2-3-A2-gubahan-hantaran.md'],
  ['C2-3-A3-sirih-junjung', D + 'ingest/C2-3-A3-sirih-junjung.md'],
  ['P3-A4-walimatul-urus', D + 'P3-A4-walimatul-urus.md'],
  ['P3-A5-skrip-pengacara', D + 'P3-A5-skrip-pengacara-majlis-perkahwinan.md'],
];
function bodyInternalLinks(markdown) {
  const slugs = new Set();
  for (const m of markdown.matchAll(/\[[^\]]*\]\((\/[^)\s]*)\)/g)) {
    const path = m[1].split('#')[0].split('?')[0].replace(/\/+$/, '');
    if (!path) continue;
    const seg = path.split('/').filter(Boolean);
    if (seg[0] === 'artikel') {
      if (seg.length >= 3) slugs.add(seg[seg.length - 1]);
    } else if (seg.length === 1) slugs.add(seg[0]);
  }
  return [...slugs];
}
const all = new Set();
const rep = [];
for (const [name, p] of FILES) {
  const raw = fs.readFileSync(p, 'utf8');
  const parts = raw.split(/^---\s*$/m);
  const fm = parts[1] || '';
  const body = parts.slice(2).join('---');
  const fmSlugs = [...fm.matchAll(/^\s*-\s*slug:\s*(\S+)/gm)].map((m) => m[1]);
  const bd = bodyInternalLinks(body);
  // also collect ALL /artikel/ links in body incl hubs for reporting
  const raws = [...body.matchAll(/\[[^\]]*\]\((\/[^)\s]*)\)/g)].map((m) => m[1]);
  rep.push({ name, fmSlugs, bd, raws: [...new Set(raws)] });
  fmSlugs.forEach((s) => all.add(s));
  bd.forEach((s) => all.add(s));
}
const url = fs
  .readFileSync('.env', 'utf8')
  .match(/^DATABASE_URL=(.*)$/m)[1]
  .trim()
  .replace(/^["']|["']$/g, '');
const sql = postgres(url, { prepare: false, max: 1 });
const rows = await sql`select slug,status from articles where slug=any(${[...all]})`;
const st = new Map(rows.map((r) => [r.slug, r.status]));
const BATCH = new Set([
  'dulang-hantaran',
  'gubahan-hantaran',
  'sirih-junjung',
  'walimatul-urus',
  'skrip-pengacara-majlis-perkahwinan',
]);
for (const r of rep) {
  console.log('#### ' + r.name);
  console.log('  fm  :', r.fmSlugs.join(', ') || '(none)');
  console.log('  body:', r.bd.join(', ') || '(none)');
  console.log('  raw hrefs:', r.raws.join('  ') || '(none)');
}
console.log('\n=== every referenced slug resolved against production ===');
for (const s of [...all].sort()) {
  const tag = BATCH.has(s)
    ? 'IN-BATCH '
    : st.get(s) === 'published'
      ? 'PUBLISHED'
      : st.get(s)
        ? 'DRAFT    '
        : 'MISSING  ';
  console.log(' ', tag, s);
}
console.log('\nIN-BATCH cross-links:', [...all].filter((s) => BATCH.has(s)).join(', ') || 'NONE');
await sql.end();
