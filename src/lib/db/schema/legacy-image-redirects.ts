import { pgTable, text, integer, smallint, uuid, timestamp, index } from 'drizzle-orm/pg-core';
import { media } from './media';
import { articles } from './articles';

export const legacyImageRedirects = pgTable(
  'legacy_image_redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    wpUrl: text('wp_url').unique().notNull(),
    wpFilename: text('wp_filename').notNull(),
    wpSizeSuffix: text('wp_size_suffix'),
    wpYear: smallint('wp_year').notNull(),
    wpMonth: smallint('wp_month').notNull(),
    mappingTier: text('mapping_tier')
      .notNull()
      .$type<'exact_image' | 'article_fallback' | 'inspire_fallback' | 'unmapped'>(),
    mediaId: uuid('media_id').references(() => media.id, { onDelete: 'set null' }),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'set null' }),
    wpPostId: integer('wp_post_id'),
    imageDestinationUrl: text('image_destination_url').notNull(),
    articleDestinationUrl: text('article_destination_url').notNull(),
    hitCount: integer('hit_count').notNull().default(0),
    imageHitCount: integer('image_hit_count').notNull().default(0),
    articleHitCount: integer('article_hit_count').notNull().default(0),
    firstHitAt: timestamp('first_hit_at', { withTimezone: true }),
    lastHitAt: timestamp('last_hit_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('legacy_image_redirects_mapping_tier_idx').on(table.mappingTier),
    index('legacy_image_redirects_article_id_idx').on(table.articleId),
    index('legacy_image_redirects_last_hit_at_idx').on(table.lastHitAt),
  ],
);

export type LegacyImageRedirect = typeof legacyImageRedirects.$inferSelect;
export type NewLegacyImageRedirect = typeof legacyImageRedirects.$inferInsert;
