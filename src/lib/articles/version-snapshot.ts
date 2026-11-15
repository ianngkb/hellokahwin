/**
 * Pure, database-free helpers for article version history.
 *
 * Ported from The Wedding Notebook's `version-snapshot.ts`, cut down to what
 * HelloKahwin versions (13 article columns + tags) and extended with the
 * preview/compare and restore-payload helpers the versions sheet needs.
 *
 * Nothing here talks to Drizzle, Postgres, Next or the network, so every rule
 * that decides what a restore sends — and what the compare view shows — is
 * provable in a unit test.
 */

import type { ArticleVersionRow } from '@/lib/db/schema/article-versions';

/**
 * The columns of `articles` a version snapshots. MUST match the trigger's
 * `UPDATE OF` list in src/lib/db/migrations-pending/versions.sql.
 *
 * Not here on purpose: slug and primary category (the public URL), status and
 * the publish dates (publication state), author, share token.
 */
export const VERSIONED_ARTICLE_FIELDS = [
  'title',
  'excerpt',
  'content',
  'coverImageUrl',
  'coverImageVariants',
  'coverImageQuality',
  'coverImageFocalPoint',
  'coverImageDetectionData',
  'coverImageSmartCrops',
  'coverImageFocalPointOverride',
  'metaTitle',
  'metaDescription',
  'pinterestBoardName',
] as const;

export type VersionedArticleField = (typeof VERSIONED_ARTICLE_FIELDS)[number];
export type SnapshotField = VersionedArticleField | 'tagIds';

export const VERSIONED_FIELD_LABELS: Record<SnapshotField, string> = {
  title: 'Title',
  excerpt: 'Excerpt',
  content: 'Body',
  coverImageUrl: 'Cover image',
  coverImageVariants: 'Cover image sizes',
  coverImageQuality: 'Cover image quality',
  coverImageFocalPoint: 'Cover focal point',
  coverImageDetectionData: 'Cover face detection',
  coverImageSmartCrops: 'Cover crops',
  coverImageFocalPointOverride: 'Cover focal point (manual)',
  metaTitle: 'SEO title',
  metaDescription: 'SEO description',
  pinterestBoardName: 'Pinterest board',
  tagIds: 'Tags',
};

export interface ArticleSnapshot {
  title: string;
  excerpt: string | null;
  content: unknown;
  coverImageUrl: string | null;
  coverImageVariants: unknown;
  coverImageQuality: string | null;
  coverImageFocalPoint: unknown;
  coverImageDetectionData: unknown;
  coverImageSmartCrops: unknown;
  coverImageFocalPointOverride: unknown;
  metaTitle: string | null;
  metaDescription: string | null;
  pinterestBoardName: string | null;
  /** Sorted, de-duplicated. */
  tagIds: string[];
}

function sortedUnique(ids: readonly string[]): string[] {
  return [...new Set(ids)].sort();
}

/** An article row (+ its tag ids) as a canonical snapshot. */
export function buildSnapshot(
  article: { [K in VersionedArticleField]: ArticleSnapshot[K] },
  tagIds: readonly string[],
): ArticleSnapshot {
  const out = {} as ArticleSnapshot;
  for (const f of VERSIONED_ARTICLE_FIELDS) {
    (out as unknown as Record<string, unknown>)[f] = article[f] ?? null;
  }
  out.title = article.title;
  out.tagIds = sortedUnique(tagIds);
  return out;
}

/** A stored version row as a snapshot. */
export function snapshotFromRow(row: ArticleVersionRow): ArticleSnapshot {
  return buildSnapshot(row, row.tagIds ?? []);
}

/**
 * Equality form only, never stored. Postgres hands jsonb back with its own key
 * order, so objects are compared with sorted keys — otherwise a version read
 * back from `article_versions` would never equal the same state read from
 * `articles` and every field would look "changed".
 */
function canonical(value: unknown): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value, (_key, v: unknown) =>
        v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(
              Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : 1)),
            )
          : v,
      );
    } catch {
      return 'unserialisable';
    }
  }
  return `${typeof value}:${String(value)}`;
}

/** Every field that differs, in display order. */
export function changedSnapshotFields(
  before: ArticleSnapshot,
  after: ArticleSnapshot,
): SnapshotField[] {
  const fields: SnapshotField[] = [...VERSIONED_ARTICLE_FIELDS, 'tagIds'];
  return fields.filter((f) => canonical(before[f]) !== canonical(after[f]));
}

// ── Preview / compare ────────────────────────────────────────────────────────

const BLOCK_TYPES = new Set([
  'paragraph',
  'heading',
  'blockquote',
  'listItem',
  'codeBlock',
  'tableCell',
  'tableHeader',
]);

/**
 * The readable text of a Tiptap document, one entry per block (paragraph,
 * heading, list item…). Blocks are what an editor recognises in a compare, so
 * the diff works on them rather than on characters.
 */
export function contentToBlocks(content: unknown): string[] {
  const blocks: string[] = [];

  function textOf(node: unknown): string {
    if (!node || typeof node !== 'object') return '';
    const n = node as { type?: unknown; text?: unknown; content?: unknown };
    if (n.type === 'text' && typeof n.text === 'string') return n.text;
    if (n.type === 'hardBreak') return ' ';
    if (!Array.isArray(n.content)) return '';
    return n.content.map(textOf).join('');
  }

  function walk(node: unknown) {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: unknown; content?: unknown };
    if (typeof n.type === 'string' && BLOCK_TYPES.has(n.type)) {
      // A list item wraps paragraphs; take its text whole, once.
      const text = textOf(n).replace(/\s+/g, ' ').trim();
      if (text) blocks.push(text);
      return;
    }
    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  walk(content);
  return blocks;
}

