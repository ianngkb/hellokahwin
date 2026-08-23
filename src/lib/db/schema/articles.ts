import {
  pgTable,
  text,
  integer,
  uuid,
  jsonb,
  timestamp,
  index,
  uniqueIndex,
  unique,
  boolean,
  type AnyPgColumn,
} from 'drizzle-orm/pg-core';
import { customType } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { articleAuthorshipEnum, articleReviewStatusEnum, articleStatusEnum } from './enums';
import { profiles } from './profiles';

// Custom type for the search column (managed by migration, not Drizzle push).
// HelloKahwin drops twn-new's pgvector text-embedding column — no semantic
// search here, so the target DB needs no `vector` extension.
const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector';
  },
});

// ── Tags ──────────────────────────────────────────────────────────────

export const inspireTags = pgTable(
  'inspire_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    wpId: integer('wp_id'),
    // Admin-only tag: selectable in the admin editor, stripped from every
    // public read path (see migration 0130_inspire_tags_hidden.sql).
    isHidden: boolean('is_hidden').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('inspire_tags_slug_idx').on(table.slug),
    // Keyed on name so the partial index also supplies the admin filter's
    // `order by name` (see migration 0130_inspire_tags_hidden.sql).
    index('inspire_tags_hidden_idx')
      .on(table.name)
      .where(sql`${table.isHidden}`),
  ],
);

export const inspireTagsRelations = relations(inspireTags, ({ many }) => ({
  articleTags: many(articleTags),
}));

export const articleTags = pgTable(
  'article_tags',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    tagId: uuid('tag_id')
      .notNull()
      .references(() => inspireTags.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('article_tags_unique').on(table.articleId, table.tagId),
    index('article_tags_tag_id_idx').on(table.tagId),
  ],
);

export const articleTagsRelations = relations(articleTags, ({ one }) => ({
  article: one(articles, {
    fields: [articleTags.articleId],
    references: [articles.id],
  }),
  tag: one(inspireTags, {
    fields: [articleTags.tagId],
    references: [inspireTags.id],
  }),
}));

export const inspireCategories = pgTable(
  'inspire_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    slug: text('slug').unique().notNull(),
    description: text('description'),
    parentId: uuid('parent_id'),
    displayOrder: integer('display_order').default(0),
    wpId: integer('wp_id'),
    // ── Topical-authority architecture (approved cluster plan, 23 Aug 2026) ──
    //
    // A PILLAR is a top-level category (`isPillar`, `parentId` NULL); a CLUSTER
    // is its child. Modelling them as categories rather than bespoke pages is
    // what makes the link graph maintain itself: assigning an article to a
    // cluster is the ONLY act required for the pillar to list it and for the
    // article to link back up. The plan maps 204 articles across 26 clusters,
    // and a hand-maintained link graph at that size does not survive the
    // publishing cadence.
    //
    // All four are NULLABLE on purpose. The 24 categories imported from
    // WordPress predate the concept and must keep working untouched.
    /** `P1`…`P7` on a pillar, `C1.1`…`C7.5` on a cluster. NULL on legacy rows. */
    pillarCode: text('pillar_code'),
    /**
     * The Malay entity phrase used as anchor text whenever anything links to
     * this category — a pillar's head term, or a cluster's head keyword. The
     * plan is explicit that anchors are the target entity phrase, never "baca
     * lagi". Falls back to `name` when absent.
     */
    entityPhrase: text('entity_phrase'),
    /** A pillar page's editorial introduction. One paragraph per blank line. */
    intro: text('intro'),
    isPillar: boolean('is_pillar').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('inspire_categories_slug_idx').on(table.slug),
    index('inspire_categories_parent_id_idx').on(table.parentId),
    // Partial + unique: the seed script matches on this to guarantee it never
    // touches a row it did not create, and two categories claiming the same
    // pillar code would silently split a cluster's articles across two hubs.
    uniqueIndex('inspire_categories_pillar_code_idx')
      .on(table.pillarCode)
      .where(sql`${table.pillarCode} IS NOT NULL`),
  ],
);

