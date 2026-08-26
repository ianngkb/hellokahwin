// Repair, then verify ONCE. Per URL: purge the edge, wait for the render to
// land, then request twice (the first may be served stale while revalidating).
// Retry up to 4 times with a widening gap. Nothing is swept afterwards — a
// second full census is what re-poisoned these five at 22:05.
import fs from 'node:fs';
import { purgeVercelEdge } from '../../src/lib/cache/edge-purge';

const SLUGS = ['hantaran-tunang-untuk-lelaki','hantaran-tunang-untuk-perempuan','berapa-dulang-hantaran-tunang','hantaran-tunang-simple','barang-hantaran-tunang'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = async (path: string) => {
  const t = Date.now();
  const r = await fetch('https://hellokahwin.com' + path, { headers: { 'user-agent': 'HelloKahwin-heal3/1.0 (CONT-05)' } });
  const body = await r.text();
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const desc = (body.match(/<meta name="description" content="([^"]*)"/i) || [, ''])[1];
  return { status: r.status, cache: r.headers.get('x-vercel-cache'), age: r.headers.get('age'), ms: Date.now() - t, bytes: Buffer.byteLength(body), title, desc, ok: !/^HelloKahwin — Idea/.test(title) };
};

const final: any[] = [];
for (const slug of SLUGS) {
  const path = `/artikel/hantaran-mas-kahwin/${slug}`;
  let res: any = null;
  for (let attempt = 1; attempt <= 4; attempt++) {
    const p = await purgeVercelEdge([path]);
    await sleep(4000);
    await get(path);                    // absorb the revalidating response
    await sleep(6000);
    const r = await get(path);          // the honest one
    console.log(`${new Date().toISOString()} ${slug.padEnd(32)} try${attempt} purge=${p.ok} ${r.status} ${String(r.cache).padEnd(12)} age=${String(r.age).padEnd(4)} ${String(r.ms).padStart(5)}ms ${r.bytes}B ${r.ok ? 'OK' : 'DFLT'}`);
    res = { slug, attempt, ...r };
    if (r.ok) break;
    await sleep(attempt * 10000);
  }
  console.log(`   -> title(${res.title.length}): ${res.title}`);
  console.log(`   -> desc(${res.desc.length}): ${res.desc.slice(0, 110)}`);
  final.push(res);
  await sleep(5000);
}
fs.writeFileSync('.tmp-ops/cont05/heal3.json', JSON.stringify({ sweepShape: 'serial per URL: purge, absorb, verify', rows: final }, null, 1));
console.log('\nSUMMARY: ' + final.filter((r) => r.ok).length + '/' + final.length + ' serving their own title and description');
