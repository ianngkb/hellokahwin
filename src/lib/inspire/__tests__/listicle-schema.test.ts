import { describe, it, expect } from 'vitest';
import { extractHeadings } from '../heading-anchors';
import { buildItemListJsonLd, findLocality, LISTICLE_MIN_ITEMS } from '../listicle-schema';

const CANONICAL = 'https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin';

function headingsFrom(texts: string[], level = 2) {
  return extractHeadings({
    type: 'doc',
    content: texts.map((text) => ({
      type: 'heading',
      attrs: { level },
      content: [{ type: 'text', text }],
    })),
  });
}

function build(texts: string[], title = 'Senarai dewan') {
  return buildItemListJsonLd({ title, canonicalUrl: CANONICAL, headings: headingsFrom(texts) });
}

/** The live article, verbatim from https://hellokahwin.com/artikel/idea-dan-nasihat/dewan-kahwin */
const TEN_HALLS = [
  '1. Dewan Seri Siantan, Putrajaya',
  '2. Dewan Komuniti AU2 Taman Keramat',
  '3. Dewan Sivik MBPJ, Petaling Jaya',
  '4. Dewan Kenanga MBSA, Shah Alam',
  '5. Dewan Perdana Keramat',
  '6. Pusat Komuniti Setiawangsa',
  '7. Pusat Komuniti PPR Pinggiran Bukit Jalil',
  '8. Dewan Warisan Kampung Melayu Subang',
  '9. Dewan Seri Melati, Gombak',
  '10. Dewan MBSA Seksyen 7, Shah Alam',
  'Kesimpulan',
];

/** Live: /artikel/idea-dan-nasihat/pelamin-kahwin-dewan — TYPES of hall, not halls. */
const TEN_HALL_TYPES = [
  '1. Dewan Hotel Bertaraf Lima Bintang',
  '2. Dewan Serbaguna Bandar',
  '3. Dewan Komuniti Moden',
  '4. Dewan Universiti atau Kolej',
  '5. Dewan Majlis Perbandaran',
  '6. Dewan Perniagaan atau Konvensyen',
  '7. Dewan Banglo Eksklusif',
  '8. Dewan Resort atau Villa Alam Semula Jadi',
  '9. Dewan Warisan atau Bangunan Bersejarah',
  '10. Dewan Industri atau Warehouse Moden',
  'Kesimpulan',
];

/** Live: /artikel/idea-dan-nasihat/sewa-dewan-kahwin — a numbered list of tips. */
const TIPS = [
  '1. Rancang Bajet Anda',
  '2. Tentukan Lokasi yang Mudah Diakses',
  '3. Saiz Dewan dan Kapasiti Tetamu',
  '4. Fasiliti dan Kemudahan',
  '5. Utamakan Keselesaan Tetamu',
  'Kesimpulan',
];

describe('findLocality', () => {
  it('matches whole words only', () => {
    expect(findLocality('Dewan Perdana Keramat')).toBe('Keramat');
    expect(findLocality('Dewan Keramatan Indah')).toBeNull();
  });

  it('prefers the longer locality', () => {
    expect(findLocality('Dewan Sivik MBPJ, Petaling Jaya')).toBe('Petaling Jaya');
    expect(findLocality('Dewan Komuniti AU2 Taman Keramat')).toBe('Taman Keramat');
  });

  it('normalises casing to the canonical spelling', () => {
    expect(findLocality('dewan seri siantan, PUTRAJAYA')).toBe('Putrajaya');
  });

  it('returns null for a heading that names no place', () => {
    expect(findLocality('Dewan Komuniti Moden')).toBeNull();
    expect(findLocality('Rancang Bajet Anda')).toBeNull();
  });
});

