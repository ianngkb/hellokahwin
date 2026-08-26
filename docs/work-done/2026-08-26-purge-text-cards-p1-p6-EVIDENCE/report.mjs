import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
import { normStem } from './norm.mjs';
const phase = process.argv[2] || 'before';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const media = await sql`select id, filename, r2_key from media`;
await sql.end();
const base = k => k.split('/').pop();
// A TEXT CARD, by the brief's own rule: a .png DECLARED in an article file (so
// ingest prefixed the upload stamp, leaving filename != the key's basename)
// rather than a WordPress import, whose filename IS the key's basename.
const isCard = m => /\.png$/i.test(m.filename) && m.filename !== base(m.r2_key);
const byStem = new Map(); for (const m of media) byStem.set(normStem(m.r2_key), m);
const sweep = JSON.parse(readFileSync(`.tmp-textcard-purge/sweep-${phase}.json`,'utf8'));
const EIGHT = ['borang-nikah','rukun-nikah','syarat-sah-nikah','lafaz-taklik','harga-sewa-dewan-kahwin','checklist-kahwin','pakej-dewan-kahwin','bajet-kahwin'];
const out = []; let cardTotal = 0;
for (const p of sweep) {
  const cleaned = [...new Set((p.imageStems||[]).map(normStem))].sort();
  // stream-truncated fragments: a prefix of another stem on the same page
  const frag = cleaned.filter(s => cleaned.some(o => o !== s && o.startsWith(s)));
  const named = cleaned.filter(s => !frag.includes(s)).map(s => ({ stem: s, m: byStem.get(s) }));
  const cards = named.filter(x => x.m && isCard(x.m));
  cardTotal += cards.length;
  out.push({ slug: p.slug, cat: p.cat, url: p.url, status: p.status, cache: p.cache, at: p.at,
    served: named.map(x => x.m ? x.m.filename : `UNMATCHED:${x.stem}`),
    cards: cards.map(x => x.m.filename),
    unknown: named.filter(x=>!x.m).map(x=>x.stem), truncated: frag.length });
}
writeFileSync(`.tmp-textcard-purge/report-${phase}.json`, JSON.stringify(out,null,1));
let lines = [];
lines.push(`=== ${phase.toUpperCase()} — image slugs the LIVE page serves, quoted from live HTML ===\n`);
for (const p of out.filter(p=>EIGHT.includes(p.slug))) {
  lines.push(`${p.url}`);
  lines.push(`  HTTP ${p.status}  x-vercel-cache=${p.cache}  fetched ${p.at}`);
  p.served.forEach(s => lines.push(`    ${/\.png$/i.test(s) ? '[CARD]' : '      '} ${s}`));
  lines.push(`  TEXT CARDS SERVED: ${p.cards.length ? p.cards.join(', ') : 'none'}\n`);
}
lines.push(`=== SWEEP, all ${out.length} live articles ===`);
lines.push(`HTTP 200: ${out.filter(p=>p.status===200).length}/${out.length}`);
lines.push(`TEXT CARDS SERVED ANYWHERE: ${cardTotal}, across ${out.filter(p=>p.cards.length).length} articles`);
for (const p of out.filter(p=>p.cards.length)) lines.push(`   ${p.cat}/${p.slug}: ${p.cards.join(', ')}`);
const unk = out.filter(p=>p.unknown.length);
lines.push(`unmatched served stems (no media row): ${unk.reduce((a,b)=>a+b.unknown.length,0)}`);
for (const p of unk) lines.push(`   ${p.slug}: ${p.unknown.join(', ')}`);
const txt = lines.join('\n');
writeFileSync(`.tmp-textcard-purge/report-${phase}.txt`, txt + '\n');
console.log(txt);
