// Two URLs stayed on the default title after a purge-then-request. Each request
// came back `REVALIDATED`, i.e. served the stale copy while refreshing behind
// it, and the refresh itself blew the 1.5s metadata deadline again.
//
// So: WARM first (two spaced requests, so the origin data cache is definitely
// hot and the render is fast), THEN purge the edge, THEN request. Retry with a
// gap, one URL at a time, and stop the moment the title is right.
import { purgeVercelEdge } from '../../src/lib/cache/edge-purge';

const SLUGS = ['hantaran-tunang-untuk-lelaki', 'barang-hantaran-tunang'];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const get = async (path: string) => {
  const t = Date.now();
  const r = await fetch('https://hellokahwin.com' + path, { headers: { 'user-agent': 'HelloKahwin-heal2/1.0 (CONT-05)' } });
  const body = await r.text();
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  return { status: r.status, cache: r.headers.get('x-vercel-cache'), age: r.headers.get('age'), ms: Date.now() - t, bytes: Buffer.byteLength(body), title, ok: !/^HelloKahwin — Idea/.test(title) };
};

for (const slug of SLUGS) {
  const path = `/artikel/hantaran-mas-kahwin/${slug}`;
  let done = false;
  for (let attempt = 1; attempt <= 5 && !done; attempt++) {
    const w1 = await get(path); await sleep(4000);
    const w2 = await get(path); await sleep(4000);
    console.log(`${new Date().toISOString()}  ${slug} attempt ${attempt} warm: ${w1.cache}/${w1.ms}ms then ${w2.cache}/${w2.ms}ms`);
    if (w2.ok) { console.log(`   TITLE OK without purging: ${w2.title}`); done = true; break; }
    const p = await purgeVercelEdge([path]);
    await sleep(2500);
    const r = await get(path);
    console.log(`   purge ok=${p.ok} -> ${r.status} cache=${r.cache} age=${r.age} ${r.ms}ms ${r.bytes}B  ${r.ok ? 'TITLE OK' : 'still default'}: ${r.title.slice(0, 80)}`);
    if (r.ok) { done = true; break; }
    await sleep(15000);
  }
  if (!done) console.log(`   ${slug}: NOT REPAIRED after 5 attempts`);
}
