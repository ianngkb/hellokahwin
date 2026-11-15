/**
 * Shared constants for section-level drop-off ("where in the article readers
 * stop"). Its own module with no `server-only` import so BOTH the public
 * `ArticleSectionTracker` (client) and the admin dashboard (client) can use
 * them; `@/lib/analytics/article-sections` re-exports them for server callers.
 */

/** The event the public article page emits as each body section is reached. */
export const SECTION_REACHED_EVENT = 'section_reached';

/**
 * The FALLBACK floor (UTC ISO instant) for section drop-off: no
 * `section_reached` event can exist before the production deploy that ships
 * the tracker, and there is no backfill. It bounds statement 1, it is the
 * caption's "collecting since …" date, and it floors the "opened" denominator
 * ONLY for an article that has no recorded section yet.
 *
 * AUTHORITATIVE for the denominator is the per-article first-seen instant
 * (`openedFloor` in `article-sections.ts`): pageviews count only from
 * GREATEST(this constant, the article's earliest recorded `section_reached`).
 * So deploy-day visitors who opened an article before the tracker was live —
 * and could never emit a `section_reached` — cannot inflate "Introduction",
 * whatever the exact deploy instant was (T7-F4).
 *
 * ⚠ SHIP-TIME CONSTANT (HelloKahwin): set this to the production deploy's
 * completion time, rounded UP to the next minute. A value a little later than
 * the deploy only drops a few minutes of data; an earlier one is harmless for
 * any article with recorded sections.
 */
export const SECTION_TRACKING_SINCE = '2026-11-16T00:00:00.000Z';

/**
 * At most this many headings are observed per page load (plus the end-of-
 * article sentinel), so one read can never enqueue more than 61 rows.
 */
export const MAX_TRACKED_SECTIONS = 60;

/** Heading text sent with each event is cut to this many characters. */
export const MAX_SECTION_HEADING_CHARS = 80;

/**
 * The DOM selector for an article's section headings: every `h2`/`h3` that is
 * a DIRECT child of one of the renderer's injected HTML parts. Excludes the
 * ang pow rate table's `h3`s (nested inside its own `<section>`), venue cards
 * (`<aside>`) and everything outside the body ("Related articles", sidebar).
 * Written as a selector list rather than `:is()` for older browsers; a list
 * still returns matches in document order. `countBodySections`
 * (`@/lib/analytics/body-sections`) counts the same set from the stored JSON.
 */
export const SECTION_HEADING_SELECTOR = '.inspire-prose > div > h2, .inspire-prose > div > h3';

/** Collapse whitespace and cut to MAX_SECTION_HEADING_CHARS code points. */
export function normaliseSectionHeading(text: string | null | undefined): string {
  const flat = (text ?? '').replace(/\s+/g, ' ').trim();
  return Array.from(flat).slice(0, MAX_SECTION_HEADING_CHARS).join('');
}
