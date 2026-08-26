/**
 * ONE cover template: the mas kahwin state-figure cover.
 *
 * A parameterised SVG composition rasterised by sharp (librsvg). No new
 * dependency — sharp is already a production dependency and already rasterises
 * SVG on the ingest path.
 *
 * ── Why 2464 × 3080 ────────────────────────────────────────────────────────
 * The crop pipeline (`src/lib/storage/smart-crop.ts`) treats each target's
 * dimensions as a CEILING, not a floor: `fit:'inside' + withoutEnlargement`
 * means an undersized source is silently left small and the smaller number is
 * written into `coverImageSmartCrops`. Nothing in the codebase warns about it.
 * So the source has to be big enough for all four targets by construction:
 *
 *   crop-4x5-mobile-cover    1920 × 2400   needs W ≥ 1920, H ≥ 2400
 *   crop-4.3x1-desktop-hero  2464 ×  700   needs W ≥ 2464, H ≥  700
 *   crop-4x3-article-card    1600 × 1200   needs W ≥ 1600, H ≥ 1200
 *   crop-16x9-og             1200 ×  630   needs W ≥ 1200, H ≥  630
 *
 * The exact minimum is 2464 × 2400. We use 2464 × 3080 instead, because 4:5 is
 * the mobile-cover ratio: at exactly 4:5 the mobile crop window IS the whole
 * image, so nothing a phone reader needs is ever cropped away. `crop-4x5` is
 * the surface this audience actually reads on — `article-cover-mobile.tsx`
 * renders it full-bleed at `aspect-[4/5]`, `sizes="100vw"`.
 *
 * ── The plum plate, and why the composition is built around a moving crop ──
 * The desktop hero takes a 2464 × 700 slice centred on the detected focal
 * point. A flat graphic has no faces, so detection falls through to Rekognition
 * labels and then to sharp's saliency attention crop — and `ingest-article.mts`
 * passes no `focalPointOverride`, so we do not get to choose. Measured on these
 * eight covers the focal y lands at 0.28, 0.69 or 0.72 — on the title or on the
 * rows, never obligingly in the middle. Boosting the band's contrast, blurring
 * everything else and flooding it with saturation were all tried; none moved it.
 *
 * So the composition is built to survive a crop it does not control: ONE plum
 * plate runs from the band down past the rows, and every 700px strip below the
 * title is a branded dark band with type on it rather than a torn-off piece of
 * a table. The generator prints the focal point the pipeline would compute and
 * the contact sheet renders all four crops from it, so this is measured rather
 * than hoped for.
 *
 * The clean fix is upstream and is NOT made here: `processSmartCrops` already
 * accepts `focalPointOverride`, and a graphic that knows where its own centre
 * is should be able to say so at ingest. That is a change to the ingest path
 * and belongs in its own brief.
 *
 * ── Legibility floor ───────────────────────────────────────────────────────
 * The mobile cover fills the viewport width. On a 390px phone the full 2464px
 * canvas maps to 390 CSS px — a factor of 0.158. Body text below ~88px in this
 * canvas lands under 14 CSS px on that phone, so 88 is a hard floor: the
 * layout picks the largest size from a ladder that fits, and THROWS rather than
 * shrink past the floor. Content gets restructured; text does not get smaller.
 */
import sharp from 'sharp';
import { FONT_SANS, FONT_SERIF, mix, type BrandTokens } from './brand-tokens.mts';

export const CANVAS_WIDTH = 2464;
export const CANVAS_HEIGHT = 3080;

const MARGIN_X = 272;
const CONTENT_W = CANVAS_WIDTH - MARGIN_X * 2; // 1920

/**
 * The desktop hero is the one surface that crops this image TWICE. The pipeline
 * cuts a 2464×700 strip (3.52:1); `page.tsx` then drops that strip into an
 * `aspect-[2.4/1]` box with `object-cover`, which shows only the centre 68.2%
 * of its width — x 392…2072. Laying every cover out inside that 1680px block
 * would make it safe there, and was tried: it squeezes the figures down to the
 * legibility floor and pushes rows off the plate, for a desktop-only surface
 * (`hidden lg:block`) serving an audience the brief says reads on a phone. So
 * the composition uses the full 1920px block, the mobile cover / article card /
 * OG crop all show it whole, and the desktop hero shows a centre section. The
 * real fix is a focal-point override at ingest; see the header note.
 */
