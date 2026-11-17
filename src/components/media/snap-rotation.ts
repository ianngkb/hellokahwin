/**
 * The crop editor works in WHOLE degrees. The server's image engine on
 * Cloudflare (media-tools) only accepts integer angles, so a fractional angle
 * would be previewed and measured one way and rotated another. Snapping here,
 * at every input (crop gesture, number box, slider), keeps the preview, the
 * crop coordinates and the server on the same integer.
 *
 * Non-numbers (an emptied number box) become 0, as before. The range is not
 * clamped: react-easy-crop's rotate gesture can go below 0, and the server
 * accepts any finite angle.
 */
export function snapRotation(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  // `|| 0` folds -0 (Math.round(-0.4)) into 0, so a zero angle is always 0.
  return Math.round(n) || 0;
}
