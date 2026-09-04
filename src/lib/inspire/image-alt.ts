/**
 * What an image's `alt` says, and what it says when the content JSONB has none.
 *
 * ── WHY (Ahrefs 2026-08-28: "Missing alt text", 172 images) ───────────────
 *
 * The renderer shipped `alt={img.alt || ''}`. The alt lives in the Tiptap
 * JSONB, and an editor who uploads without typing one publishes `alt=""` — a
 * DECLARATION that the image is decorative. On the real-wedding photo essays
 * that is 49 of 57 images on one page: a screen reader is told there is
 * nothing there, on a page that is almost entirely photographs.
 *
 * A title-plus-position fallback is not good alt text. It is, however, true,
 * and it is unambiguously better than lying about the image being decorative.
 * The genuinely decorative images elsewhere in the app (the sidebar thumb, the
 * author avatar, the mobile bar, the gallery thumbnail strip) keep their
 * deliberate `alt=""` and do not come through here.
 *
 * ── WHY THIS IS ITS OWN MODULE ────────────────────────────────────────────
 *
 * Two callers, and they must never disagree. `article-renderer.tsx` uses it at
 * render time for images with no stored alt;
 * `scripts/seo/backfill-image-alt.mts` uses the SAME function to write stored
 * alts, so an image that falls all the way through the backfill's chain is
 * stored with exactly the string the renderer would have produced, rather than
 * a hand-reproduced near-copy of it. When they lived in the renderer the
 * script could not import them without pulling React and next/image into a
 * CLI process.
 */

/**
 * The `alt` an image gets when the stored content has none.
 *
 * `ordinal` is 0-based and counts every image in the article in document
 * order, whether or not it already had an alt, so "gambar 3" is the third
 * photograph on the page rather than the third one someone forgot to describe.
 *
 * Returns `''` with no title, preserving the behaviour of the preview surfaces
 * that render content with no article behind it.
 */
export function fallbackImageAlt(articleTitle: string | undefined, ordinal: number): string {
  const title = articleTitle?.trim();
  if (!title) return '';
  return `${title} — gambar ${ordinal + 1}`;
}

/**
 * The `alt` an image actually renders with.
 *
 * Null-safe on purpose: the stored alt arrives from the content JSONB and from
 * Tiptap node attributes, and both can hand back `null` — `figure-block-view`'s
 * own upload-failure path writes `alt: null` — so a bare `.trim()` here would
 * throw inside a server render. Whitespace-only counts as absent: `alt=" "` is
 * an empty accessible name wearing a disguise.
 */
export function resolveImageAlt(
  stored: string | null | undefined,
  articleTitle: string | undefined,
  ordinal: number,
): string {
  const described = (stored ?? '').trim();
  return described || fallbackImageAlt(articleTitle, ordinal);
}
