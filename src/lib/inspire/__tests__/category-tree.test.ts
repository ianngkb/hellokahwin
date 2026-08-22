import { describe, it, expect } from 'vitest';
import { flattenCategoriesByArticleCount, type CategoryNode } from '../category-tree';

const cat = (id: string, parentId: string | null, articleCount: number | string): CategoryNode => ({
  id,
  name: id.toUpperCase(),
  slug: id,
  parentId,
  articleCount,
});

describe('flattenCategoriesByArticleCount', () => {
  it('counts a parent with its whole subtree, not just direct children', () => {
    // parent(0) -> child(0) -> grandchild(4). Counting one level deep would
    // report the parent as 0 and drop the entire branch from the rail.
    const rows = [cat('parent', null, 0), cat('child', 'parent', 0), cat('grand', 'child', 4)];
    const flat = flattenCategoriesByArticleCount(rows);

    expect(flat.map((c) => [c.slug, c.articleCount])).toEqual([
      ['parent', 4],
      ['child', 4],
      ['grand', 4],
    ]);
  });

  it('drops only categories whose entire subtree is empty', () => {
    const rows = [cat('empty', null, 0), cat('emptychild', 'empty', 0), cat('full', null, 2)];
    expect(flattenCategoriesByArticleCount(rows).map((c) => c.slug)).toEqual(['full']);
  });

  it('sorts busiest first and breaks ties parent-before-child', () => {
    const rows = [cat('child', 'parent', 3), cat('parent', null, 0), cat('other', null, 9)];
    expect(flattenCategoriesByArticleCount(rows).map((c) => c.slug)).toEqual([
      'other',
      'parent',
      'child',
    ]);
  });

  it('coerces string counts (postgres COALESCE/COUNT comes back as a string)', () => {
    const rows = [cat('a', null, '7'), cat('b', null, '2')];
    expect(flattenCategoriesByArticleCount(rows).map((c) => c.articleCount)).toEqual([7, 2]);
  });

  it('terminates on a cycle instead of hanging the render', () => {
    // parent_id has no acyclicity constraint in the schema; one bad edit must
    // not spin forever on every public page.
    const rows = [cat('a', 'b', 1), cat('b', 'a', 1)];
    const flat = flattenCategoriesByArticleCount(rows);
    expect(flat).toHaveLength(2);
    for (const c of flat) expect(c.articleCount).toBeGreaterThan(0);
  });

  it('does not double-count a shared subtree across sibling branches', () => {
    const rows = [
      cat('root', null, 1),
      cat('left', 'root', 2),
      cat('right', 'root', 3),
      cat('leaf', 'left', 4),
    ];
    const byslug = Object.fromEntries(
      flattenCategoriesByArticleCount(rows).map((c) => [c.slug, c.articleCount]),
    );
    expect(byslug).toEqual({ root: 10, left: 6, right: 3, leaf: 4 });
  });
});
