/**
 * Reconcile the asset register's `digunakan_dalam` column against what the 33
 * canonical drafts actually declare.
 *
 * "Register entry both directions" is the standing rule: an image knows which
 * articles carry it. Twelve rows did not — every one of them on
 * `walimatul-urus` and `skrip-pengacara-majlis-perkahwinan`, the two articles
 * CONT-01 wrote while CONT-02 was running and which CONT-02 deliberately did
 * not touch. Nobody wrote their reuse back.
 *
 * ADDITIVE ONLY, on purpose. A `digunakan_dalam` value naming an article
 * outside the 33 (a legacy WordPress page, an unpublished plan) is somebody
 * else's record and this run has no evidence about it, so entries are added and
 * never removed. Anything the recompute would have dropped is printed instead.
 *
 *   node .tmp-cont02-register.mjs           # report
 *   node .tmp-cont02-register.mjs --write
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';

const REG =
  'C:/Users/Ian Ng/Documents/Code/hellokahwin/hellokahwin/docs/asset-register/asset-register.csv';
const write = process.argv.includes('--write');

function parseCsv(t) {
  const rows = [];
  let f = '',
    r = [],
    q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"') {
        if (t[i + 1] === '"') {
          f += '"';
          i++;
        } else q = false;
      } else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') {
      r.push(f);
      f = '';
    } else if (c === '\r') {
      /* skip */
    } else if (c === '\n') {
      r.push(f);
      rows.push(r);
      r = [];
      f = '';
    } else f += c;
  }
  if (f.length || r.length) {
    r.push(f);
    rows.push(r);
  }
  return rows;
}
const esc = (v) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

const rows = parseCsv(readFileSync(REG, 'utf8'));
const hdr = rows[0];
const iFail = hdr.indexOf('fail');
const iUse = hdr.indexOf('digunakan_dalam');
const iId = hdr.indexOf('asset_id');
const iStatus = hdr.indexOf('status_guna');
const iNota = hdr.indexOf('nota');

/**
 * The seventeen P1/P6 text cards. Eight were live and were purged from
 * production on 26 Aug; the other nine were declared in drafts and never
 * ingested. Every one of them is still `status_guna: boleh-guna` in this
 * register — the document a writer consults before choosing an image — one day
 * after the owner banned them and the day after they came off the pages.
 *
 * HK-C-0001..0008, the `kad-tajuk` set, were retired properly at the time.
 * These seventeen were missed. Retiring them here is the same act.
 */
const TEXT_CARDS = [
  'HK-C-0009', 'HK-C-0010', 'HK-C-0011', 'HK-C-0012',
  'HK-C-0013', 'HK-C-0014', 'HK-C-0015', 'HK-C-0016',
  'HK-G-0011', 'HK-G-0012', 'HK-G-0013', 'HK-G-0014',
  'HK-G-0015', 'HK-G-0016', 'HK-G-0017', 'HK-G-0018', 'HK-G-0019',
];
const RETIRE_NOTA =
  'TIDAK BOLEH DIGUNAKAN. Arahan pemilik 25 Ogos 2026: "No i do not want a text card, ' +
  'it looks ugly. Find alternatives, no text card at all." Kad teks ialah imej yang ' +
  'kandungannya perkataan; ujiannya ialah jika kandungan itu boleh ditampal sebagai ' +
  'jadual markdown tanpa kehilangan apa-apa, ia kad teks (panduan gaya §13.4). Lapan ' +
  'daripada tujuh belas kad P1/P6 pernah disiarkan dan dibuang daripada produksi pada ' +
  '26 Ogos 2026; sembilan lagi hanya diisytihar dalam draf dan tidak pernah masuk. ' +
  'Tiada halaman merujuk kad ini. Fail PNG dan objek R2 dikekalkan, tidak dipadam. ' +
  'Nilai `digunakan_dalam` di atas ialah rekod sejarah, bukan penggunaan semasa. ' +
  'Status ditukar daripada `boleh-guna` kepada `jangan-guna` pada 26 Ogos 2026 semasa ' +
  'penghantaran CONT-02 — ia terlepas semasa pembersihan 25/26 Ogos, dan sebuah ' +
  'register yang berkata `boleh-guna` ialah cara kad ini kembali ke halaman.';

const audit = JSON.parse(readFileSync('.tmp-cont02/audit-AFTER.json', 'utf8'));
const usedBy = new Map(); // filename -> Set(slug)
for (const d of audit.drafts)
  for (const f of [d.cover, ...d.body]) {
    if (!usedBy.has(f)) usedBy.set(f, new Set());
    usedBy.get(f).add(d.slug);
  }
const canonical = new Set(audit.drafts.map((d) => d.slug));

let changed = 0;
const wouldDrop = [];
for (const r of rows.slice(1)) {
  const file = (r[iFail] ?? '').trim();
  if (!file) continue;
  const want = usedBy.get(file);
  const have = (r[iUse] ?? '')
    .split(/[;,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const haveSet = new Set(have);

  // Entries naming one of the 33 that the drafts no longer support: reported,
  // never deleted, because this run's evidence is about images and a register
  // row can be carrying a note nobody has written down anywhere else.
  for (const h of have)
    if (canonical.has(h) && !(want && want.has(h))) wouldDrop.push(`${file}: ${h}`);

  if (!want) continue;
  const missing = [...want].filter((s) => !haveSet.has(s));
  if (!missing.length) continue;
  const next = [...new Set([...have, ...missing])].sort();
  console.log(`  + ${file.padEnd(52)} ${missing.join(', ')}`);
  r[iUse] = next.join(';');
  changed++;
}

let retired = 0;
console.log('\nText-card rows still marked `boleh-guna`:');
for (const r of rows.slice(1)) {
  if (!TEXT_CARDS.includes((r[iId] ?? '').trim())) continue;
  if ((r[iStatus] ?? '').trim() === 'jangan-guna') continue;
  console.log(`  ! ${r[iId].padEnd(11)} ${(r[iFail] ?? '').padEnd(48)} ${r[iStatus]} -> jangan-guna`);
  r[iStatus] = 'jangan-guna';
  r[iNota] = `${RETIRE_NOTA}${r[iNota] ? ' — nota asal: ' + r[iNota] : ''}`;
  retired++;
}
if (!retired) console.log('  none');

console.log(`\nrows gaining a usage entry: ${changed}`);
console.log(`text-card rows retired:     ${retired}`);
console.log(`entries the recompute would have DROPPED (left alone): ${wouldDrop.length}`);
for (const d of wouldDrop) console.log(`  ? ${d}`);

if (write && (changed || retired)) {
  copyFileSync(REG, REG.replace(/\.csv$/, '.csv.before-cont02-ship'));
  writeFileSync(REG, rows.map((r) => r.map((v) => esc(v ?? '')).join(',')).join('\n') + '\n');
  console.log(`\nwrote ${REG} (previous copy kept as asset-register.csv.before-cont02-ship)`);
} else if (!write) {
  console.log('\nDRY RUN — nothing written.');
}
