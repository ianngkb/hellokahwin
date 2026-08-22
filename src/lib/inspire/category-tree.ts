/**
 * Category-tree flattening for the public browse rails.
 *
 * Both the home rail and the `/artikel` "Ikut Kategori" index answer the same
 * question — "which categories actually have something to read, busiest
 * first?" — and both got it subtly wrong when they each rolled their own
 * arithmetic:
 *
 *  - Counting a parent as `self + direct children` under-counts any branch
 *    whose articles hang off grandchildren, so a deep, well-stocked branch
 *    sorts below a shallow, emptier one.
 *  - Listing children with their OWN raw count drops any child whose articles
 *    all live one level further down: it reads as 0 and gets filtered out
 *    entirely.
 *
 * One recursive walk fixes both, and keeps the two surfaces consistent — they
 * now differ only in whether the caller caps the list.
 */

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /** Published articles filed directly against THIS category. */
  articleCount: number | string;
}

export interface FlatCategory {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  /** Published articles in this category AND everything beneath it. */
  articleCount: number;
}

/**
 * Every category that has at least one published article in its subtree,
 * counted with that whole subtree, busiest first.
 *
 * Ties break parents-before-children so a rail reads broad-to-narrow.
 */
export function flattenCategoriesByArticleCount(rows: CategoryNode[]): FlatCategory[] {
  const childrenOf = new Map<string | null, CategoryNode[]>();
  for (const row of rows) {
    const bucket = childrenOf.get(row.parentId);
    if (bucket) bucket.push(row);
    else childrenOf.set(row.parentId, [row]);
  }

  const memo = new Map<string, number>();

  // `seen` guards against a cycle in the tree. `inspire_categories.parent_id`
  // has no acyclicity constraint, so one bad edit (or a bad import) would
  // otherwise spin this walk forever and hang the render of every public page.
  const subtreeCount = (node: CategoryNode, seen: Set<string>): number => {
    const cached = memo.get(node.id);
    if (cached !== undefined) return cached;
    if (seen.has(node.id)) return 0;
    seen.add(node.id);

    const total =
      Number(node.articleCount ?? 0) +
      (childrenOf.get(node.id) ?? []).reduce((sum, child) => sum + subtreeCount(child, seen), 0);

    seen.delete(node.id);
    memo.set(node.id, total);
    return total;
  };

  return rows
    .map((row) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      parentId: row.parentId,
      articleCount: subtreeCount(row, new Set<string>()),
    }))
    .filter((row) => row.articleCount > 0)
    .sort((a, b) => {
      if (b.articleCount !== a.articleCount) return b.articleCount - a.articleCount;
      return (a.parentId ? 1 : 0) - (b.parentId ? 1 : 0);
    });
}
