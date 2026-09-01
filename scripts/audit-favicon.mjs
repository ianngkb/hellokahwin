#!/usr/bin/env node
/**
 * UI-20 — the icon gate. Runs the item's own Definition of Done as six checks
 * against whatever is actually being served, and refuses to be satisfied by a
 * status code.
 *
 *   node scripts/audit-favicon.mjs                       # live production
 *   node scripts/audit-favicon.mjs --url http://localhost:3200
 *   node scripts/audit-favicon.mjs --local               # files in public/
 *   node scripts/audit-favicon.mjs --selftest            # paired assertion
 *
 * WHY THE RENDER CHECK EXISTS
 * A 200 proves a file is served, not that anyone can read it. The mark is
 * 2.188:1, so in a 16px square it is ~6.4px tall and its hairline crossbar is a
 * third of a pixel. This gate therefore rasterises the 16x16 entry and asserts
 * the things a human means by "legible": TWO ink groups (H and K) with clear
 * ground between them, an OPEN counter and a PRESENT crossbar in the H, and a
 * diagonal — a right edge that moves with the row — in the K.
 *
 * WHY --selftest EXISTS
 * A check you have only watched pass is half a check. `--selftest` runs the
 * colour and render assertions against the retired magenta favicon kept at
 * scripts/__tests__/fixtures/ and asserts they FIRE, then against the shipped
 * icons and asserts they CLEAR. The fixture differs from the shipped icon in
 * exactly the two things being tested — its colour, and its single glyph.
 */

import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');

/** The colour the site retired. Measured off the live 48x48 on 02 Sep 2026:
 *  1841 of 2304 pixels, hue 332deg. It is in no palette file in this repo. */
const RETIRED_MAGENTA = '#b4326e';
/** Anything in this hue band at real saturation is a pink survivor, whatever
 *  its exact hex. The whole shipped palette sits at hue 30-45deg. */
const PINK_BAND = { hueMin: 270, hueMax: 355, satMin: 0.2 };

