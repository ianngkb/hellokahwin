/**
 * The root layout's title, in one place.
 *
 * It lives here rather than inline in `src/app/layout.tsx` because it has three
 * consumers who must never disagree about it:
 *
 *   1. `src/app/layout.tsx` — declares it as `title.default` / `title.template`.
 *   2. `scripts/audit-rendered-titles.mts` — the rendered-title sweep decides
 *      "this page serves NO article title" by matching the default EXACTLY.
 *   3. `src/lib/seo/__tests__/article-metadata.test.ts` — asserts that no
 *      metadata path can resolve to it.
 *
 * When the default was a string literal in the layout, (2) and (3) were copies.
 * A copy of a string is a measurement that silently stops measuring: reword the
 * homepage title and the audit reports a clean sweep on a corpus that is still
 * broken, and the regression test passes against a value nothing produces
 * any more. Importing the real value makes a reworded default a loud failure
 * instead of a quiet one.
 */

/** What `<title>` says when NOTHING below the root layout supplied one. */
export const SITE_DEFAULT_TITLE = 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia';

/** Appended by Next to every non-absolute title a page returns. */
export const SITE_TITLE_TEMPLATE = '%s | HelloKahwin';

/**
 * The 14 characters the template costs a page title.
 *
 * Recorded because it is the constraint every title decision on this site is
 * made under and it keeps being rediscovered: Google prints roughly 60
 * characters, ` | HelloKahwin` takes 14 of them, so an article's own title has
 * about 46 before the brand is what gets cut.
 */
export const SITE_TITLE_SUFFIX_LENGTH = ' | HelloKahwin'.length;

/**
 * How many characters a page's OWN title has before Google starts cutting.
 *
 * Google prints roughly 60; the template above spends
 * `SITE_TITLE_SUFFIX_LENGTH` of them on the brand. Stated as a value rather
 * than left as arithmetic in three places because three consumers need the
 * same number and must not disagree about it: the admin editor's counter and
 * warning, `scripts/seo/apply-meta-titles.mts`, and the Ahrefs finding this
 * closes ("Title too long", 33 pages, 28 Ogos 2026).
 *
 * It is a WARNING threshold, not a limit. The editor still accepts a longer
 * title; a headline that needs the room is an editorial call, and the counter
 * exists so that call is made knowingly rather than by accident.
 */
export const SERP_TITLE_BUDGET = 60 - SITE_TITLE_SUFFIX_LENGTH;
