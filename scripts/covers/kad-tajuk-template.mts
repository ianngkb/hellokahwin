/**
 * `kad-tajuk` — the board-approved cover title card.
 *
 * Specified in `docs/plans/aug-23-2026-session-01/aug-24-2026-spec-graphic-template-kit.md`
 * §7 and ruled on by the Editorial Review Board of 24 Ogos 2026
 * (`docs/work-done/aug-23-2026-session-01/aug-24-2026-done-board-c24-cover-alt-text.md`).
 *
 * The ruling is short and it is on accuracy, not taste: **no cover in this batch
 * carries a ringgit figure.** On these eight articles the qualification IS the
 * fact — the true answer is usually `belum disahkan` or `tiada ketetapan`, and a
 * cover is the one surface that strips qualification on its way into WhatsApp.
 * The board recorded that this "is not the engineer's to reopen", so this file
 * does not reopen it. The skop lines, title lines and alt text are rendered
 * exactly as approved.
 *
 * ── One deviation from the spec, and the arithmetic for it ─────────────────
 * Spec §6.2 and §7.2 say to design the cover at **2464 × 700**, reasoning that a
 * 3.52:1 source is "width-constrained for every other target" so "each crop
 * takes the full width and a shorter slice of the height", and that the 4:5
 * mobile crop "takes the whole image".
 *
 * That is backwards, and `computeCropWindow` says so in its own comment — a
 * source WIDER than the target is HEIGHT-constrained:
 *
 *     if (imageWidth / imageHeight > targetRatio) {   // 3.52 > 0.8
 *       cropHeight = imageHeight;                     // 700
 *       cropWidth  = Math.round(cropHeight * targetRatio);  // 560
 *     }
 *
 * A 2464 × 700 card therefore yields a **560 × 700** mobile cover: a narrow
 * portrait slice through the middle of the title, at less than a third of the
 * 1920 × 2400 target, on the one surface this audience actually reads. Run
 * `--check-spec-geometry` to see it computed by the pipeline's own function.
 *
 * So the card is authored at **2464 × 3080** (4:5) instead, which is exactly the
 * mobile-cover ratio: that crop becomes the whole image, and the other three
 * come out at full target size. All of the type sits inside the centred
 * 1680 × 700 block that every crop keeps — which is the safe area §7.2 asks
 * for, placed against the geometry that actually holds.
 */
import sharp from 'sharp';
import { FONT_SANS, type BrandTokens } from './brand-tokens.mts';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DESKTOP_HERO_SAFE_X,
  measureText,
  wrap,
} from './cover-template.mts';

/** The centred 700px band every crop keeps when the focal point is 0.5, 0.5. */
const SAFE_TOP = 1190;
const SAFE_HEIGHT = 700;
const SAFE_BOTTOM = SAFE_TOP + SAFE_HEIGHT;
const SAFE_WIDTH = CANVAS_WIDTH - DESKTOP_HERO_SAFE_X * 2; // 1680
const CENTRE_X = CANVAS_WIDTH / 2;

export interface KadTajukSpec {
  /** Register id, HK-C-0001 … HK-C-0008. */
  id: string;
  /** Article slug — the filename is `<slug>-kad-tajuk.png`, per the board. */
  slug: string;
  file: string;
  draft: string;
  /** Board-approved skop line. Rendered exactly. */
  skop: string;
  /** Board-approved title line. Rendered exactly. */
  titleLine: string;
  /** Board-approved Malay alt text. Rendered into front matter exactly. */
  alt: string;
}

const DATE_STAMP = 'Disemak Ogos 2026';

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function centredText(
  text: string,
  o: { size: number; weight: number; letterSpacing: number; fill: string; baseline: number },
): string {
  return (
    `<text x="${CENTRE_X}" y="${Math.round(o.baseline * 100) / 100}" text-anchor="middle" ` +
    `font-family="${FONT_SANS}" font-size="${o.size}" font-weight="${o.weight}" ` +
    `letter-spacing="${o.letterSpacing}" fill="${o.fill}">${escapeXml(text)}</text>`
  );
}

export interface KadTajukResult {
  png: Buffer;
  layout: { titleSize: number; titleLines: number };
}

