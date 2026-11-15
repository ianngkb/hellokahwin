import { index, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { articles } from './articles';
import { profiles } from './profiles';

/**
 * Before/after tests of an article's Google title (ported from The Wedding
 * Notebook). Each row records one change of `articles.meta_title` made from the
 * Title tests tab on /admin/inspire/analytics; the tab compares the stored
 * Google numbers (`gsc_page_daily`) either side of `startedAt`.
 *
 * `oldTitle` / `newTitle` are the titles Google was given (the meta title, or
 * the article title when that was empty), kept here because the article row
 * only remembers the latest one. At most one running test (`endedAt` null) per
 * article.
 *
 * RLS on with no policies (migrations-pending/analytics.sql).
 */
export const articleTitleTests = pgTable(
  'article_title_tests',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    /** The title Google was given before the change. */
    oldTitle: text('old_title').notNull(),
    /** The title Google is given during the test. */
    newTitle: text('new_title').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    createdBy: text('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex('article_title_tests_one_running_idx')
      .on(t.articleId)
      .where(sql`${t.endedAt} IS NULL`),
    index('article_title_tests_started_idx').on(t.startedAt.desc()),
  ],
);

export type ArticleTitleTest = typeof articleTitleTests.$inferSelect;
export type NewArticleTitleTest = typeof articleTitleTests.$inferInsert;
