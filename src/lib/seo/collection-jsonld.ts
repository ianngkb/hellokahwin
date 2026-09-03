/**
 * The `ItemList` that a `CollectionPage` hangs its count on.
 *
 * ── WHY THIS EXISTS (Ahrefs 2026-08-28 crawl, 366 notices) ────────────────
 *
 * Three routes — the pillar view and the standard view of
 * `/artikel/[category]`, and `/artikel/tag/[slug]` — emitted
 * `CollectionPage { numberOfItems }`. `numberOfItems` is a property of
 * `ItemList`; `CollectionPage` inherits `WebPage -> CreativeWork -> Thing` and
 * has no such property, so every one of those pages failed schema.org
 * validation. 183 URLs, seen twice each because `www.` was still resolving as a
 * second host, is where the 366 came from.
 *
 * The count is worth keeping — it is true, and Google reads `ItemList` — so
 * rather than deleting the property the three sites now say it in the shape
 * that carries it legally: `CollectionPage { mainEntity: ItemList { … } }`.
 *
 * `startPosition` is not decoration. `position` in an `ItemList` is meant to be
 * the item's rank in the WHOLE list, and these routes paginate. Page 2 of a
 * category restarting at `position: 1` would describe two different articles as
 * the first item of the same list.
 */

export interface CollectionListItem {
  /** The article's title, as rendered. */
  name: string;
  /** Absolute URL — schema.org consumers do not resolve relative hrefs. */
  url: string;
}

export interface CollectionItemList {
  '@type': 'ItemList';
  numberOfItems: number;
  itemListElement: {
    '@type': 'ListItem';
    position: number;
    name: string;
    url: string;
  }[];
}

/**
 * @param totalItems  Items in the whole collection, across every page.
 * @param items       The items rendered on THIS page, in document order.
 * @param startPosition 1-based rank of `items[0]` within the whole collection.
 */
export function collectionItemList(
  totalItems: number,
  items: CollectionListItem[],
  startPosition = 1,
): CollectionItemList {
  return {
    '@type': 'ItemList',
    numberOfItems: totalItems,
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem' as const,
      position: startPosition + i,
      name: item.name,
      url: item.url,
    })),
  };
}