export function countWords(blocks: readonly string[]): number {
  return blocks.reduce((sum, b) => sum + b.split(/\s+/).filter(Boolean).length, 0);
}

export interface BlockDiff {
  /** Blocks in the version that the current article no longer has. */
  onlyInVersion: string[];
  /** Blocks in the current article that the version does not have. */
  onlyInCurrent: string[];
}

/**
 * Which paragraphs a restore would bring back, and which it would remove.
 * Multiset-aware (a paragraph repeated twice in one side and once in the
 * other counts once), order-insensitive — enough for "what would change",
 * without pretending to be a line-by-line diff.
 */
export function diffBlocks(version: readonly string[], current: readonly string[]): BlockDiff {
  const remaining = new Map<string, number>();
  for (const b of current) remaining.set(b, (remaining.get(b) ?? 0) + 1);
  const onlyInVersion: string[] = [];
  for (const b of version) {
    const n = remaining.get(b) ?? 0;
    if (n > 0) remaining.set(b, n - 1);
    else onlyInVersion.push(b);
  }
  const versionCounts = new Map<string, number>();
  for (const b of version) versionCounts.set(b, (versionCounts.get(b) ?? 0) + 1);
  const onlyInCurrent: string[] = [];
  for (const b of current) {
    const n = versionCounts.get(b) ?? 0;
    if (n > 0) versionCounts.set(b, n - 1);
    else onlyInCurrent.push(b);
  }
  return { onlyInVersion, onlyInCurrent };
}

export interface FieldChange {
  field: SnapshotField;
  label: string;
  /** Short, human-readable. Opaque blobs are described, not dumped. */
  version: string;
  current: string;
}

const OPAQUE: ReadonlySet<SnapshotField> = new Set([
  'coverImageVariants',
  'coverImageFocalPoint',
  'coverImageDetectionData',
  'coverImageSmartCrops',
  'coverImageFocalPointOverride',
]);

function describe(
  field: SnapshotField,
  value: unknown,
  tagNames: ReadonlyMap<string, string>,
): string {
  if (value === null || value === undefined || value === '') return '(empty)';
  if (field === 'content')
    return `${countWords(contentToBlocks(value)).toLocaleString('en')} words`;
  if (field === 'tagIds') {
    const ids = value as string[];
    if (ids.length === 0) return '(none)';
    return ids.map((id) => tagNames.get(id) ?? '(deleted tag)').join(', ');
  }
  if (OPAQUE.has(field)) return '(set)';
  return String(value);
}

/**
 * The compare list: each field where the version differs from the article as
 * it stands now. The opaque cover-image blobs collapse into the single
 * "Cover image" row when the URL itself changed — five rows of "(set) → (set)"
 * tell an editor nothing.
 */
export function compareSnapshots(
  version: ArticleSnapshot,
  current: ArticleSnapshot,
  tagNames: ReadonlyMap<string, string> = new Map(),
): FieldChange[] {
  const changed = changedSnapshotFields(current, version);
  const coverMoved = changed.includes('coverImageUrl');
  return changed
    .filter((f) => !(coverMoved && OPAQUE.has(f)))
    .map((field) => ({
      field,
      label: VERSIONED_FIELD_LABELS[field],
      version: describe(field, version[field], tagNames),
      current: describe(field, current[field], tagNames),
    }));
}

// ── Restore ──────────────────────────────────────────────────────────────────

/**
 * The payload a restore hands to `updateArticleAction` — the SAME entry point
 * the editor's Save button uses, so every HelloKahwin save rule still runs:
 * the blob-preview guard, the Pinterest-board requirement, the LQIP rebuild,
 * the audit diff, cache invalidation.
 *
 * Shaped to pass `articleUpdateSchema`: columns that are NULL in the version
 * are sent the way the editor sends an emptied box (`''`), which the action
 * stores as NULL. Fields the version does not carry — slug, status, category,
 * author, dates — are left out, so the action leaves them alone and a restore
 * can never move the URL (no redirect is minted) or publish/unpublish.
 *
 * `existingTagIds` filters out tags deleted or merged away since: inserting
 * one would fail the whole save on its foreign key.
 */
export function buildRestorePayload(
  snapshot: ArticleSnapshot,
  existingTagIds: ReadonlySet<string>,
): { data: Record<string, unknown>; skippedTagIds: string[] } {
  const tagIds = snapshot.tagIds.filter((id) => existingTagIds.has(id));
  const skippedTagIds = snapshot.tagIds.filter((id) => !existingTagIds.has(id));
  return {
    data: {
      title: snapshot.title,
      excerpt: snapshot.excerpt ?? '',
      content: snapshot.content ?? null,
      coverImageUrl: snapshot.coverImageUrl ?? '',
      coverImageVariants: snapshot.coverImageVariants ?? null,
      coverImageQuality: snapshot.coverImageQuality ?? '',
      coverImageFocalPoint: snapshot.coverImageFocalPoint ?? null,
      coverImageDetectionData: snapshot.coverImageDetectionData ?? null,
      coverImageSmartCrops: snapshot.coverImageSmartCrops ?? null,
      coverImageFocalPointOverride: snapshot.coverImageFocalPointOverride ?? null,
      metaTitle: snapshot.metaTitle ?? '',
      metaDescription: snapshot.metaDescription ?? '',
      pinterestBoardName: snapshot.pinterestBoardName ?? '',
      tagIds,
    },
    skippedTagIds,
  };
}

/** The 80-char cap is the database's CHECK; trimmed, empty means "no name". */
export const VERSION_LABEL_MAX = 80;

export function normaliseVersionLabel(label: unknown): string | null {
  if (typeof label !== 'string') return null;
  const trimmed = label.replace(/\s+/g, ' ').trim();
  return trimmed ? trimmed.slice(0, VERSION_LABEL_MAX) : null;
}
