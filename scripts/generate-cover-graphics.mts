/**
 * Generate cover graphics from code, and a contact sheet to review them before
 * anything is ingested.
 *
 *   pnpm --silent covers --set p1,p6 --out "<drafts dir>"     # the P1 + P6 batch
 *   pnpm --silent covers --set c2-4  --out "<drafts dir>"     # the eight live C2.4 covers
 *   pnpm --silent covers --set p6 --only P6-1 --out "<dir>"   # one cover
 *   pnpm --silent covers --set all --out "<dir>"              # every registered set
 *   pnpm --silent covers --check-spec-geometry                # no writes, prints arithmetic
 *
 * `pnpm --silent`, not `pnpm run`: the runner echoes its resolved command line
 * as a banner, and that banner has already leaked a production password into a
 * transcript once. Nothing here carries a secret, but the habit is the point.
 *
 * ── `--set` is required, and that is the point of it ───────────────────────
 * This script used to default to the two C2.4 sets, which meant "render the
 * covers" and "render C2.4" were the same command. They are not the same thing
 * any more: four sets are registered below and more will follow, and a run that
 * guesses would quietly drop eight C2.4 PNGs into a P1 drafts folder. So the
 * caller names the set. Every value that worked before still works — `figures`,
 * `kad-tajuk` and `both` are unchanged, and `c2-4` is a new alias for the pair.
 *
 * ── The set register ───────────────────────────────────────────────────────
 * A set is a spec list plus the template that draws it, the credit string its
 * governing document fixes, and the words that introduce it on the sheet.
 * Adding a batch is adding a spec file and one entry in `SETS` — there is no
 * second generator and there is not going to be one.
 *
 *   figures    C2.4 — the generator brief of 24 Aug 2026. Every figure taken
 *              from the article it covers.
 *   kad-tajuk  C2.4 — graphic kit spec §7 plus the Editorial Review Board of
 *              24 Ogos 2026. A data-free title card. The two documents disagree
 *              and the disagreement is the CEO's to settle, so both render.
 *   p1         C1.1 + C1.2 — the nikah procedure cards.
 *   p6         C6.2 — the cost cards.
 *
 * When a figure changes, edit the spec file and re-run. Nothing here is
 * hand-drawn, so nothing here has to be redrawn.
 */
import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { loadBrandTokens, REQUIRED_TOKENS, type BrandTokens } from './covers/brand-tokens.mts';
import {
  renderCover,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DESKTOP_HERO_SAFE_X,
  type CoverSpec,
  type CoverRegion,
} from './covers/cover-template.mts';
import { COVER_SPECS } from './covers/c2-4-cover-specs.mts';
import {
  renderKadTajuk,
  checkSpecGeometry,
  type KadTajukSpec,
} from './covers/kad-tajuk-template.mts';
import { KAD_TAJUK_SPECS } from './covers/c2-4-kad-tajuk-specs.mts';
import { P1_COVER_SPECS } from './covers/p1-cover-specs.mts';
import { P6_COVER_SPECS } from './covers/p6-cover-specs.mts';
import { P1_BODY_SPECS } from './covers/p1-body-specs.mts';
import { P6_BODY_SPECS } from './covers/p6-body-specs.mts';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(HERE, '..');
const GLOBALS_CSS = join(REPO_ROOT, 'src', 'app', 'globals.css');

/** Fixed by the licence register and by every governing document. Not a per-cover call. */
const LICENSE_CLASS = 'G';
const LICENSOR_NAME = 'HelloKahwin';
/** The brief's credit standard — C2.4's brief, and this batch's brief too. */
const CREDIT_BRIEF = 'HelloKahwin';
/** The board's, ruling 4, and style guide §13.1 — `Grafik:` for our own graphics. */
const CREDIT_BOARD = 'Grafik: HelloKahwin';

// ── The set register ────────────────────────────────────────────────────────

interface FiguresSet {
  name: string;
  kind: 'figures';
  heading: string;
  lede: string;
  credit: string;
  specs: CoverSpec[];
}

interface KadTajukSet {
  name: string;
  kind: 'kad-tajuk';
  heading: string;
  lede: string;
  credit: string;
  specs: KadTajukSpec[];
}

type CoverSet = FiguresSet | KadTajukSet;

