import fs from 'node:fs';
const dir = process.argv[2];
const dec = (s) => s.replace(/<!--[^>]*-->/g,'').replace(/&amp;/g,'&').replace(/&#x27;|&#39;/g,"'").replace(/&quot;/g,'"').replace(/&lt;/g,'<').replace(/&gt;/g,'>');
const files = fs.readdirSync(dir).filter(f=>f.endsWith('.html')).sort();
let totalEmpty=0, pillarsWithEmpty=0; const misordered=[]; const out=[];
for (const f of files) {
  let html = fs.readFileSync(`${dir}/${f}`,'utf8');
  // HARD BOUND: drop everything from </main> on, so the RSC flight payload
  // (which re-serialises the empty-state string) can never leak into a section.
  const endMain = html.indexOf('</main>');
  if (endMain > 0) html = html.slice(0, endMain);
  const secRe = /<section aria-labelledby="cluster-([^"]+)"/g;
  const starts=[]; let m;
  while ((m = secRe.exec(html))) starts.push({ id:m[1], at:m.index });
  const clusters = starts.map((s) => {
    const close = html.indexOf('</section>', s.at);
    const body = html.slice(s.at, close < 0 ? html.length : close);   // <-- bounded
    const h2 = body.match(/<h2[^>]*>(.*?)<\/h2>/s);
    const links = (body.match(/<a[^>]*href="\/artikel\/[^"]+\/[^"]+"/g) || []).length;
    const empty = /akan datang tidak lama lagi/.test(body);
    return { name: dec(h2?h2[1]:s.id).trim(), count: links, empty };
  });
  const emptyN = clusters.filter(c=>c.empty).length;
  totalEmpty += emptyN; if (emptyN) pillarsWithEmpty++;
  const bad = clusters.some((c,i)=> c.empty && clusters.slice(i+1).some(d=>!d.empty));
  if (bad) misordered.push(f.replace('.html',''));
  out.push({ f:f.replace('.html',''), clusters, emptyN, bad });
}
for (const p of out) {
  console.log(`\n  ${p.f}  —  ${p.clusters.length} clusters, ${p.emptyN} empty${p.bad?'   <<< EMPTY ABOVE REAL CONTENT':''}`);
  p.clusters.forEach((c,i)=>console.log(`     ${String(i+1).padStart(2)}. ${c.empty?'[EMPTY ]':'['+String(c.count).padStart(2)+' art]'} ${c.name}`));
}
console.log(`\n  ==========================================================`);
console.log(`  TOTAL: ${totalEmpty} empty clusters across ${pillarsWithEmpty} of ${files.length} pillars`);
console.log(`  MISORDERED today: ${misordered.length ? misordered.join(', ') : 'NONE'}`);
