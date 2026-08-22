/**
 * Which media URLs a Tiptap article document references.
 *
 * Lifted out of `admin/inspire/[article-id]/edit/actions.ts` so the media
 * backfill script (`scripts/backfill-media.ts`) walks EXACTLY the same node
 * types as the per-save `syncMediaUsage()` does. When the two were allowed to
 * diverge the backfill would register a set of media rows the save path then
 * failed to match, and `media_article_usage` would drift on the next edit.
 *
 * Deliberately free of `server-only`, the database and R2: it is a pure
 * function over a JSON document, so a plain `tsx` script can import it.
 */

/**
 * Every media URL in a Tiptap document, in document order, duplicates included.
 * Callers that need a set de-duplicate themselves.
 */
export function extractImageUrlsFromContent(content: unknown): string[] {
  if (!content || typeof content !== 'object') return [];
  const urls: string[] = [];

  function walk(node: Record<string, unknown>) {
    // CustomImage nodes
    if (node.type === 'image' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs.src === 'string') urls.push(attrs.src);
    }
    // GalleryBlock nodes
    if (node.type === 'galleryBlock' && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      try {
        const images: unknown = JSON.parse((attrs['data-images'] as string) || '[]');
        // Every entry is checked rather than trusted. `data-images` is
        // free-form JSON on a node attribute, so a null or a non-object entry
        // is reachable — and reading `.src` off it threw, which the catch
        // below turned into "this gallery has no images at all", silently
        // dropping the VALID URLs that came after it. A bad entry must cost
        // its own entry and nothing more.
        if (Array.isArray(images)) {
          for (const img of images) {
            if (
              img &&
              typeof img === 'object' &&
              typeof (img as { src?: unknown }).src === 'string'
            ) {
              urls.push((img as { src: string }).src);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to parse gallery block images:', err);
      }
    }
    // PDF nodes (block or inline) — track the attached PDF as media usage
    if ((node.type === 'pdfLinkBlock' || node.type === 'pdfLinkInline') && node.attrs) {
      const attrs = node.attrs as Record<string, unknown>;
      if (typeof attrs['data-url'] === 'string' && attrs['data-url']) {
        urls.push(attrs['data-url'] as string);
      }
    }
    if (Array.isArray(node.content)) {
      for (const child of node.content) {
        walk(child as Record<string, unknown>);
      }
    }
  }

  walk(content as Record<string, unknown>);
  return urls;
}