const SETS: CoverSet[] = [
  {
    name: 'kad-tajuk',
    kind: 'kad-tajuk',
    heading: 'C2.4, Set A &mdash; kad-tajuk, the board-approved data-free card',
    lede: 'Skop line, title line and alt text rendered exactly as approved at the board of 24 Ogos 2026.',
    credit: CREDIT_BOARD,
    specs: KAD_TAJUK_SPECS,
  },
  {
    name: 'figures',
    kind: 'figures',
    heading: 'C2.4, Set B &mdash; the state-figure cover the brief asked for',
    lede: 'Every figure taken from the article it covers. "Tiada kadar minimum ditetapkan" is rendered as a figure, not a blank.',
    credit: CREDIT_BRIEF,
    specs: COVER_SPECS,
  },
  {
    name: 'p1',
    kind: 'figures',
    heading: 'P1 &mdash; nikah procedure, clusters C1.1 and C1.2',
    lede:
      'Procedural, not numeric: the entity phrase plus the one or two facts that matter &mdash; which form, ' +
      'which authority, what the fee is and the date of the instrument that fixes it.',
    credit: CREDIT_BRIEF,
    specs: P1_COVER_SPECS,
  },
  {
    name: 'p6',
    kind: 'figures',
    heading: 'P6 &mdash; cost, cluster C6.2',
    lede:
      'A cost band: the two ends of the published range, and every rate attributed to the council that ' +
      'published it. Where an authority publishes no figure, the card says so.',
    credit: CREDIT_BRIEF,
    specs: P6_COVER_SPECS,
  },
  {
    name: 'p1-body',
    kind: 'figures',
    heading: 'P1 &mdash; in-article graphics, clusters C1.1 and C1.2',
    lede:
      'Body graphics, never smart-cropped. The subject of these four articles is a form number, a fee, ' +
      'a sequence and a list of conditions &mdash; none of which a photograph depicts.',
    credit: CREDIT_BOARD,
    specs: P1_BODY_SPECS,
  },
  {
    name: 'p6-body',
    kind: 'figures',
    heading: 'P6 &mdash; in-article graphics, cluster C6.2',
    lede:
      'Body graphics for the cost pages. Each one shows arithmetic a photograph cannot: what a published ' +
      'rate leaves out, which line is refundable, and which line has no official rate at all.',
    credit: CREDIT_BOARD,
    specs: P6_BODY_SPECS,
  },
];

/** Multi-set shorthands. `both` predates this register and is kept working. */
const SET_ALIASES: Record<string, string[]> = {
  both: ['kad-tajuk', 'figures'],
  'c2-4': ['kad-tajuk', 'figures'],
  all: SETS.map((s) => s.name),
};

const C2_4_SETS = ['kad-tajuk', 'figures'];

function resolveSetNames(value: string): string[] {
  const out: string[] = [];
  for (const raw of value
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)) {
    const alias = SET_ALIASES[raw];
    if (alias) {
      out.push(...alias);
      continue;
    }
    if (!SETS.some((s) => s.name === raw)) {
      throw new Error(
        `--set does not know "${raw}". Registered sets: ${SETS.map((s) => s.name).join(', ')}. ` +
          `Shorthands: ${Object.keys(SET_ALIASES).join(', ')}.`,
      );
    }
    out.push(raw);
  }
  return out;
}

interface Args {
  out: string;
  only: string | null;
  sets: string[];
  sheet: string | null;
  crops: boolean;
  checkSpecGeometry: boolean;
}

function parseArgs(argv: string[]): Args {
  let out = '';
  let only: string | null = null;
  let sheet: string | null = null;
  const sets: string[] = [];
  let crops = true;
  let checkGeometry = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--out') out = argv[++i] ?? '';
    else if (arg === '--only') only = (argv[++i] ?? '').toUpperCase();
    else if (arg === '--sheet') sheet = argv[++i] ?? '';
    else if (arg === '--no-crops') crops = false;
    else if (arg === '--check-spec-geometry') checkGeometry = true;
    else if (arg === '--set') sets.push(...resolveSetNames(argv[++i] ?? ''));
    else throw new Error(`Unknown argument: ${arg}`);
  }

  if (!out && !checkGeometry) {
    throw new Error(
      '--out <dir> is required. Point it at the folder holding the drafts, so each cover ' +
        'lands beside the article it covers (the ingest schema resolves `file` relative to the .md).',
    );
  }

  const unique = [...new Set(sets)];
  if (unique.length === 0 && !checkGeometry) {
    throw new Error(
      '--set <name> is required — this script no longer assumes C2.4. ' +
        `Registered sets: ${SETS.map((s) => s.name).join(', ')}. ` +
        `Shorthands: ${Object.keys(SET_ALIASES).join(', ')}. ` +
        'Example: --set p1,p6 --out "<drafts dir>"',
    );
  }

  return {
    out: out ? resolve(out) : '',
    only,
    // Register order, not command-line order, so the sheet reads the same way twice.
    sets: SETS.map((s) => s.name).filter((n) => unique.includes(n)),
    sheet,
    crops,
    checkSpecGeometry: checkGeometry,
  };
}

