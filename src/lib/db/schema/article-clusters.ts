import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  index,
  unique,
  boolean,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';
import { articles } from './articles';

// ── Article clusters ("series") ──────────────────────────────────────
// Ported from The Wedding Notebook (migrations 20261107175319_article_clusters
// and 20261109181637_article_clusters_series_box), end state only.
//
// A cluster is a hand-picked, ordered group of Inspire articles an admin builds
// in `/admin/inspire/clusters`. It can optionally be shown to readers as a
// "series" (`seriesEnabled`), with the cluster `name` as the heading — there is
// no separate title column.
//
// Cascades, both directions:
//   * delete a cluster  → its membership rows go; the articles are untouched.
//   * delete an article → its membership rows go; the cluster stays.
// (Admin "delete" of an article is a soft delete — `status = 'deleted'` — which
// fires no cascade; the reads in `@/lib/inspire/clusters` hide those members.)
//
// RLS: enabled with NO policies, the same treatment every other public table
// gets in 0001_enable_rls_public_schema.sql. The SQL lives in
// src/lib/db/migrations-pending/series.sql until the real migration is cut.

export const articleClusters = pgTable('article_clusters', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Doubles as the reader-facing SERIES TITLE when `seriesEnabled` is true.
  name: text('name').notNull(),
  // Optional, unique. Named to match the constraint Postgres creates for an
  // inline `UNIQUE`, so drizzle-kit sees no drift.
  slug: text('slug').unique('article_clusters_slug_key'),
  // Series box. Plain text, like `articles.excerpt`; NULL means "not written
  // yet" (the settings action refuses to switch the box on without an intro) /
  // "no label line". `seriesEnabled` defaults to false so nothing becomes
  // reader-facing by deploying.
  description: text('description'),
  eyebrow: text('eyebrow'),
  seriesEnabled: boolean('series_enabled').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

export const articleClustersRelations = relations(articleClusters, ({ many }) => ({
  members: many(articleClusterMembers),
}));

export const articleClusterMembers = pgTable(
  'article_cluster_members',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    clusterId: uuid('cluster_id')
      .notNull()
      .references(() => articleClusters.id, { onDelete: 'cascade' }),
    articleId: uuid('article_id')
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),
    position: integer('position').notNull().default(0),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // One article at most once per cluster. Its index leads with cluster_id, so
    // "members of cluster X" is already indexed.
    unique('article_cluster_members_unique').on(table.clusterId, table.articleId),
    // The article-side cascade and "which clusters is this article in".
    index('article_cluster_members_article_id_idx').on(table.articleId),
  ],
);

export const articleClusterMembersRelations = relations(articleClusterMembers, ({ one }) => ({
  cluster: one(articleClusters, {
    fields: [articleClusterMembers.clusterId],
    references: [articleClusters.id],
  }),
  article: one(articles, {
    fields: [articleClusterMembers.articleId],
    references: [articles.id],
  }),
}));
