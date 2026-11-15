import 'server-only';

import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles, articleTags, inspireTags } from '@/lib/db/schema/articles';
import { articleVersions, type ArticleVersionRow } from '@/lib/db/schema/article-versions';
import { buildSnapshot, normaliseVersionLabel, type ArticleSnapshot } from './version-snapshot';

/**
 * Database side of article version history (ported from The Wedding Notebook,
 * simplified).
 *
 * Version rows are written ONLY by the `article_version_capture()` trigger
 * (src/lib/db/migrations-pending/versions.sql). This module never inserts one.
 * It does two things: tells the trigger who is saving, and reads history back.
 */

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export interface VersionActor {
  /** `profiles.id` of the acting admin (the Clerk user id). */
  id: string;
  /** Kept on the row so it stays attributable after the profile goes. */
  label?: string | null;
  /** Optional name for the version this save produces ("Before the refresh"). */
  versionLabel?: string | null;
}

/**
 * Declares the saving admin (and an optional version name) for the CURRENT
 * transaction only. Call inside the transaction, before writing `articles`.
 *
 * `set_config(name, value, true)` is `SET LOCAL`: it ends with the transaction.
 * A bare `SET` would stay on the pooled connection and the next request to
 * borrow it — possibly a bulk action — would be filed under this admin's name.
 * Bind parameters, never string-built SQL.
 */
export async function declareVersionActor(tx: Tx, actor: VersionActor): Promise<void> {
  await tx.execute(sql`
    select
      set_config('app.article_actor_id', ${actor.id}, true),
      set_config('app.article_actor_label', ${actor.label ?? ''}, true),
      set_config('app.article_version_label', ${normaliseVersionLabel(actor.versionLabel) ?? ''}, true)
  `);
}

// ── Reads ────────────────────────────────────────────────────────────────────

export interface ArticleVersionSummary {
  id: string;
  versionNumber: number;
  actorType: ArticleVersionRow['actorType'];
  label: string | null;
  note: string | null;
  createdByLabel: string | null;
  createdAt: Date;
  updatedAt: Date;
  title: string;
}

/**
 * History for the sheet, newest first. Never selects `content` or the cover
 * blobs: a list of dates must not drag every body across the wire.
 */
export async function listArticleVersions(articleId: string): Promise<ArticleVersionSummary[]> {
  return db
    .select({
      id: articleVersions.id,
      versionNumber: articleVersions.versionNumber,
      actorType: articleVersions.actorType,
      label: articleVersions.label,
      note: articleVersions.note,
      createdByLabel: articleVersions.createdByLabel,
      createdAt: articleVersions.createdAt,
      updatedAt: articleVersions.updatedAt,
      title: articleVersions.title,
    })
    .from(articleVersions)
    .where(eq(articleVersions.articleId, articleId))
    .orderBy(desc(articleVersions.versionNumber));
}

/** One full version row. Null when it does not exist or is not this article's. */
export async function getArticleVersion(
  articleId: string,
  versionId: string,
): Promise<ArticleVersionRow | null> {
  const [row] = await db
    .select()
    .from(articleVersions)
    .where(and(eq(articleVersions.id, versionId), eq(articleVersions.articleId, articleId)))
    .limit(1);
  return row ?? null;
}

/** The article as it stands now, as a snapshot. Null when it does not exist. */
export async function readCurrentSnapshot(articleId: string): Promise<ArticleSnapshot | null> {
  const [article] = await db
    .select({
      title: articles.title,
      excerpt: articles.excerpt,
      content: articles.content,
      coverImageUrl: articles.coverImageUrl,
      coverImageVariants: articles.coverImageVariants,
      coverImageQuality: articles.coverImageQuality,
      coverImageFocalPoint: articles.coverImageFocalPoint,
      coverImageDetectionData: articles.coverImageDetectionData,
      coverImageSmartCrops: articles.coverImageSmartCrops,
      coverImageFocalPointOverride: articles.coverImageFocalPointOverride,
      metaTitle: articles.metaTitle,
      metaDescription: articles.metaDescription,
      pinterestBoardName: articles.pinterestBoardName,
    })
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1);
  if (!article) return null;

  const tags = await db
    .select({ tagId: articleTags.tagId })
    .from(articleTags)
    .where(eq(articleTags.articleId, articleId));

  return buildSnapshot(
    article,
    tags.map((t) => t.tagId),
  );
}

/** id → name for the given tag ids. Deleted tags are simply absent. */
export async function readTagNames(tagIds: readonly string[]): Promise<Map<string, string>> {
  if (tagIds.length === 0) return new Map();
  const rows = await db
    .select({ id: inspireTags.id, name: inspireTags.name })
    .from(inspireTags)
    .where(inArray(inspireTags.id, [...new Set(tagIds)]));
  return new Map(rows.map((r) => [r.id, r.name]));
}