export const inspireCategoriesRelations = relations(inspireCategories, ({ one, many }) => ({
  parent: one(inspireCategories, {
    fields: [inspireCategories.parentId],
    references: [inspireCategories.id],
    relationName: 'category_parent',
  }),
  children: many(inspireCategories, { relationName: 'category_parent' }),
  articleCategories: many(articleCategories),
}));

export const articles = pgTable(
  'articles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    slug: text('slug').unique().notNull(),
    excerpt: text('excerpt'),
    content: jsonb('content'),
    coverImageUrl: text('cover_image_url'),
    coverImageVariants: jsonb('cover_image_variants'),
    coverImageQuality: text('cover_image_quality'),
    coverImageFocalPoint: jsonb('cover_image_focal_point'),
    coverImageDetectionData: jsonb('cover_image_detection_data'),
    coverImageSmartCrops: jsonb('cover_image_smart_crops'),
    coverImageFocalPointOverride: jsonb('cover_image_focal_point_override'),
    fts: tsvector('fts'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    // Curated < 50-char board title for the Pinterest outbound export (the raw
    // title is often too long). Generated by scripts/generate-pinterest-board-names.ts.
    pinterestBoardName: text('pinterest_board_name'),
    // SUPERSEDED by `authorship` below, but deliberately NOT dropped in this
    // release. These two are the rollback net: if the Vercel deploy is rolled
    // back but the migration is not — the realistic failure mode — the previous
    // code reads these, and keeping them written means a rollback still shows
    // the AI badge correctly instead of showing every article as human-written.
    // Every writer of `authorship`/`reviewStatus` mirrors into these two.
    // Dropping them is a follow-up migration requiring the CEO's approval.
    isAiGenerated: boolean('is_ai_generated').notNull().default(false),
    humanReviewedAt: timestamp('human_reviewed_at', { withTimezone: true }),

    // ── AI authorship + review tracking (internal only) ──────────────
    // NOT NULL, so "nobody set it" is impossible rather than merely
    // discouraged. The column default is 'ai' and not 'human' on purpose: it
    // is the fail-safe direction. A code path that forgets to set authorship
    // lands the article in the owner's review queue, which costs one
    // dismissal. Defaulting to 'human' would let a forgotten AI article escape
    // review entirely — the exact failure this tag exists to prevent. Both
    // real writers set it explicitly anyway (ingest -> 'ai', the admin
    // new-article path -> 'human'), so the default only ever catches a bug.
    authorship: articleAuthorshipEnum('authorship').notNull().default('ai'),
    reviewStatus: articleReviewStatusEnum('review_status').notNull().default('pending_review'),
    reviewedAt: timestamp('reviewed_at', { withTimezone: true }),
    // Nullable text -> profiles.id, matching articles.authorId and
    // auditLogs.performedBy (profiles.id is a Clerk id string, not a uuid).
    // ON DELETE SET NULL: losing an admin's profile must never delete an
    // article, and must never silently un-review one either — the timestamp
    // survives, the attribution does not.
    reviewedBy: text('reviewed_by').references(() => profiles.id, { onDelete: 'set null' }),

    status: articleStatusEnum('status').notNull().default('draft'),
    // Unguessable client-review link (`/draft/{token}`). NULL = never generated
    // or revoked; revoking is setting this back to NULL. Not cleared on publish
    // — the route issues a TEMPORARY (307) redirect to the live URL instead.
    // Temporary is load-bearing for the self-healing claim: a 308 would be
    // cached by the client's browser forever, so unpublishing the article could
    // never bring their link back. With a 307 every visit is re-decided, and an
    // unpublished article starts rendering the draft again.
    shareToken: text('share_token'),
    authorId: text('author_id')
      .notNull()
      .references(() => profiles.id),
    primaryCategoryId: uuid('primary_category_id').references(() => inspireCategories.id, {
      onDelete: 'set null',
    }),
    publishedAt: timestamp('published_at', { withTimezone: true }),
    scheduledPublishAt: timestamp('scheduled_publish_at', { withTimezone: true }),
    wpId: integer('wp_id'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('articles_slug_idx').on(table.slug),
    index('articles_status_idx').on(table.status),
    index('articles_primary_category_id_idx').on(table.primaryCategoryId),
    index('articles_published_at_idx').on(table.publishedAt),
    index('articles_cover_image_url_idx').on(table.coverImageUrl),
    // Partial: only issued tokens are indexed, so the mostly-NULL column costs
    // nothing on write while every live token stays unique.
    uniqueIndex('idx_articles_share_token')
      .on(table.shareToken)
      .where(sql`${table.shareToken} IS NOT NULL`),
    // The owner's primary workflow: "everything AI-produced I have not reviewed
    // yet", plus the pending-first sort. Not partial — `pending_review` is the
    // majority value today, so a partial index would cover almost every row and
    // buy nothing.
    index('articles_review_queue_idx').on(table.reviewStatus, table.authorship),
  ],
);

export const articlesRelations = relations(articles, ({ one, many }) => ({
  author: one(profiles, {
    fields: [articles.authorId],
    references: [profiles.id],
  }),
  primaryCategory: one(inspireCategories, {
    fields: [articles.primaryCategoryId],
    references: [inspireCategories.id],
  }),
  articleCategories: many(articleCategories),
  articleTags: many(articleTags),
}));

export const articleCategories = pgTable(
  'article_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => inspireCategories.id, { onDelete: 'cascade' }),
  },
  (table) => [
    unique('article_categories_unique').on(table.articleId, table.categoryId),
    index('article_categories_category_id_idx').on(table.categoryId),
  ],
);

