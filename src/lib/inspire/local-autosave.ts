import type { JSONContent } from 'novel';

export interface LocalAutosaveData {
  title: string;
  slug: string;
  content: JSONContent;
  coverImageUrl: string;
  coverImageVariants: unknown;
  coverImageQuality: string;
  coverImageSmartCrops?: unknown;
  coverImageFocalPointOverride?: unknown;
  metaTitle: string;
  metaDescription: string;
  pinterestBoardName: string;
  status: string;
  primaryCategoryId: string;
  secondaryCategoryIds: string[];
  tertiaryCategoryIds: string[];
  /**
   * The Cluster picker's value (`''` = none). Optional: snapshots written
   * before the picker existed have no such field, and a restore of one keeps
   * the article's current cluster.
   */
  clusterId?: string;
  /**
   * True when the article editor's category reads failed on the render that
   * produced this snapshot, so the three category fields above are empty for
   * lack of data rather than by the admin's intent. Restoring them would push
   * that emptiness into a real save, so a restore skips them. Optional because
   * snapshots written before this field existed are still sitting in browsers'
   * localStorage; absent means "not degraded", which was true of all of them.
   */
  categoriesDegraded?: boolean;
  /**
   * Optional: snapshots written before the excerpt field existed must leave
   * the stored excerpt alone on restore, not blank it.
   */
  excerpt?: string;
  /**
   * Tags now persist only on Save, so an unsaved tag edit lives here until
   * then. Optional for the same reason as `excerpt`; `tagsDegraded` mirrors
   * `categoriesDegraded` — a snapshot taken while the tag reads failed holds
   * ids that mean "unknown", and restoring them would clear real tags.
   */
  selectedTagIds?: string[];
  tagsDegraded?: boolean;
  publishedAt: string;
  updatedAt: string;
  scheduledPublishAt: string;
  savedAt: string;
}

function getKey(articleId: string, userId: string) {
  return `autosave-article-${userId}-${articleId}`;
}

export function saveLocalAutosave(
  articleId: string,
  userId: string,
  data: LocalAutosaveData,
): void {
  try {
    localStorage.setItem(getKey(articleId, userId), JSON.stringify(data));
  } catch {
    // Silently fail — incognito mode or quota exceeded
  }
}

export function loadLocalAutosave(articleId: string, userId: string): LocalAutosaveData | null {
  try {
    const raw = localStorage.getItem(getKey(articleId, userId));
    if (!raw) return null;
    return JSON.parse(raw) as LocalAutosaveData;
  } catch {
    return null;
  }
}

export function clearLocalAutosave(articleId: string, userId: string): void {
  try {
    localStorage.removeItem(getKey(articleId, userId));
  } catch {
    // Silently fail
  }
}

export function hasNewerLocalAutosave(
  articleId: string,
  userId: string,
  articleUpdatedAt: string,
): boolean {
  try {
    const data = loadLocalAutosave(articleId, userId);
    if (!data?.savedAt) return false;
    return new Date(data.savedAt) > new Date(articleUpdatedAt);
  } catch {
    return false;
  }
}
