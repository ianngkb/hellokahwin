import {
  pgTable,
  text,
  integer,
  uuid,
  jsonb,
  timestamp,
  boolean,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { articles, inspireCategories, inspireTags } from './articles';

// ── Dynamic Blocks ────────────────────────────────────────────────────
// Reusable Tiptap content blocks merged into matching articles at render
// time (START prepend / END append), or embedded manually via the
// `dynamicBlockEmbed` atom node in the article editor. See
// src/lib/inspire/dynamic-blocks.ts for the injection engine.

export const dynamicBlocks = pgTable(
  'dynamic_blocks',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    content: jsonb('content'),
    placement: text('placement').notNull().default('end'), // 'start' | 'end'
    status: text('status').notNull().default('draft'), // 'draft' | 'published'
    isActive: boolean('is_active').notNull().default(true),
    displayOrder: integer('display_order').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('dynamic_blocks_status_idx').on(table.status)],
);

// Targeting rules — each row attaches a block to exactly one of: a category
// (primary OR secondary match), a tag, or a specific article. Enforced by a
// CHECK constraint in migration 0128.
export const dynamicBlockRules = pgTable(
  'dynamic_block_rules',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    blockId: uuid('block_id')
      .notNull()
      .references(() => dynamicBlocks.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id').references(() => inspireCategories.id, {
      onDelete: 'cascade',
    }),
    tagId: uuid('tag_id').references(() => inspireTags.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id').references(() => articles.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('dynamic_block_rules_block_id_idx').on(table.blockId),
    index('dynamic_block_rules_category_id_idx').on(table.categoryId),
    index('dynamic_block_rules_tag_id_idx').on(table.tagId),
    index('dynamic_block_rules_article_id_idx').on(table.articleId),
    uniqueIndex('dynamic_block_rules_block_category_uniq')
      .on(table.blockId, table.categoryId)
      .where(sql`category_id IS NOT NULL`),
    uniqueIndex('dynamic_block_rules_block_tag_uniq')
      .on(table.blockId, table.tagId)
      .where(sql`tag_id IS NOT NULL`),
    uniqueIndex('dynamic_block_rules_block_article_uniq')
      .on(table.blockId, table.articleId)
      .where(sql`article_id IS NOT NULL`),
  ],
);

export const dynamicBlocksRelations = relations(dynamicBlocks, ({ many }) => ({
  rules: many(dynamicBlockRules),
}));

export const dynamicBlockRulesRelations = relations(dynamicBlockRules, ({ one }) => ({
  block: one(dynamicBlocks, {
    fields: [dynamicBlockRules.blockId],
    references: [dynamicBlocks.id],
  }),
  category: one(inspireCategories, {
    fields: [dynamicBlockRules.categoryId],
    references: [inspireCategories.id],
  }),
  tag: one(inspireTags, {
    fields: [dynamicBlockRules.tagId],
    references: [inspireTags.id],
  }),
  article: one(articles, {
    fields: [dynamicBlockRules.articleId],
    references: [articles.id],
  }),
}));

export type DynamicBlock = typeof dynamicBlocks.$inferSelect;
export type NewDynamicBlock = typeof dynamicBlocks.$inferInsert;
export type DynamicBlockRule = typeof dynamicBlockRules.$inferSelect;
export type NewDynamicBlockRule = typeof dynamicBlockRules.$inferInsert;