export const articleCategoriesRelations = relations(articleCategories, ({ one }) => ({
  article: one(articles, {
    fields: [articleCategories.articleId],
    references: [articles.id],
  }),
  category: one(inspireCategories, {
    fields: [articleCategories.categoryId],
    references: [inspireCategories.id],
  }),
}));

export const articleCategoryRedirects = pgTable(
  'article_category_redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    fromCategorySlug: text('from_category_slug').notNull(),
    toCategorySlug: text('to_category_slug').notNull(),
    changedByName: text('changed_by_name').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index('article_category_redirects_article_id_idx').on(table.articleId)],
);

export const articleEditLocks = pgTable('article_edit_locks', {
  id: uuid('id').primaryKey().defaultRandom(),
  articleId: uuid('article_id')
    .notNull()
    .references(() => articles.id, { onDelete: 'cascade' })
    .unique(),
  lockedBy: text('locked_by')
    .notNull()
    .references(() => profiles.id, { onDelete: 'cascade' }),
  lockedByName: text('locked_by_name').notNull(),
  lockedAt: timestamp('locked_at', { withTimezone: true }).defaultNow().notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});

// ── Inspire Nav Items ────────────────────────────────────────────────

export const inspireNavItems = pgTable(
  'inspire_nav_items',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type').notNull(), // 'category' | 'custom_link'
    label: text('label').notNull(),
    categoryId: uuid('category_id').references(() => inspireCategories.id, { onDelete: 'cascade' }),
    url: text('url'),
    parentId: uuid('parent_id'),
    position: integer('position').notNull().default(0),
    isActive: boolean('is_active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('inspire_nav_items_parent_id_idx').on(table.parentId),
    index('inspire_nav_items_category_id_idx').on(table.categoryId),
    index('inspire_nav_items_position_idx').on(table.position),
  ],
);

export const inspireNavItemsRelations = relations(inspireNavItems, ({ one, many }) => ({
  category: one(inspireCategories, {
    fields: [inspireNavItems.categoryId],
    references: [inspireCategories.id],
  }),
  parent: one(inspireNavItems, {
    fields: [inspireNavItems.parentId],
    references: [inspireNavItems.id],
    relationName: 'nav_item_parent',
  }),
  children: many(inspireNavItems, { relationName: 'nav_item_parent' }),
}));
