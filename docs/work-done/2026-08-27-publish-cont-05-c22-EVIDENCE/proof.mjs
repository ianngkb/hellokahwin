// Post-write proof, SEQUENTIAL and paced. A proof sweep is production traffic:
// firing cold URLs concurrently is what degraded six pillar hubs on 25 Aug, and
// SEO-05 measured on 27 Aug that a concurrent sweep manufactures the very
// generateMetadata timeout it was trying to detect. One request at a time.
//
// Records more than the question currently being asked: status, x-vercel-cache,
// age, byte count, the rendered <title>, the meta description, whether the
// cover credit line rendered, and the full body kept to disk — because a cold
// render happens once per URL, ever.
import fs from 'node:fs';
import path from 'node:path';

const outDir = process.argv[2];
fs.mkdirSync(outDir, { recursive: true });
const urls = process.argv.slice(3);
const rows = [];

for (const url of urls) {
  const t0 = Date.now();
  const at = new Date().toISOString();
  let r, body = '';
  try {
    r = await fetch(url, { headers: { 'user-agent': 'HelloKahwin-proof/1.0 (CONT-05)' }, redirect: 'manual' });
    body = await r.text();
  } catch (e) {
    rows.push({ url, at, error: String(e.message) });
    console.log(`${at}  ERROR ${url} ${e.message}`);
    continue;
  }
  const ms = Date.now() - t0;
  const name = url.split('/').pop() || 'root';
  fs.writeFileSync(path.join(outDir, name + '.html'), body);

  const title = (body.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [, ''])[1].trim();
  const desc = (body.match(/<meta name="description" content="([^"]*)"/i) || [, ''])[1];
  const h1 = (body.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [, ''])[1].replace(/<[^>]+>/g, '').trim();
  const row = {
    at, url,
    status: r.status,
    location: r.headers.get('location') || null,
    cache: r.headers.get('x-vercel-cache'),
    age: r.headers.get('age'),
    bytes: Buffer.byteLength(body),
    ms,
    title,
    titleLen: title.length,
    descLen: desc.length,
    h1,
    figures: (body.match(/<figure/gi) || []).length,
    creditLines: (body.match(/Kredit:/g) || []).length,
    coverImg: /inspire\/[a-z0-9-]+\/\d+-images-s-[^"']+/.test(body),
    internalArtikelLinks: new Set((body.match(/href="\/artikel\/[a-z0-9-]+\/[a-z0-9-]+"/g) || [])).size,
    nofollow: (body.match(/rel="[^"]*nofollow/g) || []).length,
    robotsNoindex: /noindex/.test(body),
  };
  rows.push(row);
  console.log(
    `${at}  ${row.status} ${String(row.bytes).padStart(7)}B ${String(row.ms).padStart(5)}ms  cache=${row.cache} age=${row.age}\n` +
    `    title(${row.titleLen}): ${row.title}\n` +
    `    h1: ${row.h1}\n` +
    `    figures=${row.figures} credits=${row.creditLines} cover=${row.coverImg} links=${row.internalArtikelLinks} nofollow=${row.nofollow} noindex=${row.robotsNoindex}`
  );
  // Pace: a few seconds between requests so no two cold renders compete.
  await new Promise((res) => setTimeout(res, 6000));
}

fs.writeFileSync(path.join(outDir, 'proof.json'), JSON.stringify({ sweepShape: 'serial, 6s apart', rows }, null, 1));
