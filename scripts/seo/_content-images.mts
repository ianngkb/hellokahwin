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
 * and every other container is walked THROUGH — an earlier version of the
 * backfill looked for a node type called `section`, which does not exist, and
 * skipped every image inside a real section while its ordinals drifted.
 *
 * A `heading` node sets the current heading and is not descended into; its
 * visible text has already been collected, and an image nested inside a
 * heading is not a photograph on the page.
 *
 * ── THE CLAIM THIS MAKES, AND THE ONE IT DOES NOT ─────────────────────────
 *
 * This is NOT a general reimplementation of `article-renderer.tsx`'s numbering,
 * and it should not be read as one. The renderer also numbers raw `<img>` tags
 * recovered from sanitised HTML, which this walk never sees at all.
 *
 * What it claims is narrower and is the only thing the two scripts need: for
 * the node types that carry a stored `alt` in the content JSONB, it produces
 * the same sequence the backfill produced when it wrote the 369 stored alts,
 * and the same one the renderer produces for those nodes. Verified on the real
 * corpus, 4 September 2026: the walk before and after the src/gallery rules
 * below picks a byte-identical set of 369 targets across the same 14 articles.
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

/**
 * The entries of a gallery's `data-images`, exactly as they arrive.
 *
 * `unknown[]`, not a shaped array, and the type is the point. `data-images` is
 * free-form JSON on a node attribute: a null entry, a bare URL string, an
 * object with no `src` are all reachable, and `content-media.ts` says so at
 * length after one of them threw and took every valid URL after it down with
 * it. A type that promised `{ src?: string }` here would let a caller read
 * `.alt` off a null and find out at runtime, on production data.
 *
 * A malformed or absent attribute is no images, which is what the reader sees.
 */
export function parseGallery(attrs: Record<string, unknown> | undefined): unknown[] {
  const raw = attrs?.['data-images'];
  if (typeof raw !== 'string') return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as unknown[]) : [];
  } catch {
    return [];
  }
}

/** The alt on a gallery entry, for an entry that may be anything at all. */
export function galleryEntryAlt(entry: unknown): unknown {
  return entry && typeof entry === 'object' ? (entry as { alt?: unknown }).alt : undefined;
}

/** One image, where it sits, and the handle to rewrite its alt in place. */
export interface ImageSite {
  /**
   * 0-based, counting every image the renderer numbers, in document order,
   * whether or not it carries an alt — so "gambar 3" is the third photograph on
   * the page, not the third one somebody forgot to describe.
   */
  ordinal: number;
  /** Which node held it. `gallery` images live inside a `data-images` array. */
  kind: 'image' | 'figureBlock' | 'gallery';
  /** The stored alt exactly as it sits: a string, `null`, or absent. */
  alt: unknown;
  /** The image URL. Always a non-empty string; a node without one is not a site. */
  src: string;
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
 * need the original intact clone first — `structuredClone` is what both scripts
 * use, because the apply path re-runs its transform against a freshly locked row
 * and compares the result to the hash the dry run promised.
 *
 * ── WHAT DOES AND DOES NOT TAKE A NUMBER ──────────────────────────────────
 *
 * The ordinal has to be the number `article-renderer.tsx` would give the same
 * photograph, because the stored alt is supposed to be what a reader is served.
 * The renderer treats a figure and a gallery entry DIFFERENTLY, and this
 * mirrors it rather than tidying it:
 *
 *  - A FIGURE is numbered inside `if (src)`. A `figureBlock` with no `src` is
 *    the documented upload-failure state (`figure-block-view.tsx` writes
 *    `src: null`); the renderer paints nothing for it and gives it no number,
 *    so neither does this. It is not offered to `visit` either — there is no
 *    image there to describe.
 *  - A GALLERY claims its whole slice up front (`imageOrdinal.next +=
 *    images.length`) before any entry is looked at, so an entry the gallery
 *    renderer skips — a null, a bare string, an object with no `src` — still
 *    costs its number. It takes its ordinal and is not visited. A bad entry
 *    costs its own slot and nothing more, which is the same rule
 *    `content-media.ts` states for the same data.
 *
 * The one place this deliberately does NOT follow the renderer: a `data-images`
 * attribute that parses to something other than an array. `parseGallery` reads
 * that as no images; the renderer does `next += undefined` and poisons every
 * later ordinal with `NaN`. Copying that would spread a bug, not honour a
 * contract.
 *
 * ── WHY CHANGING THESE RULES WAS SAFE ─────────────────────────────────────
 *
 * Both rules moved AFTER `backfill-image-alt.mts` had already written 369
 * stored alts with the old ones, which would be a silent disaster on any
 * article the change renumbered: `vision-alt.mts` recomputes those strings to
 * find its targets, so a shifted ordinal matches nothing and the images are
 * never described while the run reports success. Checked against production on
 * 4 September 2026, across all 102 published articles: zero `image` or
 * `figureBlock` nodes without a `src`, zero `galleryBlock` nodes at all, and
 * therefore zero malformed gallery entries. The target set is byte-identical
 * before and after — 369 images, 14 articles, same ordinals, same URLs. Rerun
 * that census before trusting these rules against a corpus that has moved on.
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
      const src = attrs.src;
      // No src, no picture, no number. See the header.
      if (typeof src !== 'string' || !src) return;
      visit({
        ordinal: ordinal++,
        kind: n.type,
        alt: attrs.alt,
        src,
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
      for (const raw of images) {
        const img =
          raw && typeof raw === 'object'
            ? (raw as { src?: unknown; alt?: unknown; caption?: unknown })
            : null;
        const src = img?.src;
        if (typeof src !== 'string' || !src) {
          // Costs its slot in the sequence, and nothing else. Reading `.alt`
          // off a null here used to throw and take the whole migration with it.
          ordinal++;
          continue;
        }
        visit({
          ordinal: ordinal++,
          kind: 'gallery',
          alt: img.alt,
          src,
          caption: img.caption,
          heading,
          // Re-serialised HERE rather than after the loop. A flag read once the
          // loop has ended silently drops a write from a caller that holds on
          // to the site and calls `setAlt` later, and the point of one shared
          // walker is that it cannot quietly lose a guarantee.
          //
          // The whole attribute is re-encoded, so entries nobody described have
          // their stored BYTES normalised (quoting, spacing, number formatting)
          // even though nothing about them changed semantically. That is
          // deliberate: splicing one `"alt"` value out of a JSON string by hand
          // is a parser, and a parser is what `JSON.parse` already is.
          setAlt: (value) => {
            img.alt = value;
            if (n.attrs) n.attrs['data-images'] = JSON.stringify(images);
          },
        });
      }
      return;
    }
    // Everything else, `sectionBlock` included, is walked through.
    if (n.content) walk(n.content);
  };

  walk((doc as { content?: unknown } | null)?.content);
}
