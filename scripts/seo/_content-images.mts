/**
 * One traversal of an article's Tiptap document, over every image in it.
 *
 * ── WHY THIS IS SHARED ────────────────────────────────────────────────────
 *
 * Two scripts walk `articles.content` looking for images, and the ORDINAL each
 * one computes has to be the same number. `backfill-image-alt.mts` stored 369
 * alts of the form `${title} — gambar ${ordinal + 1}`; `vision-alt.mts` finds
 * those images again by recomputing that exact string and matching it. If the
 * two walkers disagree about what counts as an image, or about the order they
 * come in, the second script silently matches nothing — or, worse, matches the
 * wrong photograph and hands it a description of a different one.
 *
 * `_content-apply.mts` makes the same argument for the apply path: copying a
 * guarantee into two files is how one of the two ends up missing it.
 *
 * ── WHAT COUNTS, AND IN WHAT ORDER ────────────────────────────────────────
 *
 * Document order, depth first. `image` and `figureBlock` are one image each;
 * a `galleryBlock` is as many as its `data-images` array holds. `sectionBlock`
 * and every other container is walked THROUGH, exactly as
 * `article-renderer.tsx` unwraps it — an earlier version of the backfill
 * looked for a node type called `section`, which does not exist, and skipped
 * every image inside a real section while its ordinals drifted out of step
 * with the renderer's.
 *
 * A `heading` node sets the current heading and is not descended into; its
 * visible text has already been collected.
 */

/** The visible text of a Tiptap node, marks and nesting included. */
export function textOf(node: unknown): string {
  let out = '';
  const walk = (n: unknown): void => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    const o = n as { type?: string; text?: string; content?: unknown };
    if (o.type === 'text' && typeof o.text === 'string') out += o.text;
    if (o.content) walk(o.content);
  };
  walk(node);
  return out.trim();
}

export interface GalleryImage {
  src?: string;
  alt?: unknown;
  caption?: unknown;
}

/** `data-images` is a JSON string inside an attribute; a malformed one is no images. */
export function parseGallery(attrs: Record<string, unknown> | undefined): GalleryImage[] {
  const raw = attrs?.['data-images'];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as GalleryImage[]) : [];
  } catch {
    return [];
  }
}

/** One image, where it sits, and the handle to rewrite its alt in place. */
export interface ImageSite {
  /**
   * 0-based, counting every image in the article in document order whether or
   * not it carries an alt — so "gambar 3" is the third photograph on the page,
   * not the third one somebody forgot to describe.
   */
  ordinal: number;
  /** Which node held it. `gallery` images live inside a `data-images` array. */
  kind: 'image' | 'figureBlock' | 'gallery';
  /** The stored alt exactly as it sits: a string, `null`, or absent. */
  alt: unknown;
  /** The stored image URL, if the node has one. */
  src: unknown;
  /** `data-caption` on a figure, `caption` on a gallery entry. */
  caption: unknown;
  /** The nearest preceding heading's visible text, or null above the first one. */
  heading: string | null;
  /** Write a new alt at this site. Mutates the document passed to `walkArticleImages`. */
  setAlt: (value: string) => void;
}

/**
 * Visit every image in `doc` in document order.
 *
 * Mutating: `site.setAlt` writes into the document you pass in, so callers that
 * need the original intact clone first — `structuredClone` is what both
 * scripts use, because the apply path re-runs its transform against a freshly
 * locked row and compares the result to the hash the dry run promised.
 */
export function walkArticleImages(doc: unknown, visit: (site: ImageSite) => void): void {
  let ordinal = 0;
  let heading: string | null = null;

  const walk = (node: unknown): void => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: Record<string, unknown>; content?: unknown };

    if (n.type === 'heading') {
      heading = textOf(n);
      return;
    }
    if (n.type === 'image' || n.type === 'figureBlock') {
      const attrs = (n.attrs ?? {}) as Record<string, unknown>;
      visit({
        ordinal: ordinal++,
        kind: n.type,
        alt: attrs.alt,
        src: attrs.src,
        caption: attrs['data-caption'],
        heading,
        setAlt: (value) => {
          attrs.alt = value;
          n.attrs = attrs;
        },
      });
      return;
    }
    if (n.type === 'galleryBlock') {
      const images = parseGallery(n.attrs);
      let touched = false;
      for (const img of images) {
        visit({
          ordinal: ordinal++,
          kind: 'gallery',
          alt: img.alt,
          src: img.src,
          caption: img.caption,
          heading,
          setAlt: (value) => {
            img.alt = value;
            touched = true;
          },
        });
      }
      // Re-serialise once, after the whole array has been offered, so a
      // per-image write does not have to know about the attribute encoding.
      if (touched && n.attrs) n.attrs['data-images'] = JSON.stringify(images);
      return;
    }
    // Everything else, `sectionBlock` included, is walked through.
    if (n.content) walk(n.content);
  };

  walk((doc as { content?: unknown } | null)?.content);
}
