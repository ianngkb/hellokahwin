/**
 * CONT-15 — the article cover plate's two constants.
 *
 * The plate stops being a fixed `aspect-[3/2]` box and becomes a function of
 * the file it holds. Every portrait cover was letterboxed into 3:2, keeping as
 * little as 44.5% of the frame and failing `image-aspect` in
 * `scripts/ui-layout-gate.mjs` by up to 125% against a 25% ceiling.
 *
 * ⚠️ THE CORPUS MOVED UNDER THE MEASUREMENT, so both numbers below are dated
 * rather than reconciled — reconciling them by editing one would destroy the
 * evidence that it moves.
 *
 *   creative-director, 02 Sept 2026, the specification:
 *     92 published covers · 14 portrait (0.667 ×8, 0.748 ×1, 0.750 ×4, 0.753 ×1)
 *     + 1 near-square at 1.255 that the ceiling narrows = 15 plates move.
 *   backfill run, 02 Sept 2026, same day, hours later:
 *     96 published covers · 15 portrait (0.667 ×8, 0.748 ×1, 0.750 ×5, 0.753 ×1)
 *     + the same 1.255 = 16 plates move. The extra portrait is
 *     `syarat-wali-nikah` (1200×1600). The corpus went 92 → 95 → 96 across
 *     three reads inside one afternoon.
 *
 * Neither reading is wrong and the rule does not depend on either: a box
 * derived from the file cannot deviate from the file, whatever the count is
 * this hour. The counts are provenance, not inputs.
 *
 * ── WHERE EACH NUMBER COMES FROM ───────────────────────────────────────────
 *
 * `MEASURE_PX` = 756. Today's measure kept, not a new number. It is the
 * measured rendered width of the existing figure at 1440 and 1920, and it is
 * DES-03 §5.1's own frame written down in `components.css`:
 * `756 + 64 + 300 = 1120`, the `.hk-article-grid` container.
 *
 * Every landscape cover therefore renders at exactly the width it renders at
 * today, and that claim is measured rather than reasoned. Reasoning from the
 * figure's `max-w-3xl` (768px) says the 756px cap must bind somewhere in the
 * 768–1023px band and narrow every landscape plate by 12px. It does not: the
 * figure's own computed width is 704px across that entire band, because the
 * page container — not `max-w-3xl` — is what binds there. Measured in Chrome at
 * `deviceScaleFactor: 1` on `garden-wedding` at 768/800/832/860/900/1000/1023:
 * figure 704.0, plate 704.0, cap never binds. At 1024 both are 580.0.
 *
 * `HEIGHT_CEILING_PX` = 580. Today's 3:2 plate at full measure is 504px tall;
 * 580 gives a portrait plate 15% more presence than the landscape norm while
 * staying inside one screen. Without a ceiling a 2:3 cover at full measure is
 * 1,134px tall — it buries the article's first paragraph and reads as a bug
 * rather than as art direction. The ceiling narrows the plate; it never crops
 * it, which is the whole difference between this and `object-fit: cover` on a
 * capped height.
 *
 * ── WHY THE BREAK LANDS WHERE IT DOES ──────────────────────────────────────
 * The two constants meet at 756 / 580 = 1.3034. That value sits inside the
 * corpus's empty gap between its one near-square cover (1.255) and its 4:3
 * cluster (1.313–1.344), so the ENTIRE landscape population keeps full measure
 * and exactly one landscape plate narrows — `sime-darby-convention-centre`,
 * 756 → 728. The gap is a property of today's corpus, not a guarantee; a future
 * cover between 1.255 and 1.3034 will narrow slightly, which is the rule
 * behaving, not an exception.
 *
 * ── IT IS CONTINUOUS, ON PURPOSE ───────────────────────────────────────────
 * One expression, no orientation branch, no `if`. A rule with a branch in it
 * acquires a discontinuity nobody notices until a cover lands on it.
 *
 * ── THE KNOB IS THE CEILING, NOT THE ASPECT ────────────────────────────────
 * If the 387px plate reads as small rather than as deliberate on the eight
 * 0.667 covers, the answer is to raise `HEIGHT_CEILING_PX` — one number here —
 * and never to reintroduce the crop.
 */
export const COVER_PLATE = {
  /** CSS px. The article body column's measure; the plate's hard ceiling. */
  MEASURE_PX: 756,
  /** CSS px. The tallest a plate may be before it narrows instead of growing. */
  HEIGHT_CEILING_PX: 580,
} as const;

/**
 * `--cover-ar`: the file's own shape, as an unreduced `<width> / <height>` so
 * the value in the DOM is traceable back to the recorded intrinsics rather than
 * to a decimal somebody would have to reverse.
 */
export function coverPlateAspect(fileWidth: number, fileHeight: number): string {
  return `${fileWidth} / ${fileHeight}`;
}

/**
 * `--cover-max-w`: `min(measure, ceiling × aspect)`, written so the BROWSER
 * computes it.
 *
 * It is deliberately not pre-rounded in JS. A rounded integer is a second
 * source of truth for the box's width, and it drifts from `aspect-ratio` — the
 * only thing that makes the painted box exactly the file's shape is that both
 * derive from the same two integers at layout time. `min()` also lets the
 * declared max-width lose to a narrower column without any breakpoint logic:
 * below 768px the column is smaller than every value this can produce, so a
 * phone simply gets the photograph at full column width in its own shape.
 */
export function coverPlateMaxWidth(fileWidth: number, fileHeight: number): string {
  return `min(${COVER_PLATE.MEASURE_PX}px, calc(${COVER_PLATE.HEIGHT_CEILING_PX}px * ${fileWidth} / ${fileHeight}))`;
}

/**
 * What a browser resolves `coverPlateMaxWidth` to when the column is at least
 * that wide — i.e. the plate's painted width at ≥1440.
 *
 * This exists so the number can be asserted in a test and printed on the
 * reference page from the same constants the CSS uses. It is NOT used to emit
 * CSS: see `coverPlateMaxWidth`.
 */
export function coverPlateWidthPx(fileWidth: number, fileHeight: number): number {
  return Math.min(COVER_PLATE.MEASURE_PX, (COVER_PLATE.HEIGHT_CEILING_PX * fileWidth) / fileHeight);
}
