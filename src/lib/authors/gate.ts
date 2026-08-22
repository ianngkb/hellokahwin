/**
 * The public/private gate for author profiles — written ONCE, called by every
 * surface.
 *
 * `profiles` is not an authors table. It holds every couple and every vendor on
 * the site alongside the handful of staff accounts that write articles, so the
 * question "may this person's name become a link to a public page?" has exactly
 * one right answer and it must not be re-derived per surface. The byline, the
 * author box, the archive page, the sitemap, the JSON-LD and the admin author
 * picker all call `isLinkableAuthor` rather than testing the columns
 * themselves; that is what stops the rule drifting so that (say) the sitemap
 * lists a page the route 404s.
 *
 * Deliberately a pure module with no database import, so the surfaces that need
 * only the predicate — and the unit tests — don't drag a DB client in.
 */

/**
 * The house account's STABLE identity: its `profiles.id`.
 *
 * Keyed on the id rather than the email because the id is the primary key the
 * importer writes (`scripts/wp-import.ts`) and the value every imported
 * article's `author_id` points at — it cannot drift. The email previously used
 * here DID drift: `gate.ts` said `hello@hellokahwin.com` while the importer
 * wrote `editorial@hellokahwin.com`, so `listSelectableAuthors()` matched
 * nothing on production and every article save failed the attribution guard.
 * Both files now import this one constant so the identity is spelled once.
 */
export const HOUSE_AUTHOR_ID = 'hellokahwin-editorial';

/**
 * The email the house profile is created with. Only used when the importer
 * CREATES that row — never as an identity test; use `resolveHouseAuthorId()`
 * for that.
 */
export const HOUSE_AUTHOR_EMAIL = 'editorial@hellokahwin.com';

/**
 * The house account's id ON THIS INSTALLATION.
 *
 * `scripts/wp-import.ts` accepts `WP_IMPORT_AUTHOR_ID` to point an import at a
 * different house profile, so the app must honour the same override — with the
 * constant hardcoded, an installation using the override would attribute every
 * article to a profile `listSelectableAuthors()` refused to offer, which is the
 * exact failure this whole fix exists to remove. Resolved through ONE function
 * so the importer and the app can never disagree about who the house is.
 *
 * A function rather than a module constant on purpose: `gate.ts` is pulled into
 * client bundles (the byline, the author box), where a non-`NEXT_PUBLIC_` env
 * read is inlined as `undefined` at build time. Evaluating lazily means only
 * server callers ever read it, and a client bundle that somehow did would still
 * land on the correct default rather than on a baked-in wrong value.
 */
export function resolveHouseAuthorId(): string {
  return process.env.WP_IMPORT_AUTHOR_ID?.trim() || HOUSE_AUTHOR_ID;
}

/**
 * Ditto for the email the house profile is created with.
 */
export function resolveHouseAuthorEmail(): string {
  return process.env.WP_IMPORT_AUTHOR_EMAIL?.trim() || HOUSE_AUTHOR_EMAIL;
}

/** What the house account's byline reads as when no real author is credited. */
export const HOUSE_AUTHOR_NAME = 'HelloKahwin';

/**
 * The gate. THREE conditions, all required:
 *
 *   role === 'admin'   — a couple or vendor profile is never a public author,
 *                        whatever the other two columns say.
 *   isPublicAuthor     — an explicit, deliberate opt-in made in admin.
 *   authorSlug         — there is no page to link to without one.
 *
 * The flag and the slug are separate on purpose (see the spec's Design Notes):
 * a slug backfilled by some future script must not be able to publish someone
 * on its own.
 */
export function isLinkableAuthor(p: {
  role: string;
  isPublicAuthor: boolean;
  authorSlug: string | null;
}): boolean {
  return p.role === 'admin' && p.isPublicAuthor && !!p.authorSlug;
}

/**
 * Does a submitted `authorId` amount to a RE-ATTRIBUTION, i.e. must it clear
 * `listSelectableAuthors()` before it may be written?
 *
 * The editor posts the whole form on every manual save and on every 60-second
 * autosave, so `authorId` arrives on the wire whether or not the admin touched
 * the picker. Treating its mere presence as an attribution attempt made every
 * save of an article whose author is not in the selectable list — which on a
 * freshly imported database is every article — fail the guard. Only a value
 * that differs from the stored one is a change, and only a change needs
 * authorising: an admin still cannot MOVE an article onto an arbitrary profile.
 *
 * Pure so the rule can be unit-tested without a database, like the gate above.
 */
export function isAuthorReattribution(
  submittedAuthorId: string | null | undefined,
  currentAuthorId: string | null | undefined,
): boolean {
  return !!submittedAuthorId && submittedAuthorId !== currentAuthorId;
}

/**
 * The display name for a byline: the profile's real name, falling back to the
 * house brand when the profile carries neither part.
 *
 * The house account itself has `first_name = 'HelloKahwin'` and no
 * last name, so it lands on the same string through the first branch — which is
 * why callers can treat `name === HOUSE_AUTHOR_NAME` as "no real human here"
 * exactly as they did before this feature existed.
 */
export function authorDisplayName(p: {
  firstName: string | null;
  lastName: string | null;
}): string {
  return [p.firstName, p.lastName].filter(Boolean).join(' ').trim() || HOUSE_AUTHOR_NAME;
}

/** The public archive path for a slug. Relative — callers prefix the origin. */
export function authorArchivePath(slug: string): string {
  return `/artikel/author/${slug}`;
}

/**
 * Upper bound on one bulk re-attribution.
 *
 * A server action is a callable endpoint: without a cap any admin could post
 * every article id on the site and hold a transaction — and one of the five
 * pooled connections — well past the 8s role-level `statement_timeout`, which
 * is how this codebase has taken prod down before. 500 comfortably covers the
 * realistic job (moving a category's back catalogue off the house account) at
 * a single `UPDATE ... WHERE id IN (...)`.
 */
export const MAX_BULK_REASSIGN = 500;

/** Articles per page on the author archive, matching the tag/category archives. */
export const AUTHOR_ARTICLES_PER_PAGE = 16;

/** Ditto, when an in-grid banner is taking one of the slots. */
export const AUTHOR_ARTICLES_PER_PAGE_WITH_ADS = 14;

/**
 * Clamp a `?page=` value to a real page number. `parseInt` returns NaN for
 * junk and negative numbers are a valid parse, so both have to be excluded —
 * a negative page would produce a negative OFFSET and a Postgres error.
 */
export function resolveAuthorPage(raw: string | undefined): number {
  const parsed = parseInt(raw ?? '1', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

/** Total pages for a result count. Zero results is zero pages, never one. */
export function authorTotalPages(total: number, perPage: number): number {
  if (perPage <= 0) return 0;
  return Math.ceil(Number(total) / perPage);
}