describe('buildItemListJsonLd', () => {
  it('returns null for an article that is not a numbered list', () => {
    expect(build(['Kenapa "RM160" itu bukan RM160', 'Ikut jam atau ikut sesi', 'Ringkasnya'])).toBe(
      null,
    );
  });

  it(`returns null below ${LISTICLE_MIN_ITEMS} numbered headings`, () => {
    expect(build(['1. Satu', '2. Dua', '3. Tiga', 'Kesimpulan'])).toBe(null);
    expect(build(['1. Satu', '2. Dua', '3. Tiga', '4. Empat'])).not.toBe(null);
  });

  it('lists the ten halls, numbered from one, and excludes the un-numbered Kesimpulan', () => {
    const jsonLd = build(TEN_HALLS)!;
    expect(jsonLd['@type']).toBe('ItemList');
    expect(jsonLd.numberOfItems).toBe(10);
    expect(jsonLd.itemListElement).toHaveLength(10);
    const names = (jsonLd.itemListElement as { name: string }[]).map((i) => i.name);
    expect(names).not.toContain('Kesimpulan');
    expect(names[0]).toBe('Dewan Seri Siantan, Putrajaya');
    expect(names[5]).toBe('Pusat Komuniti Setiawangsa');
    expect((jsonLd.itemListElement as { position: number }[]).map((i) => i.position)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
    ]);
  });

  it('points every item at its own anchor on this page', () => {
    const jsonLd = build(TEN_HALLS)!;
    const urls = (jsonLd.itemListElement as { url: string }[]).map((i) => i.url);
    expect(urls[5]).toBe(`${CANONICAL}#pusat-komuniti-setiawangsa`);
    expect(urls.every((u) => u.startsWith(`${CANONICAL}#`))).toBe(true);
    expect(new Set(urls).size).toBe(10);
  });

  it('describes each of the ten halls as a Place with the locality the heading names', () => {
    const items = build(TEN_HALLS)!.itemListElement as {
      item?: { '@type': string; address: { addressLocality: string; addressCountry: string } };
    }[];
    expect(items.filter((i) => i.item).length).toBe(10);
    expect(items.map((i) => i.item?.address.addressLocality)).toEqual([
      'Putrajaya',
      'Taman Keramat',
      'Petaling Jaya',
      'Shah Alam',
      'Keramat',
      'Setiawangsa',
      'Bukit Jalil',
      'Subang',
      'Gombak',
      'Shah Alam',
    ]);
    expect(items.every((i) => i.item?.address.addressCountry === 'MY')).toBe(true);
    expect(items.every((i) => i.item?.['@type'] === 'Place')).toBe(true);
  });

  it('never asserts a region, only the locality the article actually states', () => {
    const items = build(TEN_HALLS)!.itemListElement as { item?: { address: object } }[];
    for (const entry of items) {
      expect(entry.item?.address).not.toHaveProperty('addressRegion');
    }
  });

  it('claims NO Place for an article listing kinds of hall rather than halls', () => {
    const jsonLd = build(TEN_HALL_TYPES)!;
    expect(jsonLd.numberOfItems).toBe(10);
    expect((jsonLd.itemListElement as { item?: unknown }[]).filter((i) => i.item)).toHaveLength(0);
  });

  it('claims NO Place for a numbered list of tips', () => {
    const jsonLd = build(TIPS)!;
    expect(jsonLd.numberOfItems).toBe(5);
    expect((jsonLd.itemListElement as { item?: unknown }[]).filter((i) => i.item)).toHaveLength(0);
  });

  it('ignores h3 sub-points inside a list entry', () => {
    const headings = extractHeadings({
      type: 'doc',
      content: [
        ...[
          '1. Dewan A, Gombak',
          '2. Dewan B, Klang',
          '3. Dewan C, Kajang',
          '4. Dewan D, Bangi',
        ].map((text) => ({
          type: 'heading',
          attrs: { level: 2 },
          content: [{ type: 'text', text }],
        })),
        { type: 'heading', attrs: { level: 3 }, content: [{ type: 'text', text: '5. Kemudahan' }] },
      ],
    });
    const jsonLd = buildItemListJsonLd({ title: 'x', canonicalUrl: CANONICAL, headings })!;
    expect(jsonLd.numberOfItems).toBe(4);
  });

  it('is JSON-serialisable with no undefined holes', () => {
    const json = JSON.stringify(build(TEN_HALLS));
    expect(json).not.toContain('undefined');
    expect(JSON.parse(json)['@context']).toBe('https://schema.org');
  });
});