export async function renderKadTajuk(spec: KadTajukSpec, t: BrandTokens): Promise<KadTajukResult> {
  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" fill="${t.background}"/>`,
  );

  const skopStyle = {
    size: 84,
    family: FONT_SANS,
    weight: 400,
    letterSpacing: 4,
  };

  // Spec §3.2 bans a display serif in a graphic, so the card is sans throughout.
  // It also asks for embedded Geist; see the font finding in the work-done log —
  // librsvg resolves families from the host and cannot embed a face, so this
  // renders in the system sans stack `globals.css` itself declares.
  let titleSize = 0;
  let titleLines: string[] = [];
  for (const size of [216, 192, 168, 148, 132, 116]) {
    const lines = await wrap(
      spec.titleLine,
      { size, family: FONT_SANS, weight: 600, letterSpacing: -2 },
      SAFE_WIDTH,
    );
    if (lines.length <= 2) {
      titleSize = size;
      titleLines = lines;
      break;
    }
  }
  if (titleSize === 0) {
    throw new Error(
      `${spec.id}: title line "${spec.titleLine}" will not fit two lines at 116px. ` +
        'The strings are board-approved — take a change back to the board, do not trim it here.',
    );
  }

  const skopWidth = await measureText(spec.skop, skopStyle);
  if (skopWidth > SAFE_WIDTH) {
    throw new Error(
      `${spec.id}: skop line "${spec.skop}" overflows the ${SAFE_WIDTH}px safe area.`,
    );
  }

  // Stack: skop · brass rule · title. Centred in the safe band, with the date
  // stamp pinned to the foot of it — a shared screenshot loses its caption, so
  // the date has to travel inside the image (spec §9.1).
  const skopLineHeight = Math.round(skopStyle.size * 1.3);
  const ruleHeight = 8;
  const titleLineHeight = Math.round(titleSize * 1.14);
  const stackHeight = skopLineHeight + 44 + ruleHeight + 52 + titleLines.length * titleLineHeight;

  const dateBaseline = SAFE_BOTTOM - 62;
  const stackTop = SAFE_TOP + (SAFE_BOTTOM - 150 - SAFE_TOP - stackHeight) / 2;

  parts.push(
    centredText(spec.skop, {
      size: skopStyle.size,
      weight: 400,
      letterSpacing: 4,
      fill: t['muted-foreground'],
      baseline: stackTop + skopStyle.size * 0.8,
    }),
  );

  const ruleY = stackTop + skopLineHeight + 44;
  parts.push(
    `<rect x="${CENTRE_X - 130}" y="${ruleY}" width="260" height="${ruleHeight}" fill="${t['brand-secondary']}"/>`,
  );

  const titleTop = ruleY + ruleHeight + 52;
  titleLines.forEach((line, i) => {
    parts.push(
      centredText(line, {
        size: titleSize,
        weight: 600,
        letterSpacing: -2,
        fill: t.foreground,
        baseline: titleTop + titleSize * 0.8 + i * titleLineHeight,
      }),
    );
  });

  parts.push(
    centredText(DATE_STAMP, {
      size: 68,
      weight: 400,
      letterSpacing: 2,
      fill: t['muted-foreground'],
      baseline: dateBaseline,
    }),
  );

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" ` +
    `viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">${parts.join('')}</svg>`;

  const png = await sharp(Buffer.from(svg), { density: 144 })
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 })
    .toBuffer();

  return { png, layout: { titleSize, titleLines: titleLines.length } };
}

/**
 * Render one card at the spec's own 2464 × 700 and report what the pipeline
 * would cut from it. Exists so the geometry finding is reproducible rather than
 * asserted — see the header note.
 */
export async function checkSpecGeometry(): Promise<
  { name: string; window: string; output: string; target: string }[]
> {
  const { CROP_TARGETS, computeCropWindow } = await import('../../src/lib/storage/smart-crop');

  // The focal point §7.2 asks for. Even dead centre, the geometry does not hold.
  const focal = { x: 0.5, y: 0.5, method: 'faces' as const };

  return CROP_TARGETS.map((target) => {
    const w = computeCropWindow(2464, 700, target.aspectRatio, focal, null);
    const scale = Math.min(1, target.outputWidth / w.width, target.outputHeight / w.height);
    return {
      name: target.name,
      window: `${w.width}×${w.height} at ${w.left},${w.top}`,
      output: `${Math.round(w.width * scale)}×${Math.round(w.height * scale)}`,
      target: `${target.outputWidth}×${target.outputHeight}`,
    };
  });
}
