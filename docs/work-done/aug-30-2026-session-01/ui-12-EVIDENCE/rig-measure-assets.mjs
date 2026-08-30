// UI-12 evidence rig — read the REAL intrinsic size and byte weight of every
// asset the live pages declare. Dimensions are read from the delivered file
// (UI-03 R4), never from CROP_TARGETS.
const PAGES = process.argv.slice(2);

function webpDims(buf) {
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const fourcc = buf.toString('ascii', 12, 16);
  if (fourcc === 'VP8 ') {
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (fourcc === 'VP8L') {
    const b = buf.readUInt32LE(21);
    return { w: (b & 0x3fff) + 1, h: ((b >> 14) & 0x3fff) + 1 };
  }
  if (fourcc === 'VP8X') {
    const w = 1 + (buf[24] | (buf[25] << 8) | (buf[26] << 16));
    const h = 1 + (buf[27] | (buf[28] << 8) | (buf[29] << 16));
    return { w, h };
  }
  return null;
}

const seen = new Map();
async function probe(url) {
  if (seen.has(url)) return seen.get(url);
  const r = await fetch(url, { headers: { Range: 'bytes=0-63' } });
  const buf = Buffer.from(await r.arrayBuffer());
  const cr = r.headers.get('content-range');
  const bytes = cr ? Number(cr.split('/')[1]) : Number(r.headers.get('content-length'));
  const d = webpDims(buf);
  const out = { url, status: r.status, bytes, ...(d ?? { w: null, h: null }) };
  seen.set(url, out);
  return out;
}

for (const page of PAGES) {
  const html = await (await fetch(page)).text();
  const urls = new Set();
  for (const m of html.matchAll(/https:\/\/[^"'\ ]+?\.webp[^"'\ ,)]*/g)) {
    urls.add(m[0].replace(/\u0026/g, '&').replace(/&amp;/g, '&'));
  }
  console.log(`\n=== ${page} — ${urls.size} distinct .webp URLs ===`);
  const rows = [];
  for (const u of urls) rows.push(await probe(u));
  rows.sort((a, b) => a.url.localeCompare(b.url));
  for (const r of rows) {
    const slug = r.url.match(/inspire\/([^/]+)\/([^/]+)\/([^?]+)/);
    const label = slug ? `${slug[1]}  ${slug[3]}` : r.url.slice(-60);
    const aspect = r.w && r.h ? (r.w / r.h).toFixed(3) : '  ?  ';
    console.log(
      `${String(r.status).padEnd(4)} ${String(r.w ?? '?').padStart(5)}x${String(r.h ?? '?').padEnd(5)} a=${aspect} ${String(Math.round(r.bytes / 1024)).padStart(5)} KB  ${label}`,
    );
  }
}
