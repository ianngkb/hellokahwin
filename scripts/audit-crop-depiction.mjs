/**
 * CONT-15 — THE CONTACT SHEET. Renders every stored crop beside the frame it
 * was cut from, so a human can answer the one question no measurement can.
 *
 *   node scripts/audit-crop-depiction.mjs --crop crop-4x3-article-card-md
 *   node scripts/audit-crop-depiction.mjs --crop crop-16x9-og --portrait-only
 *   node scripts/audit-crop-depiction.mjs --crop crop-4x3-article-card-md --out sheet.png
 *   node scripts/audit-crop-depiction.mjs --crop … --slug tempat-beli-hantaran --slug doa-selamat-majlis
 *
 * Needs `DATABASE_URL`; run it as `node --env-file=.env scripts/audit-crop-depiction.mjs …`.
 * It READS ONLY — no DB write, no R2 write, no network call except GETs of
 * public image URLs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS EXISTS, AND WHY IT IS A SCRIPT RATHER THAN A RULE IN A DOCUMENT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The company already had the rule. It is written down twice — in the standing
 * image rules and in the Creative Director's own brief — as: a cover must depict
 * its subject, and a crop can break that while every number stays green.
 *
 * It did not fire. On 02 September 2026 the article cover moved to a named
 * 792x594 4:3 crop (UI-16). Every instrument the company owns went green:
 * `image-aspect` 0, `image-upscale` 0, `image-attr-aspect` 0 on the cover,
 * `shaped-slot-variant` 0. The gate was RIGHT — the shape defect really was
 * fixed. And of the fifteen portrait covers it re-cut, THREE stopped depicting
 * their subject:
 *
 *   baju-pengantin-sewa-atau-beli   an article about renting or buying the
 *                                   BAJU — the crop keeps the face and cuts
 *                                   the outfit out of frame entirely
 *   doa-selamat-majlis              an imam reading before a congregation
 *                                   becomes a macro of a lattice screen with
 *                                   the top of a songkok at the bottom edge
 *   hantaran-tunang-3-balas-5       a ring in a decorated box becomes an
 *                                   abstract band of gold beads; the ring is
 *                                   outside the frame
 *
 * ── THE MEASUREMENT THAT WAS SUPPOSED TO CATCH THIS, AND WHY IT DID NOT ──────
 *
 * UI-03 established the retained-frame fraction: cropping a source of aspect
 * `s` into a target of aspect `t` keeps `s / t` of the photograph when `s < t`.
 * It recorded a floor of roughly one third — below that, a crop stops being a
 * photograph of its subject and becomes a texture. That number came from a
 * 3.52:1 hero window on a 2:3 portrait, which keeps 18.9%.
 *
 * Every one of these three crops retains **50.0%** — 0.667 / 1.333, and the whole
 * set of fifteen spans 50.0-56.4%: all clear of the floor. The floor is not
 * wrong; it is not sufficient. Retention is a
 * measure of AREA, and depiction is a question about WHERE THE SUBJECT IS. A
 * portrait photograph of a standing person, a signboard, or an object in a box
 * distributes its subject along the axis the crop cuts. Half of such a frame can
 * contain none of it, while half of a flatlay contains all of it — which is why
 * five of the same fifteen crops came out BETTER than their sources
 * (mas-kahwin-pahang-negeri-sembilan and mas-kahwin-melebihi-kadar-minimum both
 * made an unreadable signboard readable).
 *
 * So no threshold on retention can decide this, and any threshold strict enough
 * to catch these three would reject the five it improved. **The check is a
 * human looking at the pictures.** What a script can do — the only thing it can
 * do — is make looking cost one command instead of an afternoon, and put the
 * source beside the crop so the question is answerable at a glance.
 *
 * Run it whenever a crop target is added, its geometry moves, or a backfill
 * re-cuts a corpus. It prints the retained fraction next to each pair, but the
 * number is context for your eye, not a verdict.
 */
import { writeFileSync } from 'node:fs';
import postgres from 'postgres';
import sharp from 'sharp';

const argv = process.argv.slice(2);
const has = (n) => argv.includes(`--${n}`);
const opt = (n, d) => (has(n) ? argv[argv.indexOf(`--${n}`) + 1] : d);
const many = (n) => argv.reduce((a, v, i) => (v === `--${n}` ? [...a, argv[i + 1]] : a), []);

const CROP = opt('crop');
const OUT = opt('out', 'crop-depiction-sheet.png');
const ONLY = many('slug');
const PORTRAIT_ONLY = has('portrait-only');
const COLS = Number(opt('cols', 3));

if (!CROP) {
  console.error(
    'Refusing to run: --crop <name> is required. It is the key inside\n' +
      '`cover_image_smart_crops`, e.g. crop-4x3-article-card-md, crop-16x9-og.\n' +
      'Defaulting it would silently sheet whichever crop happened to be first.',
  );
  process.exit(2);
}
if (!process.env.DATABASE_URL) {
  console.error('Refusing to run: DATABASE_URL is unset. Use `node --env-file=.env …`.');
  process.exit(2);
}

const sql = postgres(process.env.DATABASE_URL, {
  prepare: false,
  ssl: { rejectUnauthorized: false },
  connect_timeout: 20,
  max: 1,
});

