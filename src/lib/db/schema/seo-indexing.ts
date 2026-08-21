import { pgTable, text, integer, uuid, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { articles } from './articles';

export const seoIndexnowSubmissions = pgTable(
  'seo_indexnow_submissions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    url: text('url').notNull(),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
    submittedAt: timestamp('submitted_at', { withTimezone: true }).defaultNow().notNull(),
    success: boolean('success').notNull(),
    httpStatus: integer('http_status'),
    error: text('error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_seo_indexnow_submissions_article_id').on(table.articleId),
    index('idx_seo_indexnow_submissions_submitted_at').on(table.submittedAt),
    index('idx_seo_indexnow_submissions_failures').on(table.success, table.submittedAt),
  ],
);

export type SeoIndexnowSubmission = typeof seoIndexnowSubmissions.$inferSelect;
export type NewSeoIndexnowSubmission = typeof seoIndexnowSubmissions.$inferInsert;
