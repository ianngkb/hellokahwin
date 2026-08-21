import { boolean, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { userRoleEnum } from './enums';

/**
 * The minimal people table: admins (who are also the article authors) and
 * nothing else. twn-new's `profiles` additionally held every couple and vendor
 * on the site along with their console columns (`phone`, `lastSeenAt`,
 * `emailConfirmedAt`); none of that has a meaning here, so it is gone.
 *
 * Rows are provisioned on first authenticated admin action
 * (`ensureAdminProfile` in src/lib/auth/admin.ts, keyed by Clerk user id) and
 * by the WP importer for its house author. The table name is kept as
 * `profiles` because the ported Inspire code joins it by that name in dozens
 * of places.
 */
export const profiles = pgTable('profiles', {
  // Clerk user id (`user_2…`), or a stable literal for the importer's house author.
  id: text('id').primaryKey(),
  role: userRoleEnum('role').notNull(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  email: text('email').unique().notNull(),
  avatarUrl: text('avatar_url'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // ── Public author profile ────────────────────────────────────────────
  // `isLinkableAuthor` (src/lib/authors/gate.ts) is the ONE predicate that
  // decides whether a person is reachable by URL — role 'admin' AND
  // isPublicAuthor AND a non-null authorSlug. Every public surface calls it
  // rather than re-checking these columns itself.
  authorSlug: text('author_slug'),
  isPublicAuthor: boolean('is_public_author').default(false).notNull(),
  authorTitle: text('author_title'),
  authorBio: text('author_bio'),
  // Rendered as hrefs on a public page. Admin-authored only, and validated as
  // http(s) by `authorProfileSchema` in src/lib/validations/article.ts — there
  // is no DB-level CHECK here (twn-new had one; this schema does not).
  authorWebsiteUrl: text('author_website_url'),
  authorInstagramUrl: text('author_instagram_url'),
  authorLinkedinUrl: text('author_linkedin_url'),
});
