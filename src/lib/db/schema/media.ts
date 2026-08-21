import {
  pgTable,
  text,
  integer,
  uuid,
  jsonb,
  timestamp,
  index,
  unique,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { mediaSourceEnum } from './enums';
import { articles } from './articles';
import { profiles } from './profiles';
import type { ImageVariants } from '@/lib/storage/image-variants';
import type { SmartCrops, FocalPoint } from '@/lib/storage/smart-crop';

// ── Media table ──────────────────────────────────────────────────────────

export const media = pgTable(
  'media',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    filename: text('filename').notNull(),
    r2Key: text('r2_key').notNull(),
    url: text('url').notNull(),
    originalUrl: text('original_url').notNull(),
    mimeType: text('mime_type').notNull(),
    fileSize: integer('file_size').notNull(),
    width: integer('width'),
    height: integer('height'),
    alt: text('alt').default(''),
    caption: text('caption').default(''),
    captionUrl: text('caption_url'),
    variants: jsonb('variants').$type<ImageVariants>(),
    defaultQuality: text('default_quality').default('high'),
    smartCrops: jsonb('smart_crops').$type<SmartCrops>(),
    focalPoint: jsonb('focal_point').$type<FocalPoint>(),
    detectionData: jsonb('detection_data'),
    source: mediaSourceEnum('source').notNull(),
    originalArticleId: uuid('original_article_id').references(() => articles.id, {
      onDelete: 'set null',
    }),
    parentMediaId: uuid('parent_media_id'),
    uploadedBy: text('uploaded_by')
      .notNull()
      .references(() => profiles.id),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('idx_media_r2_key_unique').on(table.r2Key),
    // `url` is looked up by exact match when reconciling media_article_usage on
    // every article save; without this it was a full seq scan (see migration
    // 20260802161833_media_url_index.sql).
    index('idx_media_url').on(table.url),
    index('idx_media_source').on(table.source),
    index('idx_media_original_article_id').on(table.originalArticleId),
    index('idx_media_created_at').on(table.createdAt),
    index('idx_media_uploaded_by').on(table.uploadedBy),
    index('idx_media_parent_media_id').on(table.parentMediaId),
  ],
);

// ── Media article usage junction table ───────────────────────────────────

export const mediaArticleUsage = pgTable(
  'media_article_usage',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    mediaId: uuid('media_id')
      .notNull()
      .references(() => media.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    unique('media_article_usage_unique').on(table.mediaId, table.articleId),
    index('idx_media_article_usage_article_id').on(table.articleId),
  ],
);

// ── Relations ────────────────────────────────────────────────────────────

export const mediaRelations = relations(media, ({ one, many }) => ({
  originalArticle: one(articles, {
    fields: [media.originalArticleId],
    references: [articles.id],
  }),
  uploader: one(profiles, {
    fields: [media.uploadedBy],
    references: [profiles.id],
  }),
  articleUsages: many(mediaArticleUsage),
}));

export const mediaArticleUsageRelations = relations(mediaArticleUsage, ({ one }) => ({
  media: one(media, {
    fields: [mediaArticleUsage.mediaId],
    references: [media.id],
  }),
  article: one(articles, {
    fields: [mediaArticleUsage.articleId],
    references: [articles.id],
  }),
}));

// ── Inferred types ───────────────────────────────────────────────────────

export type Media = typeof media.$inferSelect;
export type NewMedia = typeof media.$inferInsert;
export type MediaArticleUsage = typeof mediaArticleUsage.$inferSelect;
