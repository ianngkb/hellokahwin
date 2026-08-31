#!/usr/bin/env node
// TAKEDOWN GATE — prove, against live production, that every asset the company
// has withdrawn is still gone.
//
//   node scripts/rights/takedown-gate.mjs
//   node scripts/rights/takedown-gate.mjs --only HK-L-0592
//   node scripts/rights/takedown-gate.mjs --before          # expect them PRESENT
//
// Driven by docs/asset-register/takedowns.json, so it covers every takedown the
// company has ever done rather than the one somebody remembered to write a
// script for. Add the entry, and the gate starts guarding it.
//
// WHY IT CHECKS FIVE THINGS AND NOT ONE. RIGHTS-03, 01 Sept 2026: the objects
// were deleted from R2, `ListObjectsV2` returned 0 for both prefixes, both
// articles stopped referencing them — and all six URLs still returned HTTP 200
// with `cf-cache-status: HIT`, under a one-year immutable Cache-Control. The
// origin was clean and the file was still being served to the public. Any check
// that stopped at "gone from the bucket" would have reported a finished
// takedown.
//
//   1  DATABASE   no media row survives
//   2  ORIGIN     no object survives in R2
//   3  PAGE       the stem appears nowhere in the live HTML
//   4  CDN        every object URL 404s — this is the one that matters and the
//                 one a bucket check cannot see
//   5  CONTROL    a retained image on the SAME page is still in the HTML and
//                 still 200, and the page's <img> count matches what was
//                 recorded, so a 500 or an error shell cannot pass by
//                 containing none of the strings we banned
//
// Extra public routes (the /wp-content/... legacy redirects) are checked too:
// they are a second way to the same file and they live in a different table.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { sql, s3, ENV, ListObjectsV2Command } from './rights03-lib.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const LEDGER = path.join(REPO, 'docs/asset-register/takedowns.json');
const args = process.argv.slice(2);
const BEFORE = args.includes('--before');
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null;

const ledger = JSON.parse(fs.readFileSync(LEDGER, 'utf8')).takedowns.filter((t) => !only || t.assetId === only);
if (!ledger.length) { console.error(`no ledger entry matched ${only}`); process.exit(2); }

let fail = 0;
const say = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`); if (!ok) fail++; };
const count = (hay, needle) => hay.split(needle).length - 1;

const db = sql();
const client = s3();

for (const t of ledger) {
  console.log(`\n── ${t.assetId}  ${t.label}  (${t.filename}) ──`);

  // 1 DATABASE
  const rows = await db`select id from media where id = ${t.mediaId} or filename like ${'%' + t.stem + '%'}`;
  say(BEFORE ? rows.length > 0 : rows.length === 0, `media rows: ${rows.length}  (want ${BEFORE ? '> 0' : '0'})`);

  // 2 ORIGIN
  for (const key of t.r2Keys) {
    const r = await client.send(new ListObjectsV2Command({ Bucket: t.bucket, Prefix: key }));
    const n = (r.Contents || []).filter((o) => o.Key === key).length;
    say(BEFORE ? n === 1 : n === 0, `R2 origin: ${n} object  ${key}`);
  }

  // 3 PAGE + 5 CONTROL
  for (const url of t.pageUrls) {
    const res = await fetch(url, { headers: { accept: 'text/html' } });
    const html = await res.text();
    say(res.status === 200, `page HTTP ${res.status}  ${html.length} bytes  ${url}`);
    const n = count(html, t.stem);
    say(BEFORE ? n > 0 : n === 0, `stem in live HTML: ${n}  (want ${BEFORE ? '> 0' : '0'})`);
    const imgs = count(html, '<img');
    const want = BEFORE ? t.expectedImgCount + 1 : t.expectedImgCount;
    say(imgs === want, `<img> on the page: ${imgs}  (want ${want})`);
    const cn = count(html, t.control.stem);
    say(cn > 0, `CONTROL in HTML: ${cn}  ${t.control.stem}`);
  }
  const cs = await fetch(t.control.url, { headers: { accept: 'image/webp,*/*' } });
  say(cs.status === 200, `CONTROL at CDN: HTTP ${cs.status}`);

  // 4 CDN — the one a bucket check cannot see
  for (const key of t.r2Keys) {
    const url = `https://images.hellokahwin.com/${key}`;
    const r = await fetch(url, { headers: { accept: 'image/webp,*/*' } });
    const cf = r.headers.get('cf-cache-status');
    say(BEFORE ? r.status === 200 : r.status === 404,
        `CDN HTTP ${r.status}${cf ? ` (cf-cache-status ${cf})` : ''}  ${key}`);
  }

  // extra public routes
  for (const url of t.extraRoutes || []) {
    const r = await fetch(url, { headers: { accept: 'image/webp,*/*' }, redirect: 'manual' });
    const loc = r.headers.get('location') || '';
    const leadsToAsset = loc.includes(t.stem);
    say(BEFORE ? leadsToAsset : !leadsToAsset, `legacy route ${r.status} -> ${loc || '(no location)'}`);
  }
}

await db.end();
console.log(`\nTAKEDOWN-GATE EXIT: ${fail ? 1 : 0}${fail ? `  — ${fail} check(s) failed` : BEFORE ? '  — all ledger assets PRESENT, as --before expects' : '  — every withdrawn asset is gone from the database, the bucket, the page and the CDN'}`);
process.exit(fail ? 1 : 0);
