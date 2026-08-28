/**
 * The robots decision for `/artikel/[category]`, as one pure table.
 *
 * WHY THIS IS A MODULE AND NOT FOUR `return` STATEMENTS.
 *
 * RISK-07: six child-category hubs — `hiasan-dekorasi`, `moden-kontemporari`,
 * `fotografi-videografi`, `glamor-eksklusif`, `minimalis-mewah` and
 * `pantai-santai` — were advertised in the sitemap while the route served them
 * `<meta name="robots" content="noindex, follow">`. Google crawled all six on
 * 23 Aug 2026 and excluded all six. The rule that decided it lived inline in
 * `generateMetadata`, spread across four exits, and could only be exercised by
 * rendering the route against a database. A rule nobody can unit-test is a rule
 * nobody reviews, which is how it went wrong and how it stayed wrong.
 *
 * ── AND WHY THE INDEXABLE CASE IS NOW EXPLICIT ────────────────────────────
 *
 * The route used to say nothing at all for an indexable hub — no `robots` key,
 * so no meta tag, so "indexable by default". That is correct for Google and
 * useless for us, because `generateMetadata` ALSO returns `{}` when the
 * category lookup blows its 3s deadline. Absent robots meta therefore has two
 * meanings that look identical on the wire:
 *
 *     indexable, as designed        →  (no robots meta)
 *     metadata render failed        →  (no robots meta)
 *
 * The whole failure shape of RISK-07 was a page whose robots state nobody could
 * read off the artefact the consumer receives. So an indexable hub now SAYS SO:
 * `<meta name="robots" content="index, follow"/>`. It changes nothing for
 * Google — `index, follow` is the default it already assumed — and it makes the
 * live HTML self-evidencing, which is the only kind of proof this project
 * accepts. `curl | grep robots` now distinguishes the two cases above.
 */

/** What a `Metadata['robots']` object needs from us. Narrower than Next's type on purpose. */
export interface RobotsDirective {
  index: boolean;
  follow: boolean;
}

/**
 * The facts the route has already computed by the time it decides. Each variant
 * is one exit of `generateMetadata`, in the order the route reaches them.
 */
export type CategoryRobotsFacts =
  /**
   * A child or grandchild hub, reached at its own `/artikel/{slug}` URL.
   * Indexable exactly when it owns a published article — because then its slug
   * is the middle segment of that article's canonical URL and the hub is the
   * folder those articles live in, not an orphaned duplicate of its parent.
   */
  | { view: 'child-hub'; ownsPublishedArticles: boolean }
  /** A top-level hub with no `?sub=`. Indexable when anything in its subtree is published. */
  | { view: 'base-hub'; subtreeArticleCount: number }
  /** `?sub=` naming a slug that is not a child or grandchild — the page 404s on render. */
  | { view: 'invalid-sub' }
  /** `?sub=` naming a real child/grandchild. A real navigation surface; index it when it has something. */
  | { view: 'valid-sub'; subtreeArticleCount: number };

const INDEXABLE: RobotsDirective = { index: true, follow: true };
/** Thin or duplicate, but the article links on it are still worth crawling. */
const NOINDEX_FOLLOW: RobotsDirective = { index: false, follow: true };
/** The page itself 404s; do not spend crawl budget on the links either. */
const NOINDEX_NOFOLLOW: RobotsDirective = { index: false, follow: false };

export function categoryRobots(facts: CategoryRobotsFacts): RobotsDirective {
  switch (facts.view) {
    case 'child-hub':
      return facts.ownsPublishedArticles ? INDEXABLE : NOINDEX_FOLLOW;
    case 'base-hub':
      return facts.subtreeArticleCount > 0 ? INDEXABLE : NOINDEX_FOLLOW;
    case 'invalid-sub':
      return NOINDEX_NOFOLLOW;
    case 'valid-sub':
      return facts.subtreeArticleCount > 0 ? INDEXABLE : NOINDEX_FOLLOW;
  }
}

/**
 * What the route falls back to when a deadline expires and it cannot establish
 * the facts above.
 *
 * FAIL OPEN, deliberately. `unstable_cache(..., { revalidate: false })` caches
 * whatever a render produced for as long as the tag lives, so one transient DB
 * blip during one render would otherwise pin `noindex` on a hub that owns live
 * article URLs — RISK-07's exact defect, re-created by its own error path. An
 * over-indexed thin hub is recoverable in a week; a stuck `noindex` costs
 * rankings until somebody notices, and RISK-07 is the proof that nobody does.
 */
export const ROBOTS_ON_DEADLINE_MISS: RobotsDirective = INDEXABLE;
