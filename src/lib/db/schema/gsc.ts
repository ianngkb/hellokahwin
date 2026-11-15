import {
  date,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uuid,
} from 'drizzle-orm/pg-core';
import { articles } from './articles';

/**
 * Google Search Console readback, ported from The Wedding Notebook (its
 * migration 0133) and cut down to the two tables the article analytics read:
 * which URLs Google reported (`gsc_pages`) and their clicks / impressions per
 * day (`gsc_page_daily`). TWN's query windows, URL inspection and listing links
 * are not ported — nothing in HelloKahwin reads them.
 *
 * Filled nightly by `/api/cron/gsc-sync` (src/lib/gsc/sync.ts).
 *
 * The one load-bearing rule: `gsc_page_daily` has NO `position` column, only
 * `position_sum` (= position × impressions). Google's position is an
 * impression-weighted average, so AVG()-ing it across rows is silently wrong.
 * Always read it as `SUM(position_sum) / NULLIF(SUM(impressions), 0)`.
 *
 * RLS on with no policies (migrations-pending/analytics.sql), like every other
 * table in `public` (0001_enable_rls_public_schema.sql).
 */

export const gscPages = pgTable(
  'gsc_pages',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Canonical `https://hellokahwin.com{path}` — Google's raw URLs collapse onto it. */
    url: text('url').notNull(),
    path: text('path').notNull(),
    /** 'home' | 'article' | 'category' | 'tag' | 'author' | 'static' | 'other'. */
    entityType: text('entity_type').notNull().default('other'),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
    slug: text('slug'),
    /** Reporting only — never a join key. Articles get recategorised; slugs don't. */
    categorySlug: text('category_slug'),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).defaultNow().notNull(),
    resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  },
  (table) => [
    unique('gsc_pages_url_unique').on(table.url),
    index('gsc_pages_article_id_idx').on(table.articleId),
    index('gsc_pages_slug_idx').on(table.slug),
  ],
);

export const gscPageDaily = pgTable(
  'gsc_page_daily',
  {
    pageId: uuid('page_id')
      .notNull()
      .references(() => gscPages.id, { onDelete: 'cascade' }),
    /** Google's own calendar day (US Pacific), as Search Console reports it. */
    date: date('date').notNull(),
    clicks: integer('clicks').notNull().default(0),
    impressions: integer('impressions').notNull().default(0),
    /** position × impressions. NOT the average — see the file header. */
    positionSum: doublePrecision('position_sum').notNull().default(0),
    /** 'all' while Google may still revise the day, 'final' once settled. */
    dataState: text('data_state').notNull().default('final'),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    primaryKey({ name: 'gsc_page_daily_pkey', columns: [table.pageId, table.date] }),
    index('gsc_page_daily_date_page_idx').on(table.date, table.pageId),
  ],
);

export type GscPage = typeof gscPages.$inferSelect;
export type GscPageInsert = typeof gscPages.$inferInsert;
export type GscPageDaily = typeof gscPageDaily.$inferSelect;
