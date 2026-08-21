// SEO metadata helpers — pure, dependency-light, unit-tested.
//
// These are the single chokepoints for turning stored (often WordPress-imported)
// title/description data into clean values for Next.js `generateMetadata`.

import { decode } from 'he';

const BRAND = 'hellokahwin';

/**
 * Removes a trailing brand suffix from a stored article `meta_title`.
 *
 * The WordPress import generated `meta_title` as
 * `` `${title} | HelloKahwin`.slice(0, 70) ``, which frequently cut the
 * brand mid-word ("… | The Wedding Note", "… | The", or a bare dangling "|").
 * The root layout's `title.template = '%s | HelloKahwin'` then RE-appends
 * the brand at render, producing doubled/garbled titles. This strips a trailing
 * separator (a `|`, or a whitespace-padded dash) followed by *any prefix* of
 * "hellokahwin", plus bare dangling separators — looping until stable —
 * so the template owns the single brand.
 *
 * A trailing fragment that is NOT a prefix of the brand (e.g. "The Knot") is
 * preserved, as is an internal pipe inside a real title.
 */
export function stripBrandSuffix(raw?: string | null): string {
  let s = (raw ?? '').trim();
  for (;;) {
    // 1. Drop a bare dangling separator at the end: "Foo |" / "Foo —".
    let next = s.replace(/(?:\s*\||\s+[–—-])\s*$/u, '').trim();
    if (next.toLowerCase() === BRAND) {
      // 2. The whole remaining string IS the brand, with no separator
      //    (e.g. a stored meta_title of "HelloKahwin") → drop it so
      //    the root title.template doesn't double it.
      next = '';
    } else {
      // 3. Drop "separator + tail" when the tail is a prefix of the brand.
      //    Greedy leading group → the tail is the LAST segment after a real
      //    separator (pipe, or space-padded dash so intra-word hyphens survive).
      const m = next.match(/^(.*)(?:\s*\||\s+[–—-])\s+(.+)$/u);
      if (m) {
        const tail = m[2].trim().toLowerCase();
        if (tail.length > 0 && BRAND.startsWith(tail)) {
          next = m[1].trim();
        }
      }
    }
    if (next === s) return s;
    s = next;
  }
}

/**
 * Decodes HTML entities (e.g. `&#8217;`, `&#038;`, `&hellip;`, `&amp;`) left in
 * WordPress-imported text. Wraps `he.decode`, decoding to a FIXED POINT so
 * double-encoded values (`&amp;amp;` → `&amp;` → `&`) are fully resolved and the
 * result is stable on re-run (idempotent backfill). Null/undefined → "".
 */
export function decodeMetaEntities(raw?: string | null): string {
  let s = raw ?? '';
  for (let i = 0; i < 5; i++) {
    const next = decode(s);
    if (next === s) break;
    s = next;
  }
  return s;
}

/**
 * Collapses whitespace and truncates to `max` chars on the last word boundary,
 * appending an ellipsis. Short inputs are returned untouched.
 */
export function truncateForMeta(text: string, max = 155): string {
  const collapsed = text.replace(/\s+/g, ' ').trim();
  if (collapsed.length <= max) return collapsed;
  const slice = collapsed.slice(0, max);
  const lastSpace = slice.lastIndexOf(' ');
  const truncated = lastSpace > Math.floor(max * 0.65) ? slice.slice(0, lastSpace) : slice;
  return `${truncated}…`;
}

/**
 * Builds an article's meta description from the best available source, decoding
 * entities throughout: `metaDescription` → `excerpt` → truncated body text.
 * Returns null when nothing usable exists (caller omits the tag).
 */
export function buildArticleDescription(input: {
  metaDescription?: string | null;
  excerpt?: string | null;
  bodyText?: string | null;
}): string | null {
  const meta = decodeMetaEntities(input.metaDescription).replace(/\s+/g, ' ').trim();
  if (meta) return meta;
  const ex = decodeMetaEntities(input.excerpt).replace(/\s+/g, ' ').trim();
  if (ex) return ex;
  const body = decodeMetaEntities(input.bodyText).replace(/\s+/g, ' ').trim();
  if (!body) return null;
  return truncateForMeta(body, 155);
}
