import { describe, it, expect } from 'vitest';
import { collectionItemList } from '../collection-jsonld';

const ITEMS = [
  { name: 'Dulang Hantaran', url: 'https://hellokahwin.com/artikel/hantaran-mas-kahwin/dulang' },
  { name: 'Cincin Tunang', url: 'https://hellokahwin.com/artikel/sebelum-nikah/cincin-tunang' },
];

describe('collectionItemList', () => {
  it('carries the count on the ItemList, never on the CollectionPage', () => {
    const list = collectionItemList(42, ITEMS);
    expect(list['@type']).toBe('ItemList');
    expect(list.numberOfItems).toBe(42);
  });

  it('numbers items from 1 on the first page', () => {
    expect(collectionItemList(42, ITEMS).itemListElement.map((e) => e.position)).toEqual([1, 2]);
  });

  it('continues the numbering on later pages', () => {
    // Page 2 of a 16-per-page listing: the first item here is the 17th overall.
    expect(collectionItemList(42, ITEMS, 17).itemListElement.map((e) => e.position)).toEqual([
      17, 18,
    ]);
  });

  it('emits a ListItem per rendered item, with its name and absolute url', () => {
    const [first] = collectionItemList(2, ITEMS).itemListElement;
    expect(first).toEqual({
      '@type': 'ListItem',
      position: 1,
      name: 'Dulang Hantaran',
      url: 'https://hellokahwin.com/artikel/hantaran-mas-kahwin/dulang',
    });
  });

  it('handles an empty page without inventing items', () => {
    const list = collectionItemList(0, []);
    expect(list.numberOfItems).toBe(0);
    expect(list.itemListElement).toEqual([]);
  });
});