// ── Crop simulation ─────────────────────────────────────────────────────────

/** What a crop did to one named band of the composition. */
type RegionVerdict = 'penuh' | 'terpotong' | 'hilang';

interface CropPreview {
  name: string;
  left: number;
  top: number;
  width: number;
  height: number;
  outWidth: number;
  outHeight: number;
  full: boolean;
  /** Empty when the cover reported no regions (the kad-tajuk template does not). */
  verdicts: { region: string; verdict: RegionVerdict }[];
}

interface Rendered {
  set: string;
  id: string;
  file: string;
  draft: string;
  heading: string;
  alt: string;
  credit: string;
  notes: string;
  bytes: number;
  focal: { x: number; y: number; method: string } | null;
  crops: CropPreview[];
}

function judgeRegion(region: CoverRegion, top: number, height: number): RegionVerdict {
  const bottom = top + height;
  if (region.bottom <= top || region.top >= bottom) return 'hilang';
  if (region.top < top || region.bottom > bottom) return 'terpotong';
  return 'penuh';
}

async function simulateCrops(
  png: Buffer,
  regions: CoverRegion[],
): Promise<{ focal: { x: number; y: number; method: string }; crops: CropPreview[] }> {
  // The production geometry, imported from the pipeline rather than copied.
  const { CROP_TARGETS, computeCropWindow, detectSaliencyFocalPoint } =
    await import('../src/lib/storage/smart-crop');

  // `processSmartCrops` runs detection on a JPEG re-encode capped at 4096px.
  // Our canvas is under the cap, so this is the same buffer it would see.
  // Faces: none in a flat graphic. Rekognition labels need AWS credentials and
  // are optional in the pipeline (REKOGNITION_ENABLED=false falls straight
  // through), so saliency is the branch we can and should verify locally.
  const detectionBuffer = await sharp(png).jpeg({ quality: 90 }).toBuffer();
  const focal = await detectSaliencyFocalPoint(detectionBuffer);

  const crops: CropPreview[] = CROP_TARGETS.map((target) => {
    const window = computeCropWindow(CANVAS_WIDTH, CANVAS_HEIGHT, target.aspectRatio, focal, null);
    // The pipeline downscales the window to the target with `fit:'inside'`, and
    // never enlarges. Reaching the target's full size is the whole reason the
    // canvas is 2464 × 3080.
    const scale = Math.min(
      1,
      target.outputWidth / window.width,
      target.outputHeight / window.height,
    );
    return {
      name: target.name,
      left: window.left,
      top: window.top,
      width: window.width,
      height: window.height,
      outWidth: Math.round(window.width * scale),
      outHeight: Math.round(window.height * scale),
      full:
        Math.round(window.width * scale) === target.outputWidth &&
        Math.round(window.height * scale) === target.outputHeight,
      verdicts: regions.map((r) => ({
        region: r.name,
        verdict: judgeRegion(r, window.top, window.height),
      })),
    };
  });

  return { focal, crops };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function frontMatter(r: Rendered): string {
  return [
    'cover:',
    `  file: ./${r.file}`,
    `  alt: >-`,
    ...wrapForYaml(r.alt).map((line) => `    ${line}`),
    `  credit: ${r.credit}`,
    `  licenseClass: ${LICENSE_CLASS}`,
    `  licensorName: ${LICENSOR_NAME}`,
  ].join('\n');
}

/** Fold alt text the way the drafts' own front matter folds it. */
function wrapForYaml(text: string, width = 76): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.split(/\s+/)) {
    if (current && `${current} ${word}`.length > width) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function verdictLine(crop: CropPreview): string {
  const broken = crop.verdicts.filter((v) => v.verdict !== 'penuh');
  if (crop.verdicts.length === 0) return '<span class="meta">regions not reported</span>';
  if (broken.length === 0) return '<span class="ok">nothing cut</span>';
  return broken
    .map(
      (v) =>
        `<span class="${v.verdict === 'hilang' ? 'warn' : 'part'}">${v.verdict === 'hilang' ? 'lost' : 'cut'}: ${escapeHtml(v.region)}</span>`,
    )
    .join('<br />');
}

function coverCard(r: Rendered): string {
  const crops = r.crops
    .map((c) => {
      const boxWidth = 300;
      const scale = boxWidth / c.width;
      return `
          <figure class="crop">
            <div class="crop-window" style="width:${boxWidth}px;height:${Math.round(c.height * scale)}px">
              <img src="./${escapeHtml(r.file)}" alt=""
                   style="width:${Math.round(CANVAS_WIDTH * scale)}px;
                          margin-left:${-Math.round(c.left * scale)}px;
                          margin-top:${-Math.round(c.top * scale)}px" />
            </div>
            <figcaption>
              <strong>${escapeHtml(c.name)}</strong><br />
              ${c.outWidth}&times;${c.outHeight}
              <span class="${c.full ? 'ok' : 'warn'}">${c.full ? 'full size' : 'UNDERSIZED'}</span><br />
              ${verdictLine(c)}
            </figcaption>
          </figure>`;
    })
    .join('');

  return `
    <section class="cover">
      <header>
        <h2>${escapeHtml(r.id)} &middot; ${escapeHtml(r.heading)}</h2>
        <p class="meta">
          <code>${escapeHtml(r.file)}</code> &middot;
          ${CANVAS_WIDTH}&times;${CANVAS_HEIGHT} PNG &middot;
          ${(r.bytes / 1024).toFixed(0)} KB &middot;
          covers <code>${escapeHtml(r.draft)}</code>
        </p>
      </header>
      <div class="body">
        <a class="plate" href="./${escapeHtml(r.file)}">
          <img src="./${escapeHtml(r.file)}" alt="${escapeHtml(r.alt)}" />
        </a>
        <div class="detail">
          <h3>Alt text (Malay)</h3>
          <p class="alt">${escapeHtml(r.alt)}</p>

          <h3>Front matter for ingest</h3>
          <pre>${escapeHtml(frontMatter(r))}</pre>

          <h3>What the crop pipeline would produce</h3>
          <p class="meta">
            focal point
            ${r.focal ? `${r.focal.x.toFixed(3)}, ${r.focal.y.toFixed(3)} (${escapeHtml(r.focal.method)})` : 'not simulated'}
            &middot; ${escapeHtml(r.notes)}
          </p>
          <div class="crops">${crops}</div>
        </div>
      </div>
    </section>`;
}

/** Every band any crop damaged, across every cover in the run. */
function cropVerdictPanel(rendered: Rendered[]): string {
  const rows: string[] = [];
  for (const r of rendered) {
    for (const c of r.crops) {
      const broken = c.verdicts.filter((v) => v.verdict !== 'penuh');
      if (broken.length === 0) continue;
      rows.push(
        `<tr><td><code>${escapeHtml(r.id)}</code></td><td><code>${escapeHtml(c.name)}</code></td>` +
          `<td>${broken.map((v) => `${v.verdict === 'hilang' ? 'lost' : 'cut'} <strong>${escapeHtml(v.region)}</strong>`).join('; ')}</td></tr>`,
      );
    }
  }

  const analysed = rendered.some((r) => r.crops.some((c) => c.verdicts.length > 0));
  if (!analysed) return '';

  return `
  <div class="panel">
    <h2>What each crop breaks</h2>
    <p class="meta" style="margin:0 0 12px">
      Every target except <code>crop-4x5-mobile-cover</code> is wider than 4:5, so
      <code>computeCropWindow</code> makes this canvas width-constrained and each crop takes the FULL
      width and a shorter slice of the height. What a crop destroys is therefore always a horizontal
      band, and the table names it. <strong>cut</strong> = the band is sliced through;
      <strong>lost</strong> = the band is outside the window entirely. Rows are only listed where
      something broke; a cover absent from this table survives all four crops whole.
    </p>
    ${
      rows.length === 0
        ? '<p class="meta" style="margin:0"><span class="ok">No crop cut or lost a band on any cover in this run.</span></p>'
        : `<table class="geo"><tr><th>cover</th><th>crop</th><th>what broke</th></tr>${rows.join('')}</table>`
    }
  </div>`;
}

function contactSheet(
  rendered: Rendered[],
  tokens: BrandTokens,
  specGeometry: { name: string; window: string; output: string; target: string }[],
  setNames: string[],
  title: string,
): string {
  const palette = REQUIRED_TOKENS.map(
    (name) =>
      `<li><span class="swatch" style="background:${tokens[name]}"></span><code>--${name}</code> ${tokens[name]}</li>`,
  ).join('');

  const geometryRows = specGeometry
    .map(
      (g) =>
        `<tr><td><code>${escapeHtml(g.name)}</code></td><td>${escapeHtml(g.window)}</td>` +
        `<td>${escapeHtml(g.output)}</td><td>${escapeHtml(g.target)}</td>` +
        `<td class="${g.output === g.target ? 'ok' : 'warn'}">${g.output === g.target ? 'ok' : 'undersized'}</td></tr>`,
    )
    .join('');

  const section = (set: CoverSet) => {
    const items = rendered.filter((r) => r.set === set.name);
    if (items.length === 0) return '';
    return `
  <div class="setblock">
    <h2 class="setheading">${set.heading}</h2>
    <p class="lede">${set.lede}</p>
    ${items.map(coverCard).join('')}
  </div>`;
  };

  const hasC24 = setNames.some((n) => C2_4_SETS.includes(n));

  const c24Panels = !hasC24
    ? ''
    : `
  <div class="panel decision">
    <h2>The decision this sheet is asking for &mdash; C2.4 only</h2>
    <p style="margin:0 0 12px">
      Two approved documents specify the C2.4 cover and they do not agree, so both are rendered below.
    </p>
    <ol class="findings">
      <li><strong>Set A — <code>kad-tajuk</code>, data-free.</strong> Graphic kit spec §7 plus the
        Editorial Review Board of 24 Ogos 2026. Skop lines, title lines and alt text are rendered
        exactly as approved. The board's words: <em>"No cover in this batch carries a ringgit figure.
        That is a board ruling on accuracy, not a design preference, and it is not the engineer's to
        reopen."</em> Its reasoning is that on those eight articles the qualification IS the fact —
        the true answer is usually <em>belum disahkan</em> or <em>tiada ketetapan</em>, and a cover is
        the one surface that strips qualification on its way into WhatsApp.</li>
      <li><strong>Set B — the state-figure cover.</strong> The generator brief of 24 Aug 2026. Every
        figure taken from the article it covers, nothing carried across drafts, "tiada kadar minimum
        ditetapkan" rendered as a figure rather than a blank.</li>
      <li><strong>Which is later.</strong> The board sat with the brief in front of it, quoted the
        brief's own tie-break — <em>"If a draft and this table disagree, the draft wins and you tell
        me"</em> — and found four of the brief's eight rows disagree with their drafts. On that
        reading the ruling supersedes the brief. That is the CEO's call, not the engineer's.</li>
    </ol>
  </div>

  <div class="panel">
    <h2>Read this before deciding &mdash; C2.4 findings</h2>
    <ol class="findings">
      <li><strong>The framing is not ours to choose yet.</strong> The pipeline centres every crop on a
        detected focal point, and <code>ingest-article.mts</code> passes no
        <code>focalPointOverride</code> — so a flat graphic falls through to sharp's saliency, which
        lands where it likes. The crops shown are the real ones.
        <code>processSmartCrops</code> already accepts the override and spec §7.2 asks for
        <code>{x: 0.5, y: 0.5}</code>; wiring the article file to it is a separate, one-file change,
        and it is what makes either set frame predictably.</li>
      <li><strong>The desktop hero crops twice.</strong> <code>page.tsx</code> drops the 3.52:1 strip
        into an <code>aspect-[2.4/1]</code> box with <code>object-cover</code>, showing only the
        centre 68% of its width — x ${DESKTOP_HERO_SAFE_X}&hellip;${CANVAS_WIDTH - DESKTOP_HERO_SAFE_X}.
        The mobile cover, article card and OG image all show the full width.</li>
      <li><strong>Two crop names lie about their ratio.</strong>
        <code>crop-4.3x1-desktop-hero</code> is 3.52:1 and <code>crop-16x9-og</code> is 1.905:1. Both
        are load-bearing R2 object keys, so neither was touched.</li>
      <li><strong>Nothing warns about an undersized cover.</strong> The crop targets are ceilings, not
        floors: an undersized source is silently left small and the smaller number is written into
        <code>coverImageSmartCrops</code>. There is no minimum-dimension check anywhere in the
        pipeline. The exact minimum that fills all four targets is 2464&times;2400.</li>
      <li><strong>The credit string differs between the two documents.</strong> The brief fixes
        <code>credit: HelloKahwin</code>; board ruling 4 and style guide §13.1 fix
        <code>credit: "Grafik: HelloKahwin"</code>. Each set below carries its own document's value.</li>
      <li><strong>A5 Perak has no figure, and that is the finding.</strong> The brief's table asks for
        "Perak's figure"; the draft says no minimum is set at all and the gazette carries a blank
        field, not a number. The only Perak number in the article is RM101, which the article exists
        to debunk.</li>
      <li><strong>A3 Johor's RM22.50 is not a current minimum.</strong> The draft flags it "belum
        disahkan sebagai kadar semasa" and records a UiTM reading of it as a <em>maximum</em>.</li>
      <li><strong>A1 and A7 disagree about Sabah and Sarawak.</strong> A1's table lists RM100 and
        RM120 flagged "belum disahkan"; A7 states plainly that neither state sets a minimum. Each
        cover follows its own article, as instructed. Someone should reconcile the two before
        publication.</li>
      <li><strong>Fonts.</strong> Spec §3.2 asks for Geist and Geist Mono embedded in the rasteriser.
        sharp rasterises SVG through librsvg, which resolves families from the host and cannot embed
        a face; the only Geist files in the repo are inside Next's devtools bundle. Both sets render
        in the system sans stack <code>globals.css</code> itself declares. Embedding would mean adding
        satori + resvg-js.</li>
    </ol>
  </div>`;

  return `<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${escapeHtml(title)}</title>
<style>
  :root { color-scheme: light; }
  body { margin:0; padding:48px 32px 96px; font:16px/1.6 -apple-system,'Segoe UI',Roboto,sans-serif;
         background:${tokens.background}; color:${tokens.foreground}; }
  .wrap { max-width:1400px; margin:0 auto; }
  h1 { font-family:Georgia,serif; font-weight:400; font-size:2.25rem; margin:0 0 8px; letter-spacing:-.02em; }
  .lede { color:${tokens['muted-foreground']}; max-width:80ch; margin:0 0 32px; }
  .panel { background:${tokens['surface-subtle']}; border:1px solid ${tokens.hairline};
           border-radius:8px; padding:20px 24px; margin:0 0 32px; }
  .panel.decision { border-left:6px solid ${tokens.primary}; }
  .panel h2 { font-size:.8rem; letter-spacing:.12em; text-transform:uppercase; margin:0 0 12px;
              color:${tokens['muted-foreground']}; }
  .panel ul.palette { margin:0; padding:0; list-style:none; display:grid;
              grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:6px; font-size:.85rem; }
  .swatch { display:inline-block; width:16px; height:16px; border-radius:3px; vertical-align:-3px;
            margin-right:8px; border:1px solid ${tokens.hairline}; }
  .findings { margin:0; padding-left:20px; font-size:.9rem; color:${tokens['muted-foreground']}; }
  .findings li { margin-bottom:10px; }
  .findings strong { color:${tokens.foreground}; }
  table.geo { border-collapse:collapse; font-size:.82rem; width:100%; }
  table.geo th, table.geo td { border:1px solid ${tokens.hairline}; padding:6px 10px; text-align:left; }
  table.geo th { color:${tokens['muted-foreground']}; font-weight:600; }
  .setheading { font-family:Georgia,serif; font-weight:400; font-size:1.9rem; margin:56px 0 6px;
                padding-bottom:10px; border-bottom:3px solid ${tokens.primary}; }
  section.cover { border-top:1px solid ${tokens.hairline}; padding-top:20px; margin:0 0 48px; }
  section.cover h2 { font-family:Georgia,serif; font-weight:400; font-size:1.4rem; margin:0 0 4px; }
  .meta { color:${tokens['muted-foreground']}; font-size:.85rem; margin:0 0 16px; }
  .body { display:grid; grid-template-columns:minmax(240px,340px) 1fr; gap:32px; align-items:start; }
  .plate img { width:100%; height:auto; display:block; border:1px solid ${tokens.hairline}; }
  .detail h3 { font-size:.75rem; letter-spacing:.12em; text-transform:uppercase;
               color:${tokens['muted-foreground']}; margin:0 0 6px; }
  .detail h3 + * { margin-top:0; }
  .detail > * + h3 { margin-top:24px; }
  .alt { background:${tokens['surface-subtle']}; border-left:3px solid ${tokens['brand-secondary']};
         padding:10px 14px; margin:0; }
  pre { background:${tokens['surface-subtle']}; border:1px solid ${tokens.hairline}; border-radius:6px;
        padding:12px 14px; overflow-x:auto; font-size:.8rem; margin:0; white-space:pre-wrap; }
  .crops { display:flex; flex-wrap:wrap; gap:20px; }
  .crop { margin:0; }
  .crop-window { overflow:hidden; border:1px solid ${tokens.hairline}; background:#fff; }
  .crop-window img { display:block; }
  figcaption { font-size:.72rem; color:${tokens['muted-foreground']}; margin-top:6px; line-height:1.4;
               max-width:300px; }
  .ok { color:${tokens['brass-deep']}; }
  .part { color:#8a5a00; }
  .warn { color:#b3261e; font-weight:700; }
  @media (max-width:900px) { .body { grid-template-columns:1fr; } }
</style>
</head>
<body>
<div class="wrap">
  <h1>${escapeHtml(title)}</h1>
  <p class="lede">
    Nothing here has been ingested or published. Each plate is shown whole, then as the four crops
    the pipeline would actually cut from it, at the focal point it would actually detect.
    Sets in this run: <code>${escapeHtml(setNames.join(', '))}</code>.
  </p>
${c24Panels}
${cropVerdictPanel(rendered)}
  <div class="panel">
    <h2>The spec's cover geometry does not hold — 2464 &times; 700 breaks the mobile cover</h2>
    <p class="meta" style="margin:0 0 12px">
      Spec §6.2 and §7.2 say to author the cover at 2464&times;700, reasoning that a 3.52:1 source is
      "width-constrained for every other target" and that the 4:5 crop "takes the whole image".
      It is the other way round: <code>computeCropWindow</code> makes a source wider than the target
      <em>height</em>-constrained. Below is the pipeline's own function run on a 2464&times;700 source
      with the focal point §7.2 asks for (0.5, 0.5).
    </p>
    <table class="geo">
      <tr><th>crop</th><th>window taken</th><th>output</th><th>target</th><th></th></tr>
      ${geometryRows}
    </table>
    <p class="meta" style="margin:12px 0 0">
      The mobile cover — the surface this audience reads on — comes out a 560&times;700 portrait slice
      through the middle of the title, under a third of its target. Everything below is authored at
      2464&times;3080 (4:5) instead, where that crop is the whole image and the other three come out
      at full target size.
    </p>
  </div>

  <div class="panel">
    <h2>Brand tokens, read from src/app/globals.css at render time</h2>
    <ul class="palette">${palette}</ul>
  </div>
${SETS.filter((s) => setNames.includes(s.name))
  .map(section)
  .join('')}
</div>
</body>
</html>
`;
}

/** `C2-4-covers-contact-sheet.html` for the C2.4 pair, `p1-p6-…` otherwise. */
function sheetFileName(setNames: string[]): string {
  const slug = setNames.every((n) => C2_4_SETS.includes(n)) ? 'C2-4' : setNames.join('-');
  return `${slug}-covers-contact-sheet.html`;
}

function sheetTitle(setNames: string[]): string {
  if (setNames.every((n) => C2_4_SETS.includes(n))) {
    return 'C2.4 cover graphics — eight articles, two candidate sets';
  }
  return `Cover graphics — contact sheet (${setNames.join(', ')})`;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  const specGeometry = await checkSpecGeometry();
  if (args.checkSpecGeometry) {
    console.log('\nGraphic kit spec §6.2/§7.2 says author covers at 2464 × 700.');
    console.log("Run through the pipeline's own computeCropWindow, focal point 0.5/0.5:\n");
    for (const g of specGeometry) {
      const verdict = g.output === g.target ? 'ok' : 'UNDERSIZED';
      console.log(
        `  ${g.name.padEnd(26)} window ${g.window.padEnd(22)} → ${g.output.padEnd(11)} target ${g.target.padEnd(11)} ${verdict}`,
      );
    }
    if (!args.out) return;
  }

  const tokens = await loadBrandTokens(GLOBALS_CSS);
  console.log(`\nBrand tokens read from ${GLOBALS_CSS}`);
  for (const name of REQUIRED_TOKENS) console.log(`  --${name.padEnd(22)} ${tokens[name]}`);

  await mkdir(args.out, { recursive: true });
  console.log(`\nWriting into ${args.out}`);
  console.log(`Sets: ${args.sets.join(', ')}\n`);

  const rendered: Rendered[] = [];

  const record = async (
    partial: Omit<Rendered, 'focal' | 'crops'>,
    png: Buffer,
    regions: CoverRegion[],
  ) => {
    let focal: Rendered['focal'] = null;
    let crops: CropPreview[] = [];
    if (args.crops) {
      const simulated = await simulateCrops(png, regions);
      focal = simulated.focal;
      crops = simulated.crops;
    }
    rendered.push({ ...partial, focal, crops });

    const undersized = crops.filter((c) => !c.full).map((c) => c.name);
    console.log(
      `  ${partial.id.padEnd(10)} ${partial.file.padEnd(46)} ${(png.length / 1024).toFixed(0).padStart(4)} KB  ` +
        `${partial.notes}` +
        (focal ? `  focal ${focal.x.toFixed(3)},${focal.y.toFixed(3)}` : ''),
    );
    if (undersized.length > 0) {
      console.warn(`      UNDERSIZED CROPS: ${undersized.join(', ')} — raise the canvas.`);
    }
    for (const crop of crops) {
      const broken = crop.verdicts.filter((v) => v.verdict !== 'penuh');
      if (broken.length === 0) continue;
      console.warn(
        `      ${crop.name} → ` +
          broken.map((v) => `${v.verdict === 'hilang' ? 'LOST' : 'cut'} ${v.region}`).join(' · '),
      );
    }
  };

  for (const set of SETS.filter((s) => args.sets.includes(s.name))) {
    console.log(`Set ${set.name}`);

    if (set.kind === 'kad-tajuk') {
      const specs = args.only
        ? set.specs.filter((s) => s.id === args.only || s.draft.startsWith(args.only))
        : set.specs;
      for (const spec of specs) {
        const { png, layout } = await renderKadTajuk(spec, tokens);
        await writeFile(join(args.out, spec.file), png);
        await record(
          {
            set: set.name,
            id: spec.id,
            file: spec.file,
            draft: spec.draft,
            heading: `${spec.skop} · ${spec.titleLine}`,
            alt: spec.alt,
            credit: set.credit,
            notes: `title ${layout.titleSize}px on ${layout.titleLines} line(s)`,
            bytes: png.length,
          },
          png,
          [],
        );
      }
    } else {
      const specs = args.only ? set.specs.filter((s) => s.id === args.only) : set.specs;
      for (const spec of specs) {
        const { png, layout } = await renderCover(spec, tokens);
        await writeFile(join(args.out, spec.file), png);
        await record(
          {
            set: set.name,
            id: spec.id,
            file: spec.file,
            draft: spec.draft,
            heading: spec.title,
            alt: spec.alt,
            credit: set.credit,
            notes:
              `body ${layout.rowSize}px (≈${(layout.rowSize * 0.158).toFixed(0)}px on a 390px phone), ` +
              `figures ${layout.figureSizes.join('/')}px`,
            bytes: png.length,
          },
          png,
          layout.regions,
        );
      }
    }
    console.log('');
  }

  const sheetPath = join(args.out, args.sheet || sheetFileName(args.sets));
  await writeFile(
    sheetPath,
    contactSheet(rendered, tokens, specGeometry, args.sets, sheetTitle(args.sets)),
    'utf8',
  );
  console.log(`Contact sheet: ${sheetPath}`);
  console.log('Nothing was ingested and nothing was published.');
}

main().catch((error: unknown) => {
  console.error(`\n${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