const rows = await sql`
  select slug, cover_image_variants, cover_image_smart_crops
    from articles
   where status = 'published'
     and cover_image_smart_crops is not null
   order by slug`;
await sql.end();

// Cell geometry. The source is drawn at the SAME HEIGHT as the crop so the two
// are comparable by eye; its width follows its own aspect, which is what makes
// a portrait source visibly taller-and-narrower rather than squashed.
const CH = 240; // both cells share this height
const CW = 320; // the crop cell — resized to fit, never stretched
const PAD = 10;
const LBL = 26;

const picked = [];
for (const r of rows) {
  if (ONLY.length && !ONLY.includes(r.slug)) continue;
  const crop = r.cover_image_smart_crops?.[CROP];
  const low = r.cover_image_variants?.low;
  if (!crop?.url) {
    console.log(`  no ${CROP.padEnd(28)} ${r.slug}`);
    continue;
  }
  if (!low?.url) {
    console.log(`  no low.url                    ${r.slug}`);
    continue;
  }
  const sw = low.width ?? null;
  const sh = low.height ?? null;
  const srcAspect = sw && sh ? sw / sh : null;
  const cropAspect = crop.width && crop.height ? crop.width / crop.height : null;
  if (PORTRAIT_ONLY && !(srcAspect !== null && srcAspect < 1)) continue;
  picked.push({ slug: r.slug, low, crop, srcAspect, cropAspect, sw, sh });
}

if (!picked.length) {
  console.error(
    `\nNothing to sheet. That is a claim about this query, not about the corpus —\n` +
      `${rows.length} published rows carry smart crops. Check the --crop name against\n` +
      `a real key before concluding a rendition is missing.`,
  );
  process.exit(1);
}

// Two passes: fetch and decode first so a cell's true source width is known
// before the sheet is sized. A grid laid out from an assumed width is how a
// contact sheet ends up with the thing you needed to see running off the edge.
const cells = [];
for (const p of picked) {
  const [srcBuf, cropBuf] = await Promise.all([
    fetch(p.low.url)
      .then((r) => r.arrayBuffer())
      .then(Buffer.from),
    fetch(p.crop.url)
      .then((r) => r.arrayBuffer())
      .then(Buffer.from),
  ]);
  const srcMeta = await sharp(srcBuf).metadata();
  const cropMeta = await sharp(cropBuf).metadata();
  const sAspect = srcMeta.width / srcMeta.height;
  const cAspect = cropMeta.width / cropMeta.height;
  const sw = Math.max(1, Math.round(CH * sAspect));
  const cw = Math.min(CW, Math.max(1, Math.round(CH * cAspect)));
  cells.push({
    ...p,
    srcPng: await sharp(srcBuf).resize(sw, CH, { fit: 'fill' }).png().toBuffer(),
    cropPng: await sharp(cropBuf).resize(cw, CH, { fit: 'fill' }).png().toBuffer(),
    sw,
    cw,
    srcDims: `${srcMeta.width}x${srcMeta.height}`,
    cropDims: `${cropMeta.width}x${cropMeta.height}`,
    retained: sAspect < cAspect ? sAspect / cAspect : cAspect / sAspect,
  });
}

const cellW = Math.max(...cells.map((c) => c.sw + PAD + c.cw));
const cellH = CH + LBL;
const rowsN = Math.ceil(cells.length / COLS);
const W = COLS * (cellW + PAD) + PAD;
const H = rowsN * (cellH + PAD) + PAD;

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const layers = [];
cells.forEach((c, i) => {
  const x = PAD + (i % COLS) * (cellW + PAD);
  const y = PAD + Math.floor(i / COLS) * (cellH + PAD);
  layers.push({ input: c.srcPng, left: x, top: y + LBL });
  layers.push({ input: c.cropPng, left: x + c.sw + PAD, top: y + LBL });
  const label = `${i + 1}. ${c.slug}  ${c.srcDims} → ${c.cropDims}  ${(c.retained * 100).toFixed(1)}% kept`;
  layers.push({
    input: Buffer.from(
      `<svg width="${cellW}" height="${LBL}"><text x="0" y="17" font-family="Segoe UI, Arial, sans-serif" font-size="13" fill="#111111">${esc(label)}</text></svg>`,
    ),
    left: x,
    top: y,
  });
  console.log(
    `${String(i + 1).padStart(3)}. ${c.slug.padEnd(38)} ${c.srcDims.padEnd(11)} -> ${c.cropDims.padEnd(11)} ${(c.retained * 100).toFixed(1)}% kept`,
  );
});

const png = await sharp({ create: { width: W, height: H, channels: 3, background: '#ffffff' } })
  .composite(layers)
  .png()
  .toBuffer();
writeFileSync(OUT, png);

console.log(
  `\n${cells.length} pair(s) -> ${OUT}  ${W}x${H}\n` +
    `LEFT of each pair is the source frame, RIGHT is the stored ${CROP}.\n\n` +
    `NOW OPEN IT. The percentage is context, not a verdict: on this corpus three\n` +
    `crops at 50.0% retention stopped depicting their subject while five others at\n` +
    `the same 50.0% came out better than their sources. Ask of each pair only:\n` +
    `does the right-hand image still show what the article is about?`,
);
