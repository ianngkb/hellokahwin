import postgres from 'postgres';
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, existsSync } from 'node:fs';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { normStem } from './norm.mjs';

const D = 'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/plans/aug-23-2026-session-01/drafts';
const OUT = '.tmp-textcard-purge/ingest';
mkdirSync(`${OUT}/images`, { recursive: true });
const MAP = { 'borang-nikah':'borang-nikah.md','rukun-nikah':'rukun-nikah.md','syarat-sah-nikah':'syarat-sah-nikah.md','lafaz-taklik':'lafaz-taklik.md',
  'harga-sewa-dewan-kahwin':'C6-2-A1-harga-sewa-dewan-kahwin.md','checklist-kahwin':'C6-2-A2-checklist-kahwin.md',
  'pakej-dewan-kahwin':'C6-2-A3-pakej-dewan-kahwin.md','bajet-kahwin':'C6-2-A4-bajet-kahwin.md' };

const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const media = await sql`select id, filename, r2_key, alt, caption, credit, credit_url, license_class, licensor_name from media`;
const byStem = new Map(); for (const m of media) byStem.set(normStem(m.r2_key), m);
const base = k => k.split('/').pop();
const isCard = m => /\.png$/i.test(m.filename) && m.filename !== base(m.r2_key);
const FM = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
const plan = [];
for (const [slug, file] of Object.entries(MAP)) {
  const raw = readFileSync(`${D}/${file}`,'utf8');
  const mm = raw.match(FM);
  const fm = parseYaml(mm[1]);
  const body = mm[2];
  const [a] = await sql`select id, published_at, content from articles where slug=${slug}`;
  // Walk the LIVE document: keep every figure that is not a text card, and
  // record the placeAfter that reproduces its position once the cards are gone.
  const keep = []; let prose = 0;
  for (const n of a.content.content) {
    if (n.type !== 'figureBlock') { prose++; continue; }
    const m = byStem.get(normStem(new URL(n.attrs.src).pathname.replace(/^\/+/,'')));
    if (!m) throw new Error(`${slug}: no media row for ${n.attrs.src}`);
    if (isCard(m)) continue;                       // the purge
    keep.push({ m, placeAfter: prose });
  }
  // The declared path for a surviving figure, taken from the draft where the
  // draft still declares that exact file, so the on-disk path is the approved one.
  const declaredFor = (fn) => {
    const hit = [fm.cover, ...(fm.images ?? [])].find(i => i && base(i.file) === fn);
    return hit ? hit.file : `images/${fn}`;
  };
  const out = { ...fm };
  out.publishedAt = new Date(a.published_at).toISOString();   // keep the indexed publish date
  out.images = keep.map(k => {
    const e = { file: declaredFor(k.m.filename), alt: k.m.alt, ...(k.m.caption ? { caption: k.m.caption } : {}),
      credit: k.m.credit, ...(k.m.credit_url ? { creditUrl: k.m.credit_url } : {}),
      licenseClass: k.m.license_class, licensorName: k.m.licensor_name };
    if (k.placeAfter < prose) e.placeAfter = k.placeAfter;     // < prose means "declared position"; == prose is an append
    return e;
  });
  const files = [out.cover.file, ...out.images.map(i=>i.file)];
  for (const f of files) {
    const src = `${D}/${f}`;
    if (!existsSync(src)) throw new Error(`${slug}: declared file missing on disk: ${src}`);
    copyFileSync(src, `${OUT}/${f}`);
  }
  writeFileSync(`${OUT}/${file}`, `---\n${stringifyYaml(out)}---\n\n${body}`);
  plan.push({ slug, file, publishedAt: out.publishedAt, prose, kept: out.images.map(i=>`${base(i.file)}@${i.placeAfter ?? 'append'}`), removed: 1 });
  console.log(`${slug.padEnd(26)} prose=${prose} kept=${out.images.length} -> ${out.images.map(i=>base(i.file)+'@'+(i.placeAfter ?? 'append')).join(', ') || '(none)'}`);
}
writeFileSync('.tmp-textcard-purge/ingest-plan.json', JSON.stringify(plan,null,1));
await sql.end();