const TOKENS = readFileSync(path.join(ROOT, 'src/design-system/tokens.css'), 'utf8');
const token = (name) =>
  TOKENS.match(new RegExp(`${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))[1].toLowerCase();
const GROUND = token('--hk-parchment-100');
const MARK = token('--hk-ink-900');

const argv = process.argv.slice(2);
const SELFTEST = argv.includes('--selftest');
const LOCAL = argv.includes('--local');
const BASE = (argv[argv.indexOf('--url') + 1] || '').startsWith('http')
  ? argv[argv.indexOf('--url') + 1].replace(/\/$/, '')
  : 'https://hellokahwin.com';

/* ── helpers ──────────────────────────────────────────────────────────── */

const hex = (r, g, b) => '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('');
const rgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

function hue(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return { h: 0, s: 0 };
  const l = (max + min) / 2 / 255;
  const s = d / 255 / (1 - Math.abs(2 * l - 1));
  let h;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h *= 60;
  if (h < 0) h += 360;
  return { h, s };
}

/** Perpendicular distance from the ink..parchment segment, in 0-255 units. */
const A = rgb(MARK);
const B = rgb(GROUND);
const AB = B.map((v, i) => v - A[i]);
const ABlen2 = AB.reduce((s, v) => s + v * v, 0);
function offRamp(r, g, b) {
  const AP = [r - A[0], g - A[1], b - A[2]];
  const t = AP.reduce((s, v, i) => s + v * AB[i], 0) / ABlen2;
  const proj = AB.map((v, i) => A[i] + t * v);
  return Math.hypot(...proj.map((v, i) => [r, g, b][i] - v));
}

async function pixels(buf) {
  const { data, info } = await sharp(buf).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height, ch: info.channels };
}

async function get(url) {
  const res = await fetch(url, { redirect: 'manual' });
  const body = Buffer.from(await res.arrayBuffer());
  return { status: res.status, type: res.headers.get('content-type') || '', body, res };
}

/** Fetch a path from the base URL, or read it out of public/ in --local mode. */
async function asset(p) {
  if (LOCAL) {
    const abs = path.join(ROOT, 'public', p);
    if (!existsSync(abs)) return { status: 404, type: '', body: Buffer.alloc(0) };
    const body = readFileSync(abs);
    const type = p.endsWith('.svg')
      ? 'image/svg+xml'
      : p.endsWith('.ico')
        ? 'image/x-icon'
        : 'image/png';
    return { status: 200, type, body };
  }
  return get(`${BASE}/${p}`);
}

/* ── ICO reader — deliberately NOT the writer's code, so a malformed file
      the writer is happy with still fails here. ──────────────────────────── */

function readIco(buf) {
  if (buf.readUInt16LE(0) !== 0 || buf.readUInt16LE(2) !== 1) throw new Error('not an ICO');
  const n = buf.readUInt16LE(4);
  const entries = [];
  for (let i = 0; i < n; i++) {
    const e = 6 + i * 16;
    entries.push({
      width: buf.readUInt8(e) || 256,
      height: buf.readUInt8(e + 1) || 256,
      bpp: buf.readUInt16LE(e + 6),
      bytes: buf.readUInt32LE(e + 8),
      offset: buf.readUInt32LE(e + 12),
    });
  }
  return entries;
}

/** Decode one 32bpp BMP/DIB ICO entry to top-down RGBA. */
function decodeIcoEntry(buf, entry) {
  const h = buf.subarray(entry.offset, entry.offset + 40);
  if (h.readUInt32LE(0) !== 40) throw new Error('entry is not a 40-byte BITMAPINFOHEADER');
  const w = h.readInt32LE(4);
  const hh = h.readInt32LE(8) / 2;
  if (h.readUInt16LE(14) !== 32) throw new Error('entry is not 32bpp');
  const xor = buf.subarray(entry.offset + 40, entry.offset + 40 + w * hh * 4);
  const out = Buffer.alloc(w * hh * 4);
  for (let y = 0; y < hh; y++) {
    for (let x = 0; x < w; x++) {
      const s = ((hh - 1 - y) * w + x) * 4;
      const d = (y * w + x) * 4;
      out[d] = xor[s + 2];
      out[d + 1] = xor[s + 1];
      out[d + 2] = xor[s];
      out[d + 3] = xor[s + 3];
    }
  }
  return { data: out, w, h: hh, ch: 4 };
}

/* ── the two content assertions, factored so --selftest can aim them at a
      known-bad input as well as the shipped one. ─────────────────────────── */

/** Colour: dominant is the ground token, and nothing pink anywhere. */
function checkColour({ data, w, h, ch }, label) {
  const counts = new Map();
  let pinkPixels = 0;
  let exactMagenta = 0;
  let maxOffRamp = 0;
  let opaque = 0;
  for (let i = 0; i < data.length; i += ch) {
    if (data[i + 3] < 8) continue;
    opaque++;
    const [r, g, b] = [data[i], data[i + 1], data[i + 2]];
    const k = hex(r, g, b);
    counts.set(k, (counts.get(k) || 0) + 1);
    if (k === RETIRED_MAGENTA) exactMagenta++;
    const { h: hu, s } = hue(r, g, b);
    if (s >= PINK_BAND.satMin && hu >= PINK_BAND.hueMin && hu <= PINK_BAND.hueMax) pinkPixels++;
    const d = offRamp(r, g, b);
    if (d > maxOffRamp) maxOffRamp = d;
  }
  const [domHex, domN] = [...counts].sort((a, b) => b[1] - a[1])[0];
  const lines = [
    `${label}: ${opaque} opaque px, ${counts.size} distinct colours`,
    `  dominant           ${domHex}  ${domN}/${opaque} (${((domN / opaque) * 100).toFixed(1)}%)`,
    `  exact ${RETIRED_MAGENTA}     ${exactMagenta} px`,
    `  pink band h${PINK_BAND.hueMin}-${PINK_BAND.hueMax} s>=${PINK_BAND.satMin}  ${pinkPixels} px`,
    `  max distance off the ink..parchment ramp  ${maxOffRamp.toFixed(2)}/255`,
  ];
  const fails = [];
  if (domHex !== GROUND)
    fails.push(`dominant colour is ${domHex}, expected ${GROUND} (--hk-parchment-100)`);
  if (exactMagenta) fails.push(`${exactMagenta} px of the retired ${RETIRED_MAGENTA}`);
  if (pinkPixels) fails.push(`${pinkPixels} px inside the pink hue band`);
  if (maxOffRamp > 8)
    fails.push(`a pixel sits ${maxOffRamp.toFixed(2)}/255 off the two-colour ramp`);
  return { lines, fails, domHex, domN, opaque };
}

/** Render: two glyphs, separated, with an open counter and a crossbar. */
function checkRender({ data, w, h, ch }, label) {
  // ink-ness per pixel: 1 at --hk-ink-900, 0 at --hk-parchment-100
  const lum = (r, g, b) => {
    const f = (v) => ((v /= 255) <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const lGround = lum(...rgb(GROUND));
  const lMark = lum(...rgb(MARK));
  const ink = [];
  let darkest = 1;
  for (let y = 0; y < h; y++) {
    const row = [];
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * ch;
      const L = lum(data[i], data[i + 1], data[i + 2]);
      if (L < darkest) darkest = L;
      row.push(Math.max(0, Math.min(1, (lGround - L) / (lGround - lMark))));
    }
    ink.push(row);
  }
  // A pixel counts as ink at 0.15 of full ink. This is a PRESENCE threshold,
  // not a legibility one — how strong the mark actually is, is asserted
  // separately at the bottom of this function as a contrast ratio. It is set
  // below the 0.22 the H's own serifs reach in the counter so that erasing the
  // crossbar leaves the glyph one connected group and fires the crossbar
  // assertion rather than the group-count one.
  const INKED = 0.15;
  const colMax = Array.from({ length: w }, (_, x) => Math.max(...ink.map((r) => r[x])));

  // ink groups = runs of inked columns
  const groups = [];
  let run = null;
  colMax.forEach((v, x) => {
    if (v >= INKED) {
      if (!run) run = { x0: x, x1: x };
      else run.x1 = x;
    } else if (run) {
      groups.push(run);
      run = null;
    }
  });
  if (run) groups.push(run);

  const ramp = ' .:-=+*#%@';
  const lines = [`${label}: ${w}x${h}`];
  for (const r of ink)
    lines.push('    |' + r.map((v) => ramp[Math.min(9, Math.round(v * 9))]).join('') + '|');
  lines.push('    colmax ' + colMax.map((v) => v.toFixed(2)).join(' '));
  lines.push(`    ink column groups: ${groups.map((g) => `${g.x0}-${g.x1}`).join(', ') || 'none'}`);

  const fails = [];
  if (groups.length !== 2) {
    fails.push(`expected 2 ink groups (H and K), found ${groups.length}`);
    return { lines, fails, geom: { groups } };
  }
  const [H, K] = groups;
  const gap = K.x0 - H.x1 - 1;
  lines.push(`    clear ground columns between the glyphs: ${gap}`);
  if (gap < 1) fails.push(`H and K are not separated (gap ${gap} px)`);

  const edgeL = colMax[0];
  const edgeR = colMax[w - 1];
  lines.push(`    edge columns: left ${edgeL.toFixed(2)}  right ${edgeR.toFixed(2)}`);
  if (edgeL >= INKED || edgeR >= INKED) fails.push('the mark runs into the tile edge');

  // The H: find its two stems as the darkest column in each half of the group,
  // then read the COUNTER — the columns strictly between them. A letter H has
  // a crossbar that SPANS that counter on some rows and leaves it OPEN on
  // others. A filled block spans it on every row; a pair of bars spans it on
  // none. Taking `H.x0 + 1 .. H.x1 - 1` as the counter instead is what the
  // first cut of this gate did, and it swallowed both stems whole — the stems
  // are 2px wide at 16px, not 1 — so a correct icon reported a filled counter.
  const mid = Math.floor((H.x0 + H.x1) / 2);
  const peak = (a, b) => {
    let best = a;
    for (let x = a; x <= b; x++) if (colMax[x] > colMax[best]) best = x;
    return best;
  };
  const stemL = peak(H.x0, mid);
  const stemR = peak(mid + 1, H.x1);
  lines.push(`    H stems at columns ${stemL} and ${stemR}, counter ${stemL + 1}-${stemR - 1}`);
  if (stemR - stemL < 2) {
    fails.push(`the H has no open counter between its stems (stems at ${stemL} and ${stemR})`);
    return { lines, fails, geom: { groups, stemL, stemR } };
  }
  const counter = [];
  for (let y = 0; y < h; y++) {
    let lo = 1;
    let hi = 0;
    for (let x = stemL + 1; x < stemR; x++) {
      lo = Math.min(lo, ink[y][x]);
      hi = Math.max(hi, ink[y][x]);
    }
    counter.push({ lo, hi });
  }
  // The crossbar is looked for ONLY in the middle half of the glyph's vertical
  // band. Bodoni's H serifs put ~0.22 of full ink into the counter at the top
  // and bottom rows, which is enough to satisfy "something spans the counter"
  // on a glyph that has no crossbar at all — so a search over the whole band
  // is a check that cannot fail. Measured: erasing only the middle-row counter
  // ink leaves the serif rows at 0.22 and the middle rows at 0.00.
  const bandRows = [];
  for (let y = 0; y < h; y++) {
    let any = 0;
    for (let x = H.x0; x <= H.x1; x++) any = Math.max(any, ink[y][x]);
    if (any >= INKED) bandRows.push(y);
  }
  const middle = bandRows.slice(2, Math.max(3, bandRows.length - 2));
  const crossbar = Math.max(...middle.map((y) => counter[y].lo)); // spans the counter
  const openest = Math.min(...bandRows.map((y) => counter[y].hi)); // leaves it empty
  lines.push(
    `    H band rows ${bandRows[0]}-${bandRows[bandRows.length - 1]}, crossbar searched in rows ${middle[0]}-${middle[middle.length - 1]}`,
  );
  lines.push(
    `    H crossbar (best middle row spanning the counter) ${crossbar.toFixed(2)}   emptiest counter row ${openest.toFixed(2)}`,
  );
  if (crossbar < INKED)
    fails.push(`the H has no crossbar (best spanning middle row ${crossbar.toFixed(2)})`);
  if (openest >= INKED)
    fails.push('the H counter is filled on every row — it reads as a block, not a letter');

  // The K: its right edge must MOVE with the row. A rectangle gives 0.
  const rights = [];
  for (let y = 0; y < h; y++) {
    let r = -1;
    for (let x = K.x0; x <= K.x1; x++) if (ink[y][x] >= INKED) r = x;
    if (r >= 0) rights.push(r);
  }
  const swing = Math.max(...rights) - Math.min(...rights);
  lines.push(`    K right-edge swing across rows: ${swing} px`);
  if (swing < 2) fails.push(`the K has no diagonal (right edge moves ${swing} px)`);

  const ratio = (Math.max(lGround, darkest) + 0.05) / (Math.min(lGround, darkest) + 0.05);
  lines.push(`    darkest rendered pixel vs ground: ${ratio.toFixed(2)}:1`);
  if (ratio < 4.5) fails.push(`darkest stroke is only ${ratio.toFixed(2)}:1 against the ground`);

  const band = [];
  for (let y = 0; y < h; y++) if (ink[y].some((v) => v >= INKED)) band.push(y);
  return {
    lines,
    fails,
    geom: {
      groups,
      stemL,
      stemR,
      band,
      crossbarRows: middle.filter((y) => counter[y].lo >= INKED),
    },
  };
}

/* ── the run ──────────────────────────────────────────────────────────── */

const results = [];
const record = (id, ok, lines) => {
  results.push({ id, ok });
  console.log(`\n[${ok ? 'PASS' : 'FAIL'}] ${id}`);
  for (const l of lines) console.log('  ' + l);
};

async function auditShipped() {
  console.log(LOCAL ? `SOURCE: public/ on disk` : `SOURCE: ${BASE}`);

  /* 1. favicon.ico */
  const icoRes = await asset('favicon.ico');
  let ico16 = null;
  {
    const lines = [
      `GET /favicon.ico -> ${icoRes.status} ${icoRes.type} ${icoRes.body.length} bytes`,
    ];
    const fails = [];
    if (icoRes.status !== 200) fails.push(`status ${icoRes.status}`);
    else {
      try {
        const entries = readIco(icoRes.body);
        lines.push(
          `  entries: ${entries.map((e) => `${e.width}x${e.height}@${e.bpp}bpp`).join(', ')}`,
        );
        for (const want of [16, 32, 48]) {
          if (!entries.some((e) => e.width === want)) fails.push(`no ${want}x${want} entry`);
        }
        const e16 = entries.find((e) => e.width === 16);
        if (e16) ico16 = decodeIcoEntry(icoRes.body, e16);
      } catch (err) {
        fails.push(`unreadable ICO: ${err.message}`);
      }
    }
    record('1a. /favicon.ico is a real multi-size ICO', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 1b. icon.svg */
  {
    const r = await asset('icon.svg');
    const body = r.body.toString('utf8');
    const lines = [`GET /icon.svg -> ${r.status} ${r.type} ${r.body.length} bytes`];
    const fails = [];
    if (r.status !== 200) fails.push(`status ${r.status}`);
    if (!/image\/svg\+xml/.test(r.type))
      fails.push(`content-type ${r.type || '(none)'} is not image/svg+xml`);
    if (!/<svg/.test(body)) fails.push('body is not an SVG');
    if (!body.includes(GROUND)) fails.push(`SVG does not carry the ground token value ${GROUND}`);
    if (!body.includes(MARK)) fails.push(`SVG does not carry the mark token value ${MARK}`);
    const paths = (body.match(/<path/g) || []).length;
    lines.push(`  ${paths} glyph paths, ground ${GROUND}, mark ${MARK}`);
    if (paths !== 2) fails.push(`expected the monogram's 2 glyph paths, found ${paths}`);
    record('1b. /icon.svg is served as image/svg+xml', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 3. apple touch icon */
  {
    const r = await asset('apple-icon.png');
    const lines = [`GET /apple-icon.png -> ${r.status} ${r.type} ${r.body.length} bytes`];
    const fails = [];
    if (r.status !== 200) fails.push(`status ${r.status}`);
    else {
      const m = await sharp(r.body).metadata();
      lines.push(`  ${m.width}x${m.height} ${m.format}`);
      if (m.width < 180 || m.height < 180) fails.push(`${m.width}x${m.height} is under 180x180`);
    }
    record('3. apple-touch-icon is at least 180x180', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 4. the homepage's own <link> tags */
  if (!LOCAL) {
    const r = await get(BASE + '/');
    const html = r.body.toString('utf8');
    const links = html.match(/<link[^>]*rel="[^"]*icon[^"]*"[^>]*>/g) || [];
    const lines = [`GET ${BASE}/ -> ${r.status}`, `  ${links.length} icon <link> tags:`];
    for (const l of links) lines.push(`    ${l}`);
    const fails = [];
    for (const rel of ['icon', 'shortcut icon', 'apple-touch-icon']) {
      if (!links.some((l) => new RegExp(`rel="${rel}"`).test(l))) fails.push(`no rel="${rel}"`);
    }
    record('4. homepage carries icon, shortcut icon and apple-touch-icon', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 5. the dead 32px asset */
  {
    const r = await asset('favicon-32.png');
    const referenced = LOCAL
      ? false
      : /favicon-32\.png/.test((await get(BASE + '/')).body.toString('utf8'));
    const lines = [
      `GET /favicon-32.png -> ${r.status}`,
      `  referenced by the homepage: ${referenced}`,
    ];
    const fails = [];
    if (r.status === 200 && !referenced)
      fails.push('favicon-32.png is served but nothing references it — dead asset');
    record('5. no unreferenced icon asset is still served', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 2. colour of the served raster favicon */
  {
    const r = await asset('favicon.png');
    const px = await pixels(r.body);
    const { lines, fails } = checkColour(px, `/favicon.png ${px.w}x${px.h}`);
    record('2. raster favicon is drawn from the shipped palette', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  }

  /* 6. the render check, on the 16x16 ICO entry the browser actually uses */
  if (ico16) {
    const { lines, fails } = checkRender(ico16, 'favicon.ico 16x16 entry');
    record('6. both glyphs of HK are legible and separated at 16px', fails.length === 0, [
      ...lines,
      ...fails.map((f) => 'FAIL ' + f),
    ]);
  } else {
    record('6. both glyphs of HK are legible and separated at 16px', false, [
      'no 16x16 ICO entry to render',
    ]);
  }
}

async function selftest() {
  console.log(
    'SELFTEST — every assertion must FIRE on the retired icon and CLEAR on the shipped one.\n',
  );
  const fixture = path.join(ROOT, 'scripts/__tests__/fixtures/ui20-retired-favicon-b4326e.png');
  const shipped = path.join(ROOT, 'public/favicon.png');
  const icoBuf = readFileSync(path.join(ROOT, 'public/favicon.ico'));
  const e16 = readIco(icoBuf).find((e) => e.width === 16);

  const bad = await pixels(readFileSync(fixture));
  const good = await pixels(readFileSync(shipped));
  const badRender = await pixels(
    await sharp(readFileSync(fixture)).resize(16, 16, { kernel: 'lanczos3' }).png().toBuffer(),
  );
  const goodRender = decodeIcoEntry(icoBuf, e16);
  const copyW = (o) => o.w;

  // The positive control, first — the mutants below are cut from it, so its
  // geometry has to be read before anything is damaged.
  const truth = checkRender(goodRender, 'shipped@16');

  /** Copy the shipped 16x16 and change exactly one thing about it. */
  const mutate = (fn) => {
    const copy = { ...goodRender, data: Buffer.from(goodRender.data) };
    const set = (x, y, hexColour) => {
      const [r, g, b] = rgb(hexColour);
      const i = (y * copy.w + x) * copy.ch;
      copy.data[i] = r;
      copy.data[i + 1] = g;
      copy.data[i + 2] = b;
      copy.data[i + 3] = 255;
    };
    fn(set, truth.geom);
    return copy;
  };

  // Erases the crossbar and NOTHING else: the serif rows keep their ink, so
  // the H stays one connected column group and the crossbar assertion is the
  // one that has to catch it.
  const noCrossbar = mutate((set, g) => {
    for (const y of g.crossbarRows) for (let x = g.stemL + 1; x < g.stemR; x++) set(x, y, GROUND);
  });
  const filledCounter = mutate((set, g) => {
    for (const y of g.band) for (let x = g.stemL + 1; x < g.stemR; x++) set(x, y, MARK);
  });
  const flatK = mutate((set, g) => {
    // Make every row of the K identical to its widest row: same columns, same
    // ink, no diagonal. Nothing else about the tile moves.
    const K = g.groups[1];
    const widest = g.band.reduce(
      (best, y) => {
        let r = -1;
        for (let x = K.x0; x <= K.x1; x++) {
          const i = (y * goodRender.w + x) * goodRender.ch;
          if (goodRender.data[i] < 200) r = x;
        }
        return r > best.r ? { y, r } : best;
      },
      { y: g.band[0], r: -1 },
    ).y;
    for (const y of g.band) {
      for (let x = K.x0; x <= K.x1; x++) {
        const src = (widest * goodRender.w + x) * goodRender.ch;
        const i = (y * copyW(goodRender) + x) * goodRender.ch;
        void i;
        set(x, y, hex(goodRender.data[src], goodRender.data[src + 1], goodRender.data[src + 2]));
      }
    }
  });

  const cases = [
    ['colour  NEGATIVE control (retired #b4326e H)', checkColour(bad, 'fixture'), true],
    ['colour  POSITIVE control (shipped favicon.png)', checkColour(good, 'shipped'), false],
    ['render  NEGATIVE control (retired H at 16px)', checkRender(badRender, 'fixture@16'), true],
    ['render  NEGATIVE mutant: crossbar erased', checkRender(noCrossbar, 'no-crossbar@16'), true],
    [
      'render  NEGATIVE mutant: H counter filled',
      checkRender(filledCounter, 'filled-counter@16'),
      true,
    ],
    ['render  NEGATIVE mutant: K diagonal flattened', checkRender(flatK, 'flat-K@16'), true],
    ['render  POSITIVE control (shipped ICO 16x16)', truth, false],
  ];
  for (const [label, res, mustFail] of cases) {
    const fired = res.fails.length > 0;
    const ok = fired === mustFail;
    record(`selftest ${label}`, ok, [
      ...res.lines,
      `  assertions fired: ${res.fails.length}${res.fails.length ? ' -> ' + res.fails.join('; ') : ''}`,
      `  expected to ${mustFail ? 'FIRE' : 'CLEAR'} — ${ok ? 'it did' : 'IT DID NOT'}`,
    ]);
  }
}

if (SELFTEST) await selftest();
else await auditShipped();

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
if (failed.length) console.log('failed: ' + failed.map((f) => f.id).join(', '));
console.log(`FAVICON GATE EXIT: ${failed.length ? 1 : 0}`);
process.exit(failed.length ? 1 : 0);
