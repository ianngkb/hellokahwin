import { describe, it, expect } from 'vitest';
import { buildSeriesBox, SERIES_BOX_MAX_SIBLINGS, type SeriesBoxSibling } from '../series-box';

const link = (seriesEnabled: boolean, seriesDescription: string | null = null) => ({
  slug: 'mas-kahwin',
  anchor: 'mas kahwin',
  cluster: { anchor: 'mas kahwin ikut negeri', seriesEnabled, seriesDescription },
});

const sib = (slug: string, day: number, categorySlug: string | null = 'mas-kahwin') =>
  ({
    title: `Tajuk ${slug}`,
    slug,
    categorySlug,
    publishedAt: new Date(Date.UTC(2026, 10, day)),
  }) satisfies SeriesBoxSibling;

const current = {
  title: 'Mas kahwin Perak',
  slug: 'perak',
  publishedAt: new Date(Date.UTC(2026, 10, 5)),
};

describe('buildSeriesBox', () => {
  it('renders nothing when the cluster has the box switched off', () => {
    expect(buildSeriesBox(link(false), current, [sib('a', 9)])).toBeNull();
  });

  it('renders nothing for an article outside any cluster', () => {
    expect(
      buildSeriesBox({ slug: 'p', anchor: 'p', cluster: null }, current, [sib('a', 9)]),
    ).toBeNull();
    expect(buildSeriesBox(null, current, [sib('a', 9)])).toBeNull();
  });

  it('renders nothing when there is no other live article', () => {
    expect(buildSeriesBox(link(true), current, [])).toBeNull();
    // A sibling with no canonical URL does not count.
    expect(buildSeriesBox(link(true), current, [sib('x', 9, null)])).toBeNull();
  });

  it('lists siblings newest first with the current article marked, not linked, in date order', () => {
    const box = buildSeriesBox(link(true, '  Panduan negeri demi negeri  '), current, [
      sib('a', 9),
      sib('b', 7),
      sib('c', 3),
    ])!;
    expect(box.title).toBe('mas kahwin ikut negeri');
    expect(box.description).toBe('Panduan negeri demi negeri');
    expect(box.items.map((i) => i.key)).toEqual(['a', 'b', 'perak', 'c']);
    const cur = box.items.find((i) => i.current)!;
    expect(cur.href).toBeNull();
    expect(box.items[0].href).toBe('/artikel/mas-kahwin/a');
    expect(box.pillarHref).toBe('/artikel/mas-kahwin');
    expect(box.pillarAnchor).toBe('mas kahwin');
  });

  it('caps the list at the sibling limit plus the current article', () => {
    const many = Array.from({ length: 12 }, (_, i) => sib(`s${i}`, 28 - i));
    const box = buildSeriesBox(link(true), current, many)!;
    expect(box.items.filter((i) => !i.current)).toHaveLength(SERIES_BOX_MAX_SIBLINGS);
    expect(box.items.filter((i) => i.current)).toHaveLength(1);
  });

  it('treats a blank description as none', () => {
    expect(buildSeriesBox(link(true, '   '), current, [sib('a', 9)])!.description).toBeNull();
  });

  it('never lists the current article twice', () => {
    const box = buildSeriesBox(link(true), current, [sib('perak', 5), sib('a', 9)])!;
    expect(box.items.filter((i) => i.key === 'perak')).toHaveLength(1);
  });
});
