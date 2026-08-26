import postgres from 'postgres';
import { readFileSync, writeFileSync } from 'node:fs';
const phase = process.argv[2] || 'before';
const sql = postgres(readFileSync('.tmp-textcard-purge/.dburl','utf8').trim(),{prepare:false,max:2});
const arts = await sql`
  select a.slug, c.slug as cat from articles a
  join inspire_categories c on c.id = a.primary_category_id
  where a.status='published' order by c.slug, a.slug`;
await sql.end();
const urls = arts.map(a => ({ slug: a.slug, cat: a.cat, url: `https://hellokahwin.com/artikel/${a.cat}/${a.slug}` }));
console.log('pages to sweep:', urls.length);

// The image stem the page actually serves: inspire/<article>/<ts>-<name>
function stems(html) {
  const out = new Set();
  for (const m of html.matchAll(/https:\/\/images\.hellokahwin\.com\/([^"'\s\)]+)/g)) {
    const p = m[1].split('?')[0].split('/');
    const last = p[p.length-1];
    if (/^(high|low|original|crop-)/.test(last)) p.pop(); else p[p.length-1] = last.replace(/\.[a-z0-9]+$/i,'');
    out.add(p.join('/'));
  }
  return [...out].sort();
}

const results = [];
const CONC = Number(process.env.CONC ?? 4);
let i = 0;
async function worker() {
  while (i < urls.length) {
    const u = urls[i++];
    const at = new Date().toISOString();
    try {
      const res = await fetch(u.url, { redirect: 'manual' });
      const html = await res.text();
      results.push({ ...u, at, status: res.status,
        cache: res.headers.get('x-vercel-cache'), age: res.headers.get('age'),
        bytes: html.length, imageStems: stems(html) });
    } catch (e) { results.push({ ...u, at, status: 0, error: String(e) }); }
  }
}
await Promise.all(Array.from({length:CONC}, worker));
results.sort((a,b)=> (a.cat+a.slug).localeCompare(b.cat+b.slug));
writeFileSync(`.tmp-textcard-purge/sweep-${phase}.json`, JSON.stringify(results,null,1));
const bad = results.filter(r=>r.status!==200);
console.log(`status 200: ${results.filter(r=>r.status===200).length}/${results.length}`);
if (bad.length) console.log('NON-200:', JSON.stringify(bad.map(b=>({u:b.url,s:b.status}))));
console.log('total distinct image stems served:', new Set(results.flatMap(r=>r.imageStems??[])).size);
