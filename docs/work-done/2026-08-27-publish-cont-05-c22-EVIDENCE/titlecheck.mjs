// Sequential title census. Two spaced requests per URL: the first may be served
// stale while it revalidates, the second is the honest one. Records the sweep
// shape and the edge state beside every result, because a reading without them
// cannot be called warm or cold and proves nothing either way.
import fs from 'node:fs';
const SLUGS = ['hantaran-tunang-untuk-lelaki','hantaran-tunang-untuk-perempuan','berapa-dulang-hantaran-tunang','hantaran-tunang-simple','barang-hantaran-tunang'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [];
for (const slug of SLUGS) {
  const url = `https://hellokahwin.com/artikel/hantaran-mas-kahwin/${slug}`;
  let last;
  for (let i = 1; i <= 2; i++) {
    const t = Date.now();
    const r = await fetch(url, { headers: { 'user-agent': 'HelloKahwin-titlecheck/1.0 (CONT-05)' } });
    const body = await r.text();
    const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
    const desc = (body.match(/<meta name="description" content="([^"]*)"/i) || [, ''])[1];
    last = { at: new Date().toISOString(), req: i, slug, status: r.status, cache: r.headers.get('x-vercel-cache'), age: r.headers.get('age'), ms: Date.now() - t, bytes: Buffer.byteLength(body), title, titleLen: title.length, descLen: desc.length, ok: !/^HelloKahwin — Idea/.test(title) };
    console.log(`${last.at} req${i} ${slug.padEnd(32)} ${last.status} ${String(last.cache).padEnd(12)} age=${String(last.age).padEnd(5)} ${String(last.ms).padStart(5)}ms ${last.ok ? 'OK  ' : 'DFLT'} title(${last.titleLen}) desc(${last.descLen})`);
    if (i === 1) await sleep(5000);
  }
  rows.push(last);
  console.log(`    -> ${last.title}`);
  await sleep(7000);
}
fs.writeFileSync('.tmp-ops/cont05/titlecheck.json', JSON.stringify({ sweepShape: 'serial, 2 requests per URL 5s apart, 7s between URLs', rows }, null, 1));
console.log('\nSUMMARY: ' + rows.filter(r => r.ok).length + '/' + rows.length + ' serving their own title on the second request');
