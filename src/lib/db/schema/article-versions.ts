import {
  pgTable,
  text,
  integer,
  uuid,
  jsonb,
  timestamp,
  index,
  unique,
  bigint,
  check,
} from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';
import { articles } from './articles';
import { profiles } from './profiles';

/**
 * Snapshots of an article's editorial payload — the version history behind the
 * editor's "Versions" button. Ported from The Wedding Notebook, simplified.
 *
 * `articles` stays the ONE source of truth for every read path: nothing public
 * ever reads this table. A version is a copy of what the article looked like
 * after a save, kept so an editor can see, compare and restore it.
 *
 * Rows are written by exactly ONE mechanism: the `article_version_capture()`
 * trigger on `articles` (src/lib/db/migrations-pending/versions.sql). The app
 * never inserts here; it only declares WHO is saving and an optional name for
 * the version, via transaction-local settings (`declareVersionActor` in
 * src/lib/articles/versioning.ts). One mechanism means a save can never be
 * snapshotted twice.
 *
 * What is NOT versioned, deliberately: slug, primary category, status, publish
 * dates, author, share token. Those are the article's identity and publication
 * state — restoring an old version must never move its URL, publish a draft or
 * unpublish a live article. Additional (secondary/tertiary) categories are not
 * versioned either: the editor writes them in a separate request after the
 * article row, so a snapshot taken when the article row commits cannot see them.
 *
 * Admin-only. RLS is enabled with no policies, like every other table here
 * (migration 0001); access is through server actions on the direct connection.
 */
export const articleVersions = pgTable(
  'article_versions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    versionNumber: integer('version_number').notNull(),

    /**
     * `human` — an admin save that declared itself (the editor, a restore).
     * `machine` — any write that declared no actor (bulk actions, scripts, the
     *   scheduled publisher). Always appends; never folds into a human version.
     * `import` — the one-time baseline seeded for articles that existed before
     *   versioning.
     */
    actorType: text('actor_type').$type<ArticleVersionActor>().notNull(),
    createdBy: text('created_by').references(() => profiles.id, { onDelete: 'set null' }),
    /** Survives profile deletion — the admin's email at the time. */
    createdByLabel: text('created_by_label'),
    /** The admin's name for this version ("Before the 2026 refresh"). Max 80 chars. */
    label: text('label'),
    /** Free text for machine rows (e.g. the Postgres application name). */
    note: text('note'),

    // ── The versioned payload: 13 columns of `articles` ──────────────────────
    title: text('title').notNull(),
    excerpt: text('excerpt'),
    content: jsonb('content'),
    coverImageUrl: text('cover_image_url'),
    coverImageVariants: jsonb('cover_image_variants'),
    coverImageQuality: text('cover_image_quality'),
    coverImageFocalPoint: jsonb('cover_image_focal_point'),
    coverImageDetectionData: jsonb('cover_image_detection_data'),
    coverImageSmartCrops: jsonb('cover_image_smart_crops'),
    coverImageFocalPointOverride: jsonb('cover_image_focal_point_override'),
    metaTitle: text('meta_title'),
    metaDescription: text('meta_description'),
    pinterestBoardName: text('pinterest_board_name'),

    /**
     * Tag ids, sorted, with NO foreign key: an FK would either block a tag
     * merge or cascade-edit history. Ids that no longer exist are skipped on
     * restore and reported to the admin.
     */
    tagIds: uuid('tag_ids')
      .array()
      .notNull()
      .default(sql`'{}'::uuid[]`),

    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    /**
     * Last time this row's payload was written. A run of saves by one admin
     * inside 30 minutes (the 60-second autosave, mostly) folds into one version
     * and moves this forward, rather than minting a version a minute.
     */
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
    /**
     * The transaction that last wrote this row. Lets the capture trigger fold
     * several `UPDATE articles` statements in ONE transaction into one version.
     */
    createdTxid: bigint('created_txid', { mode: 'number' })
      .notNull()
      .default(sql`txid_current()`),
  },
  (t) => [
    unique('article_versions_number_unique').on(t.articleId, t.versionNumber),
    index('article_versions_article_id_idx').on(t.articleId, t.versionNumber.desc()),
    check('article_versions_label_len', sql`${t.label} IS NULL OR length(${t.label}) <= 80`),
    check('article_versions_actor_type', sql`${t.actorType} IN ('human', 'machine', 'import')`),
  ],
);

export const articleVersionsRelations = relations(articleVersions, ({ one }) => ({
  article: one(articles, {
    fields: [articleVersions.articleId],
    references: [articles.id],
  }),
  createdByProfile: one(profiles, {
    fields: [articleVersions.createdBy],
    references: [profiles.id],
  }),
}));

export type ArticleVersionActor = 'human' | 'machine' | 'import';

export type ArticleVersionRow = typeof articleVersions.$inferSelect;
