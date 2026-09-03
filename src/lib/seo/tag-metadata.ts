/**
 * `/artikel/tag/[slug]`'s head, as two pure decisions the route can be tested
 * without a database.
 *
 * ── THE DESCRIPTION (Ahrefs 2026-08-28: "Meta description too short") ─────
 *
 * The route used to emit `Artikel bertag ${tag.name}` — 26 characters on
 * `/artikel/tag/rukun-nikah` — and, worse, a DIFFERENT string in
 * `og:description`, which appended " di HelloKahwin." that the `<meta
 * name="description">` did not have. One page, two descriptions, both too
 * short to be used as a snippet.
 *
 * `buildTagDescription` is now the single source for both, so they cannot
 * diverge again, and it is bounded: 120-155 characters for every tag name and
 * article count the corpus can produce. That range is asserted in
 * `__tests__/tag-metadata.test.ts` over the full input space rather than over
 * three examples, because the interesting failures are at the edges — a
 * three-letter tag falling under the floor, a forty-character tag sailing past
 * the ceiling.
 *
 * The site language is Malay (`<html lang="ms">`), so the sentence is Malay.
 */

import { truncateForMeta } from './meta';
import type { RobotsDirective } from './category-robots';

/** Everything after the brand, in the roomy form. */
const TAIL_LONG =
  ' — idea, tip dan panduan perkahwinan untuk pasangan Malaysia yang sedang merancang majlis impian.';
/** The same sentence with its final clause dropped, for long tag names. */
const TAIL_SHORT = ' — idea, tip dan panduan perkahwinan untuk pasangan Malaysia.';

/** Google truncates a snippet around here; Ahrefs warns below the floor. */
const MIN_LENGTH = 120;
const MAX_LENGTH = 155;

function compose(articleCount: number, tagName: string, tail: string): string {
  return `Himpunan ${articleCount} artikel bertag ${tagName} di HelloKahwin${tail}`;
}

/**
 * The one description `/artikel/tag/[slug]` serves — to `<meta name="description">`
 * and to `og:description` alike.
 *
 * Always names the tag and the article count, always lands in [120, 155].
 */
export function buildTagDescription(tagName: string, articleCount: number): string {
  const name = tagName.replace(/\s+/g, ' ').trim();
  const count = Number.isFinite(articleCount) ? Math.max(0, Math.trunc(articleCount)) : 0;

  const long = compose(count, name, TAIL_LONG);
  if (long.length <= MAX_LENGTH) return long;

  // Dropping the final clause costs 36 characters, so anything that overflowed
  // the ceiling above still clears the floor here. Only a tag name longer than
  // roughly 50 characters can overflow twice.
  const short = compose(count, name, TAIL_SHORT);
  if (short.length <= MAX_LENGTH) return short;

  // `MAX_LENGTH - 1`: truncateForMeta appends an ellipsis to its slice, so
  // asking for 155 can return 156.
  return truncateForMeta(short, MAX_LENGTH - 1);
}

/**
 * ── TAGS ARE NOINDEX, FULL STOP (decision D6, 2026-09-04) ─────────────────
 *
 * The route used to index any tag with two or more articles while
 * `app/sitemap.ts` listed none of them — 28 indexable pages the site never
 * advertised, every one a thin near-duplicate of a category listing. The two
 * halves disagreed, and the cheaper way to make them agree is to noindex the
 * lot: WP-imported tags are one- and two-card lists, and crawl budget belongs
 * to the articles.
 *
 * `follow` stays on, so the article links here are still crawled, and tags stay
 * out of the sitemap.
 *
 * Revisit the blanket rule when tags routinely carry five or more articles.
 */
export const TAG_ROBOTS: RobotsDirective = { index: false, follow: true };
