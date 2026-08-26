// Repair the cached generateMetadata:{} responses. The origin data cache is now
// WARM from the first proof sweep, so purging the edge and re-requesting gives
// the render a fast path and it lands inside the 1.5s metadata deadline.
// One path at a time, with a pause: a bulk tag purge is itself a stampede
// trigger (SEO-05, 27 Aug), and this run has already seen a serial cold sweep
// blow the deadline 5 times out of 5.
import { purgeVercelEdge } from '../../src/lib/cache/edge-purge';

const SLUGS = [
  'hantaran-tunang-untuk-lelaki',
  'barang-hantaran-tunang',
];
const _UNUSED = [
  'hantaran-tunang-untuk-lelaki',
  'hantaran-tunang-untuk-perempuan',
  'berapa-dulang-hantaran-tunang',
  'hantaran-tunang-simple',
  'barang-hantaran-tunang',
];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

for (const slug of SLUGS) {
  const path = `/artikel/hantaran-mas-kahwin/${slug}`;
  const res = await purgeVercelEdge([path]);
  console.log(`${new Date().toISOString()}  purge ${path} -> ok=${res.ok} ${JSON.stringify(res).slice(0, 160)}`);
  await sleep(3000);

  const r = await fetch('https://hellokahwin.com' + path, { headers: { 'user-agent': 'HelloKahwin-heal/1.0 (CONT-05)' } });
  const body = await r.text();
  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const ok = !/^HelloKahwin — Idea/.test(title);
  console.log(`${new Date().toISOString()}  ${r.status} cache=${r.headers.get('x-vercel-cache')} age=${r.headers.get('age')} ${Buffer.byteLength(body)}B  ${ok ? 'TITLE OK' : 'STILL DEFAULT'}: ${title.slice(0, 80)}`);
  await sleep(6000);
}