/** Left edge of the band the desktop hero actually shows: x 392…2072. */
export const DESKTOP_HERO_SAFE_X = 392;

const BAND_TOP = 1190;
const BAND_HEIGHT = 700; // exactly the desktop-hero crop height
const BAND_BOTTOM = BAND_TOP + BAND_HEIGHT; // 1890 — canvas centre is 1540
const BAND_PAD_Y = 96;

/**
 * The plum ground runs from the band down past the rows, not just behind the
 * figures. Saliency picks the densest region and it will not be talked out of
 * it — measured, it lands on the rows or on the title, never obligingly in the
 * centre. Rather than fight that, everything from the band to the note sits on
 * ONE plum plate, so a 700px hero strip cut anywhere below the title is a
 * branded dark band with type on it rather than a torn-off piece of a table.
 */
const PLATE_BOTTOM = 2950;

/** Below this, body text drops under ~14 CSS px on a 390px phone. */
const MIN_BODY_SIZE = 88;

export interface FigureBlock {
  /** Small brass overline — the state, or what the number is. */
  eyebrow: string;
  /**
   * The figure. `RM300` or `Tiada kadar minimum ditetapkan` — a phrase is a
   * real value here, not an empty cell, and the template sizes it down and
   * wraps it rather than pretending there is nothing to show.
   */
  value: string;
  /** Optional qualifier under the figure. */
  sublabel?: string;
}

export interface CoverRow {
  label: string;
  value: string;
}

export interface CoverSpec {
  /** A1 … A8 */
  id: string;
  /** Output filename, written beside the draft. */
  file: string;
  /** The draft this cover belongs to, for the contact sheet. */
  draft: string;
  kicker: string;
  title: string;
  figures: FigureBlock[];
  rowsTitle?: string;
  rows: CoverRow[];
  note?: string;
  footer: string;
  /** Malay alt text — what a screen-reader user gets instead of the figure. */
  alt: string;
}

// ── Text measurement ────────────────────────────────────────────────────────
// librsvg gives no metrics API, so we measure the way we render: rasterise the
// string and trim the transparent margin. Cached, because wrapping asks the
// same question many times.

export interface TextStyle {
  size: number;
  family: string;
  weight: number;
  letterSpacing: number;
}

const measureCache = new Map<string, number>();

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function measureText(text: string, style: TextStyle): Promise<number> {
  if (text.length === 0) return 0;
  const key = `${style.family}|${style.weight}|${style.size}|${style.letterSpacing}|${text}`;
  const cached = measureCache.get(key);
  if (cached !== undefined) return cached;

  const height = Math.ceil(style.size * 3);
  const width = Math.ceil(text.length * style.size * 1.4 + 400);
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">` +
    `<text x="100" y="${Math.round(style.size * 2)}" font-family="${style.family}" ` +
    `font-size="${style.size}" font-weight="${style.weight}" ` +
    `letter-spacing="${style.letterSpacing}" fill="#000000">${escapeXml(text)}</text></svg>`;

  const { info } = await sharp(Buffer.from(svg))
    .trim({ threshold: 1 })
    .toBuffer({ resolveWithObject: true });

  // trim reports INK width; advance is a shade wider. 1.5% covers the last
  // glyph's right side bearing and keeps wrapping on the safe side.
  const measured = info.width * 1.015 + style.letterSpacing;
  measureCache.set(key, measured);
  return measured;
}

