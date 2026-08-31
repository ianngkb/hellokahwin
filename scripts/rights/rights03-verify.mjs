#!/usr/bin/env node
// RIGHTS-03 GATE — prove the two INSTITUTIONAL images are absent from live
// production, and prove the check itself still works.
//
//   node scripts/rights/rights03-verify.mjs
//   node scripts/rights/rights03-verify.mjs --before     # expect them PRESENT
//
// Exit 0 = the takedown holds. Exit 1 = something came back, or the check went
// blind. Run it whenever the two articles are re-ingested, re-imported or
// restored from a backup: a WordPress re-import puts both files straight back,
// and nothing else in the repo would notice.
//
// WHY THIS IS NOT JUST "IS THE STRING GONE". Four separate ways to be wrong,
// and this checks all four:
//
//   1. ABSENCE ON THE PAGE. The stem must not appear in the live HTML.
//   2. ABSENCE AT THE CDN. The R2 URLs must 404 — the page not linking a file
//      is not the same as the file not being served. Both the derived .webp and
//      the untouched original .jpg are checked; the original is the one a
//      reverse-image crawler finds.
//   3. THE NEGATIVE CONTROL. A retained image on the SAME page must still be in
//      the HTML and still 200 at the CDN. Without this, a page that 500s, a DNS
//      failure or a typo'd stem all read as a clean pass. Eleven of this
//      company's tabulated bad checks were a zero that meant nothing.
//   4. THE PAGE ITSELF. HTTP 200, and an <img> count within one of the
//      recorded post-takedown figure — so a page that has quietly collapsed to
//      an error shell cannot pass by containing none of the strings we banned.
//
// The legacy WordPress path is checked too: /wp-content/uploads/... used to 301
// an image request straight at the Getty file, which is a second public route
// to the same exposure and is easy to forget.
import { TARGETS, CONTROLS } from './rights03-lib.mjs';

const BEFORE = process.argv.includes('--before');

// Recorded on 01 Sept 2026 immediately after the takedown, at the same two URLs.
const EXPECTED_IMG = { 'tempat-honeymoon-di-malaysia': 23, 'kursus-kahwin': 25 };
const LEGACY_WP_PATH = 'https://hellokahwin.com/wp-content/uploads/2026/01/IN-TempatHoneymoondiMalaysia-CameronHighland.jpg';

const count = (hay, needle) => hay.split(needle).length - 1;
let fail = 0;
const say = (ok, msg) => { console.log(`${ok ? 'ok  ' : 'FAIL'}  ${msg}`); if (!ok) fail++; };

async function status(url, accept = 'image/webp,*/*') {
  const r = await fetch(url, { method: 'GET', headers: { accept }, redirect: 'manual' });
  return { code: r.status, location: r.headers.get('location') };
}

for (const t of TARGETS) {
  console.log(`\n── ${t.slug}  (${t.label}) ──`);
  const res = await fetch(t.pageUrl, { headers: { accept: 'text/html' } });
  const html = await res.text();
  say(res.status === 200, `page HTTP ${res.status}  ${html.length} bytes`);

  const n = count(html, t.stem);
  say(BEFORE ? n > 0 : n === 0, `stem in live HTML: ${n}  (want ${BEFORE ? '> 0' : '0'})`);

  const imgs = count(html, '<img');
  const want = EXPECTED_IMG[t.slug];
  say(BEFORE ? imgs === want + 1 : imgs === want,
      `<img> on the page: ${imgs}  (want ${BEFORE ? want + 1 : want}) — guards against an error shell passing on absence alone`);

  for (const key of t.r2Keys) {
    const url = `https://images.hellokahwin.com/${key}`;
    const { code } = await status(url);
    say(BEFORE ? code === 200 : code === 404, `CDN ${code}  ${key}`);
  }

  const c = CONTROLS[t.slug];
  const cn = count(html, c.stem);
  say(cn > 0, `NEGATIVE CONTROL in HTML: ${cn}  ${c.stem}`);
  const cs = await status(c.url);
  say(cs.code === 200, `NEGATIVE CONTROL at CDN: HTTP ${cs.code}`);
}

console.log('\n── legacy WordPress image path ──');
const legacy = await status(LEGACY_WP_PATH);
const pointsAtGetty = (legacy.location || '').includes('CameronHighland') &&
                      (legacy.location || '').includes('images.hellokahwin.com');
say(BEFORE ? pointsAtGetty : !pointsAtGetty,
    `${LEGACY_WP_PATH.replace('https://hellokahwin.com', '')} -> ${legacy.code} ${legacy.location || '(no location)'}`);

console.log(`\nRIGHTS03 EXIT: ${fail ? 1 : 0}${fail ? `  — ${fail} check(s) failed` : '  — both institutional images are absent, controls intact'}`);
process.exit(fail ? 1 : 0);