export async function wrap(text: string, style: TextStyle, maxWidth: number): Promise<string[]> {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if ((await measureText(candidate, style)) <= maxWidth || current === '') {
      current = candidate;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

// ── SVG emission ────────────────────────────────────────────────────────────

interface DrawTextOptions extends TextStyle {
  x: number;
  baseline: number;
  fill: string;
  anchor?: 'start' | 'middle' | 'end';
}

function textEl(text: string, o: DrawTextOptions): string {
  return (
    `<text x="${o.x}" y="${round(o.baseline)}" font-family="${o.family}" font-size="${o.size}" ` +
    `font-weight="${o.weight}" letter-spacing="${o.letterSpacing}" fill="${o.fill}"` +
    (o.anchor && o.anchor !== 'start' ? ` text-anchor="${o.anchor}"` : '') +
    `>${escapeXml(text)}</text>`
  );
}

function rect(x: number, y: number, w: number, h: number, fill: string): string {
  return `<rect x="${round(x)}" y="${round(y)}" width="${round(w)}" height="${round(h)}" fill="${fill}"/>`;
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Baseline of the first line of a block whose top edge is `top`. */
function firstBaseline(top: number, size: number): number {
  return top + size * 0.8;
}

function blockHeight(lineCount: number, lineHeight: number): number {
  return lineCount * lineHeight;
}

// ── Type ramp, taken from the site's own editorial scale ────────────────────
// `.inspire-overline` is uppercase, 600, 0.12em tracking; `.inspire-display` is
// the serif at -0.02em. The sizes are scaled for a 2464px canvas, the roles are
// the site's.

const styles = (t: BrandTokens) => ({
  wordmark: { size: 76, family: FONT_SANS, weight: 600, letterSpacing: 13, fill: t['brass-deep'] },
  kicker: { size: 72, family: FONT_SANS, weight: 600, letterSpacing: 9, fill: t['brass-deep'] },
  title: { size: 150, family: FONT_SERIF, weight: 400, letterSpacing: -3, fill: t.foreground },
  rowsTitle: {
    size: 66,
    family: FONT_SANS,
    weight: 600,
    letterSpacing: 8,
    fill: t['brand-secondary'],
  },
  note: { size: 74, family: FONT_SANS, weight: 400, letterSpacing: 0, fill: t['plum-deep-muted'] },
  footer: {
    size: 58,
    family: FONT_SANS,
    weight: 400,
    letterSpacing: 3,
    fill: t['muted-foreground'],
  },
});

/**
 * A named horizontal band of the composition, in canvas y coordinates.
 *
 * Every crop except the mobile cover takes the FULL width and a shorter slice
 * of the height (`computeCropWindow` makes a 4:5 source width-constrained for
 * every target wider than 4:5), so what a crop destroys is always a band. The
 * generator intersects each crop window with these and names the casualties,
 * rather than leaving the reader to squint at a thumbnail and guess.
 */
export interface CoverRegion {
  /** What lives in this band — "title", "figure 1: RM60 sejam", "rows"… */
  name: string;
  top: number;
  bottom: number;
}

export interface RenderResult {
  png: Buffer;
  /** Diagnostics the contact sheet prints, so layout decisions are visible. */
  layout: {
    titleLines: number;
    rowSize: number;
    figureSizes: number[];
    /** Where each load-bearing block actually landed. See `CoverRegion`. */
    regions: CoverRegion[];
  };
}

export async function renderCover(spec: CoverSpec, t: BrandTokens): Promise<RenderResult> {
  if (spec.figures.length < 1 || spec.figures.length > 2) {
    throw new Error(
      `${spec.id}: the template carries one or two figure blocks, not ${spec.figures.length}`,
    );
  }

  const s = styles(t);
  const parts: string[] = [];
  const regions: CoverRegion[] = [];
  const region = (name: string, top: number, bottom: number) =>
    regions.push({ name, top: Math.round(top), bottom: Math.round(bottom) });

  // Ground. Three fields: warm off-white above, plum band, warm cream below.
  parts.push(rect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT, t.background));
  parts.push(rect(0, BAND_TOP, CANVAS_WIDTH, PLATE_BOTTOM - BAND_TOP, t.primary));
  parts.push(rect(0, 0, CANVAS_WIDTH, 14, t['brand-secondary']));
  parts.push(rect(0, BAND_TOP, CANVAS_WIDTH, 8, t['brand-secondary']));
  parts.push(rect(0, PLATE_BOTTOM - 8, CANVAS_WIDTH, 8, t['brand-secondary']));
  // Hairline between the figures and the rows — the band keeps its 700px, but
  // it is a zone on the plate now, not an island.
  parts.push(rect(MARGIN_X, BAND_BOTTOM, CONTENT_W, 2, mix(t.primary, t['brand-secondary'], 0.45)));

  // ── Masthead ──────────────────────────────────────────────────────────────
  parts.push(textEl('HELLOKAHWIN', { ...s.wordmark, x: MARGIN_X, baseline: 250, anchor: 'start' }));
  parts.push(rect(MARGIN_X, 300, CONTENT_W, 3, t.hairline));
  region('wordmark', 250 - s.wordmark.size * 0.8, 303);

  // ── Kicker + title, bottom-anchored to the plate ──────────────────────────
  // The masthead stays at the top of the page; the kicker travels with the
  // title so the two never drift apart when the title wraps to a third line.
  const titleLineHeight = Math.round(s.title.size * 1.16);
  const titleLines = await wrap(spec.title, s.title, CONTENT_W);
  if (titleLines.length > 3) {
    throw new Error(
      `${spec.id}: title wraps to ${titleLines.length} lines at ${s.title.size}px; the template holds 3. Shorten it.`,
    );
  }
  // Centred in the paper between the masthead rule and the plate, so a one-line
  // title does not leave a void under the masthead and a three-line one does
  // not crowd the plate.
  const kickerLineHeight = Math.round(s.kicker.size * 1.25);
  const clusterHeight = kickerLineHeight + 84 + titleLines.length * titleLineHeight;
  const clusterTop = 380 + (BAND_TOP - 90 - 380 - clusterHeight) / 2;

  parts.push(
    textEl(spec.kicker.toUpperCase(), {
      ...s.kicker,
      x: MARGIN_X,
      baseline: firstBaseline(clusterTop, s.kicker.size),
      anchor: 'start',
    }),
  );
  region('kicker', clusterTop, clusterTop + kickerLineHeight);

  const titleTop = clusterTop + kickerLineHeight + 84;
  const titleFirstBaseline = firstBaseline(titleTop, s.title.size);
  region('title', titleTop, titleTop + titleLines.length * titleLineHeight);
  titleLines.forEach((line, i) => {
    parts.push(
      textEl(line, {
        ...s.title,
        x: MARGIN_X,
        baseline: titleFirstBaseline + i * titleLineHeight,
        anchor: 'start',
      }),
    );
  });

  // ── The band ──────────────────────────────────────────────────────────────
  const twoUp = spec.figures.length === 2;
  const colWidth = twoUp ? Math.floor((CONTENT_W - 96) / 2) : CONTENT_W;
  const boxTop = BAND_TOP + BAND_PAD_Y;
  const boxHeight = BAND_HEIGHT - BAND_PAD_Y * 2;

  const eyebrowStyle = {
    size: twoUp ? 66 : 72,
    family: FONT_SANS,
    weight: 600,
    letterSpacing: 9,
    fill: t['brand-secondary'],
  };
  const sublabelStyle = {
    size: twoUp ? 68 : 80,
    family: FONT_SANS,
    weight: 400,
    letterSpacing: 0,
    fill: t['plum-deep-muted'],
  };
  const valueLadder = twoUp ? [200, 168, 140, 116, 96, 88] : [280, 224, 180, 148, 120, 96, 88];

  interface FittedFigure {
    eyebrow: string;
    valueLines: string[];
    valueSize: number;
    sublabelLines: string[];
    height: number;
  }

  const fitted: FittedFigure[] = [];
  for (const figure of spec.figures) {
    let chosen: FittedFigure | null = null;
    for (const size of valueLadder) {
      const valueStyle = {
        size,
        family: FONT_SERIF,
        weight: 400,
        letterSpacing: -2,
        fill: t['brand-secondary'],
      };
      const valueLines = await wrap(figure.value, valueStyle, colWidth);
      const sublabelLines = figure.sublabel
        ? await wrap(figure.sublabel, sublabelStyle, colWidth)
        : [];
      const height =
        blockHeight(1, Math.round(eyebrowStyle.size * 1.25)) +
        34 +
        blockHeight(valueLines.length, Math.round(size * 1.12)) +
        (sublabelLines.length > 0
          ? 26 + blockHeight(sublabelLines.length, Math.round(sublabelStyle.size * 1.28))
          : 0);
      if (height <= boxHeight) {
        chosen = { eyebrow: figure.eyebrow, valueLines, valueSize: size, sublabelLines, height };
        break;
      }
    }
    if (!chosen) {
      throw new Error(
        `${spec.id}: figure "${figure.value}" will not fit the 700px band above the ${MIN_BODY_SIZE}px ` +
          'legibility floor. Shorten the figure or its sublabel — do not shrink the type.',
      );
    }
    fitted.push(chosen);
  }

  // Two figures side by side must share ONE value size, or the cover reads as
  // if one state mattered more than the other. Re-fit the larger one down to
  // the smaller's size.
  if (twoUp) {
    const shared = Math.min(...fitted.map((f) => f.valueSize));
    for (let i = 0; i < fitted.length; i++) {
      if (fitted[i].valueSize === shared) continue;
      const valueStyle = {
        size: shared,
        family: FONT_SERIF,
        weight: 400,
        letterSpacing: -2,
        fill: t['brand-secondary'],
      };
      const valueLines = await wrap(spec.figures[i].value, valueStyle, colWidth);
      fitted[i] = {
        ...fitted[i],
        valueSize: shared,
        valueLines,
        height:
          blockHeight(1, Math.round(eyebrowStyle.size * 1.25)) +
          34 +
          blockHeight(valueLines.length, Math.round(shared * 1.12)) +
          (fitted[i].sublabelLines.length > 0
            ? 26 +
              blockHeight(fitted[i].sublabelLines.length, Math.round(sublabelStyle.size * 1.28))
            : 0),
      };
    }
  }

  // The eyebrow is a single line by design — it is a label, not a sentence.
  for (const figure of spec.figures) {
    const width = await measureText(figure.eyebrow.toUpperCase(), eyebrowStyle);
    if (width > colWidth) {
      throw new Error(
        `${spec.id}: figure eyebrow "${figure.eyebrow}" is ${Math.round(width)}px wide in a ` +
          `${colWidth}px column. Shorten it — the template does not wrap eyebrows.`,
      );
    }
  }

  const stackTop = boxTop + (boxHeight - Math.max(...fitted.map((f) => f.height))) / 2;

  fitted.forEach((figure, index) => {
    const x = MARGIN_X + index * (colWidth + 96);
    let cursor = stackTop;

    parts.push(
      textEl(figure.eyebrow.toUpperCase(), {
        ...eyebrowStyle,
        x,
        baseline: firstBaseline(cursor, eyebrowStyle.size),
        anchor: 'start',
      }),
    );
    cursor += Math.round(eyebrowStyle.size * 1.25) + 34;

    const valueLineHeight = Math.round(figure.valueSize * 1.12);
    figure.valueLines.forEach((line, i) => {
      parts.push(
        textEl(line, {
          size: figure.valueSize,
          family: FONT_SERIF,
          weight: 400,
          letterSpacing: -2,
          fill: t['brand-secondary'],
          x,
          baseline: firstBaseline(cursor, figure.valueSize) + i * valueLineHeight,
          anchor: 'start',
        }),
      );
    });
    cursor += blockHeight(figure.valueLines.length, valueLineHeight);

    if (figure.sublabelLines.length > 0) {
      cursor += 26;
      const lh = Math.round(sublabelStyle.size * 1.28);
      figure.sublabelLines.forEach((line, i) => {
        parts.push(
          textEl(line, {
            ...sublabelStyle,
            x,
            baseline: firstBaseline(cursor, sublabelStyle.size) + i * lh,
            anchor: 'start',
          }),
        );
      });
    }
  });

  fitted.forEach((figure, index) => {
    // The figure IS the payload. Name it by its value so a crop verdict reads
    // "crop-16x9-og cuts figure 2: RM3,600 sesi", not "cuts a region".
    region(`figure ${index + 1}: ${spec.figures[index].value}`, stackTop, stackTop + figure.height);
  });

  if (twoUp) {
    const dividerX = MARGIN_X + colWidth + 46;
    parts.push(
      rect(
        dividerX,
        BAND_TOP + 130,
        3,
        BAND_HEIGHT - 260,
        mix(t.primary, t['brand-secondary'], 0.4),
      ),
    );
  }

  // ── Bottom field: footer, note, rows — laid out from the bottom up ────────
  // ONE line, and the arithmetic is why. The footer is bottom-anchored at
  // CANVAS_HEIGHT − 55, so a second line pushes its first baseline up to 2950 —
  // exactly PLATE_BOTTOM — and that line lands ON the plum plate in
  // `muted-foreground`, a warm mid-grey chosen for the cream field. It is
  // effectively unreadable there and the brass rule cuts through it. Rather
  // than shrink the type or fudge the anchor, the template refuses: shorten the
  // footer. (All eight C2.4 footers already fit on one line, which is why this
  // never bit before the P1/P6 batch.)
  const footerLines = await wrap(spec.footer, s.footer, CONTENT_W);
  if (footerLines.length > 1) {
    throw new Error(
      `${spec.id}: footer wraps to ${footerLines.length} lines at ${s.footer.size}px in ` +
        `${CONTENT_W}px. A second line collides with the plum plate at y ${PLATE_BOTTOM} and is ` +
        'unreadable there. Shorten the footer.',
    );
  }
  const footerLineHeight = Math.round(s.footer.size * 1.3);
  const footerLastBaseline = CANVAS_HEIGHT - 55;
  const footerFirstBaseline = footerLastBaseline - (footerLines.length - 1) * footerLineHeight;
  region(
    'footer',
    footerFirstBaseline - s.footer.size * 0.8,
    footerLastBaseline + s.footer.size * 0.25,
  );
  footerLines.forEach((line, i) => {
    parts.push(
      textEl(line, {
        ...s.footer,
        x: MARGIN_X,
        baseline: footerFirstBaseline + i * footerLineHeight,
        anchor: 'start',
      }),
    );
  });

  // The rows and the note live ON the plate, so the plate's foot is the floor —
  // the footer sits below it on paper.
  let contentFloor = PLATE_BOTTOM - 84;

  if (spec.note) {
    const noteLines = await wrap(spec.note, s.note, CONTENT_W);
    if (noteLines.length > 2) {
      throw new Error(`${spec.id}: note wraps to ${noteLines.length} lines; the template holds 2.`);
    }
    const lh = Math.round(s.note.size * 1.27);
    const noteTop = contentFloor - blockHeight(noteLines.length, lh);
    region('note', noteTop, noteTop + blockHeight(noteLines.length, lh));
    noteLines.forEach((line, i) => {
      parts.push(
        textEl(line, {
          ...s.note,
          x: MARGIN_X,
          baseline: firstBaseline(noteTop, s.note.size) + i * lh,
          anchor: 'start',
        }),
      );
    });
    contentFloor = noteTop - 56;
  }

  let rowsTop = BAND_BOTTOM + 100;
  const rowsBlockTop = rowsTop;
  if (spec.rowsTitle) {
    parts.push(
      textEl(spec.rowsTitle.toUpperCase(), {
        ...s.rowsTitle,
        x: MARGIN_X,
        baseline: firstBaseline(rowsTop, s.rowsTitle.size),
        anchor: 'start',
      }),
    );
    rowsTop += Math.round(s.rowsTitle.size * 1.25) + 42;
  }

  const rowsAvailable = contentFloor - rowsTop;
  const labelWidth = 700;
  const valueX = MARGIN_X + labelWidth + 40;
  const valueWidth = CANVAS_WIDTH - MARGIN_X - valueX;

  let rowSize = 0;
  let laidOut: { labelLines: string[]; valueLines: string[]; height: number }[] = [];
  for (const size of [104, 96, 92, MIN_BODY_SIZE]) {
    const labelStyle = {
      size,
      family: FONT_SANS,
      weight: 600,
      letterSpacing: 0,
      fill: t['plum-deep-foreground'],
    };
    const valueStyle = {
      size,
      family: FONT_SANS,
      weight: 400,
      letterSpacing: 0,
      fill: t['plum-deep-muted'],
    };
    const lineHeight = Math.round(size * 1.18);
    const gap = Math.round(size * 0.34);
    const rows = [];
    for (const row of spec.rows) {
      const labelLines = await wrap(row.label, labelStyle, labelWidth);
      const valueLines = await wrap(row.value, valueStyle, valueWidth);
      rows.push({
        labelLines,
        valueLines,
        height: blockHeight(Math.max(labelLines.length, valueLines.length), lineHeight),
      });
    }
    const total = rows.reduce((sum, r) => sum + r.height, 0) + Math.max(0, rows.length - 1) * gap;
    if (total <= rowsAvailable) {
      rowSize = size;
      laidOut = rows;
      break;
    }
  }

  if (rowSize === 0) {
    throw new Error(
      `${spec.id}: ${spec.rows.length} rows will not fit at the ${MIN_BODY_SIZE}px legibility floor. ` +
        'Show fewer rows or move detail into the note — do not shrink the type.',
    );
  }

  {
    const lineHeight = Math.round(rowSize * 1.18);
    const gap = Math.round(rowSize * 0.34);
    let cursor = rowsTop;
    laidOut.forEach((row, index) => {
      row.labelLines.forEach((line, i) => {
        parts.push(
          textEl(line, {
            size: rowSize,
            family: FONT_SANS,
            weight: 600,
            letterSpacing: 0,
            fill: t['plum-deep-foreground'],
            x: MARGIN_X,
            baseline: firstBaseline(cursor, rowSize) + i * lineHeight,
            anchor: 'start',
          }),
        );
      });
      row.valueLines.forEach((line, i) => {
        parts.push(
          textEl(line, {
            size: rowSize,
            family: FONT_SANS,
            weight: 400,
            letterSpacing: 0,
            fill: t['plum-deep-muted'],
            x: valueX,
            baseline: firstBaseline(cursor, rowSize) + i * lineHeight,
            anchor: 'start',
          }),
        );
      });
      cursor += row.height;
      if (index === laidOut.length - 1) region('rows', rowsBlockTop, cursor);
      if (index < laidOut.length - 1) {
        parts.push(
          rect(
            MARGIN_X,
            cursor + gap / 2 - 1,
            CONTENT_W,
            2,
            mix(t.primary, t['brand-secondary'], 0.28),
          ),
        );
        cursor += gap;
      }
    });
  }

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="${CANVAS_WIDTH}" height="${CANVAS_HEIGHT}" ` +
    `viewBox="0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}">${parts.join('')}</svg>`;

  // Rasterise at 2× and resample down: librsvg hints glyphs to the raster grid,
  // so supersampling is what keeps 88px type crisp. `density` scales the whole
  // raster (72 is 1:1 with SVG units — at 96 the file silently comes out
  // 3285×4107 and every crop calculation downstream is against the wrong
  // geometry), so the explicit resize pins the output to the declared canvas.
  const png = await sharp(Buffer.from(svg), { density: 144 })
    .resize(CANVAS_WIDTH, CANVAS_HEIGHT, { fit: 'fill', kernel: 'lanczos3' })
    .png({ compressionLevel: 9, palette: true, quality: 100, effort: 10 })
    .toBuffer();

  const meta = await sharp(png).metadata();
  if (meta.width !== CANVAS_WIDTH || meta.height !== CANVAS_HEIGHT) {
    throw new Error(
      `${spec.id}: rendered ${meta.width}×${meta.height}, expected ${CANVAS_WIDTH}×${CANVAS_HEIGHT}.`,
    );
  }

  return {
    png,
    layout: {
      titleLines: titleLines.length,
      rowSize,
      figureSizes: fitted.map((f) => f.valueSize),
      regions: regions.sort((a, b) => a.top - b.top),
    },
  };
}
