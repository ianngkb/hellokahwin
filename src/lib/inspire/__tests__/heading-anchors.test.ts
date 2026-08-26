import { describe, it, expect } from 'vitest';
import { generateHTML } from '@tiptap/html';
import sanitizeHtml from 'sanitize-html';
import { extensions, sanitizeOptions } from '@/components/inspire/article-renderer';
import {
  slugifyHeadingText,
  stripLeadingOrdinal,
  createHeadingIdAssigner,
  extractHeadings,
  injectHeadingIds,
} from '../heading-anchors';

/** Build a Tiptap doc from a list of `[level, text]` headings plus filler. */
function docFromHeadings(headings: [number, string][]) {
  return {
    type: 'doc',
    content: headings.flatMap(([level, text]) => [
      { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] },
      { type: 'paragraph', content: [{ type: 'text', text: 'Isi bahagian ini.' }] },
    ]),
  };
}

/** The renderer's real pipeline: Tiptap JSON -> HTML -> sanitise -> inject. */
function renderIds(doc: unknown): string[] {
  const raw = generateHTML(
    doc as Parameters<typeof generateHTML>[0],
    extensions as Parameters<typeof generateHTML>[1],
  );
  const html = injectHeadingIds(sanitizeHtml(raw, sanitizeOptions), createHeadingIdAssigner());
  return [...html.matchAll(/<h[23] id="([^"]+)"/g)].map((m) => m[1]);
}

describe('slugifyHeadingText', () => {
  it('strips the list ordinal so reordering a listicle does not break every link', () => {
    expect(slugifyHeadingText('1. Dewan Seri Siantan, Putrajaya')).toBe(
      'dewan-seri-siantan-putrajaya',
    );
    expect(slugifyHeadingText('10. Dewan MBSA Seksyen 7, Shah Alam')).toBe(
      'dewan-mbsa-seksyen-7-shah-alam',
    );
    // Same heading, renumbered: same id.
    expect(slugifyHeadingText('7. Pusat Komuniti Setiawangsa')).toBe(
      slugifyHeadingText('2. Pusat Komuniti Setiawangsa'),
    );
  });

  it('leaves a number that is part of the heading alone', () => {
    expect(slugifyHeadingText('5 Tips Memilih Dewan')).toBe('5-tips-memilih-dewan');
  });

  it('drops apostrophes rather than turning them into separators', () => {
    expect(slugifyHeadingText('LRT Putra Dato’ Keramat')).toBe('lrt-putra-dato-keramat');
  });

  it('folds diacritics instead of dropping the letter', () => {
    expect(slugifyHeadingText('Café Décor')).toBe('cafe-decor');
  });

  it('collapses punctuation and trims separators', () => {
    expect(slugifyHeadingText('  Kesimpulan: apa yang penting?  ')).toBe(
      'kesimpulan-apa-yang-penting',
    );
  });

  it('caps length at a word boundary', () => {
    const long = slugifyHeadingText(
      'Dewan Komuniti Serbaguna Yang Sangat Panjang Namanya Di Kawasan Perumahan Bandar Baru',
    );
    expect(long.length).toBeLessThanOrEqual(72);
    expect(long.endsWith('-')).toBe(false);
    expect(long.startsWith('dewan-komuniti-serbaguna')).toBe(true);
  });

  it('returns empty for text with nothing sluggable, leaving the fallback to the caller', () => {
    expect(slugifyHeadingText('***')).toBe('');
    expect(slugifyHeadingText('1. ***')).toBe('');
  });

  it('is deterministic', () => {
    const text = '6. Pusat Komuniti Setiawangsa';
    expect(slugifyHeadingText(text)).toBe(slugifyHeadingText(text));
  });
});

describe('stripLeadingOrdinal', () => {
  it('handles the punctuation styles the editor produces', () => {
    expect(stripLeadingOrdinal('1. Satu')).toBe('Satu');
    expect(stripLeadingOrdinal('2) Dua')).toBe('Dua');
    expect(stripLeadingOrdinal('3: Tiga')).toBe('Tiga');
    expect(stripLeadingOrdinal('Empat')).toBe('Empat');
  });
});

describe('createHeadingIdAssigner', () => {
  it('gives duplicate headings distinct ids', () => {
    const assign = createHeadingIdAssigner();
    expect(['Kesimpulan', 'Kesimpulan', 'Kesimpulan'].map(assign)).toEqual([
      'kesimpulan',
      'kesimpulan-2',
      'kesimpulan-3',
    ]);
  });

  it('does not hand out an id a real heading already took', () => {
    const assign = createHeadingIdAssigner();
    // "Nota 2" slugs to `nota-2`, which is also what a second "Nota" wants.
    const ids = ['Nota', 'Nota 2', 'Nota'].map(assign);
    expect(ids).toEqual(['nota', 'nota-2', 'nota-3']);
    expect(new Set(ids).size).toBe(3);
  });

  it('falls back to a positional id for unsluggable text', () => {
    const assign = createHeadingIdAssigner();
    expect(['Satu', '***', '???'].map(assign)).toEqual(['satu', 'bahagian-2', 'bahagian-3']);
  });
});

describe('extractHeadings', () => {
  it('collects h2 and h3 in document order and ignores h1/h4', () => {
    const doc = docFromHeadings([
      [1, 'Tajuk'],
      [2, '1. Dewan Seri Siantan, Putrajaya'],
      [3, 'Kemudahan'],
      [2, '2. Dewan Perdana Keramat'],
      [4, 'Nota kaki'],
    ]);
    expect(extractHeadings(doc)).toEqual([
      {
        level: 2,
        text: '1. Dewan Seri Siantan, Putrajaya',
        label: 'Dewan Seri Siantan, Putrajaya',
        id: 'dewan-seri-siantan-putrajaya',
      },
      { level: 3, text: 'Kemudahan', label: 'Kemudahan', id: 'kemudahan' },
      {
        level: 2,
        text: '2. Dewan Perdana Keramat',
        label: 'Dewan Perdana Keramat',
        id: 'dewan-perdana-keramat',
      },
    ]);
  });

  it('sees headings inside editor-only sectionBlock wrappers', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'sectionBlock',
          content: [
            { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Dalam' }] },
          ],
        },
        { type: 'heading', attrs: { level: 2 }, content: [{ type: 'text', text: 'Luar' }] },
      ],
    };
    expect(extractHeadings(doc).map((h) => h.id)).toEqual(['dalam', 'luar']);
  });

  it('joins a heading split across marks into one id', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'heading',
          attrs: { level: 2 },
          content: [
            { type: 'text', text: 'Dewan ' },
            { type: 'text', marks: [{ type: 'bold' }], text: 'Perdana' },
            { type: 'text', text: ' Keramat' },
          ],
        },
      ],
    };
    expect(extractHeadings(doc)[0].id).toBe('dewan-perdana-keramat');
  });

  it('returns nothing for empty or malformed content', () => {
    expect(extractHeadings(null)).toEqual([]);
    expect(extractHeadings({ type: 'doc' })).toEqual([]);
  });
});

describe('injectHeadingIds', () => {
  it('adds an id to h2 and h3 and leaves other tags alone', () => {
    const html = injectHeadingIds(
      '<h2>Satu</h2><p>Teks</p><h3>Dua</h3><h4>Tiga</h4>',
      createHeadingIdAssigner(),
    );
    expect(html).toBe('<h2 id="satu">Satu</h2><p>Teks</p><h3 id="dua">Dua</h3><h4>Tiga</h4>');
  });

  it('keeps existing attributes and inline markup', () => {
    const html = injectHeadingIds(
      '<h2 class="x">Dewan <strong>Perdana</strong> Keramat</h2>',
      createHeadingIdAssigner(),
    );
    expect(html).toBe(
      '<h2 id="dewan-perdana-keramat" class="x">Dewan <strong>Perdana</strong> Keramat</h2>',
    );
  });

  it('decodes entities before slugging', () => {
    const html = injectHeadingIds('<h2>Katering &amp; Menu</h2>', createHeadingIdAssigner());
    expect(html).toContain('id="katering-menu"');
  });

  it('shares one assigner across the fragments of one article', () => {
    const assign = createHeadingIdAssigner();
    const a = injectHeadingIds('<h2>Kesimpulan</h2>', assign);
    const b = injectHeadingIds('<h2>Kesimpulan</h2>', assign);
    expect(a).toContain('id="kesimpulan"');
    expect(b).toContain('id="kesimpulan-2"');
  });
});

describe('the TOC and the rendered HTML agree', () => {
  // This is the assertion that matters. The table of contents is built from
  // the Tiptap JSON and the ids are injected into the rendered HTML by two
  // different code paths; if they ever disagree, every anchor in the TOC
  // points at nothing.
  const cases: Record<string, [number, string][]> = {
    'the ten-hall listicle': [
      [2, '1. Dewan Seri Siantan, Putrajaya'],
      [2, '2. Dewan Komuniti AU2 Taman Keramat'],
      [2, '3. Dewan Sivik MBPJ, Petaling Jaya'],
      [2, '4. Dewan Kenanga MBSA, Shah Alam'],
      [2, '5. Dewan Perdana Keramat'],
      [2, '6. Pusat Komuniti Setiawangsa'],
      [2, '7. Pusat Komuniti PPR Pinggiran Bukit Jalil'],
      [2, '8. Dewan Warisan Kampung Melayu Subang'],
      [2, '9. Dewan Seri Melati, Gombak'],
      [2, '10. Dewan MBSA Seksyen 7, Shah Alam'],
      [2, 'Kesimpulan'],
    ],
    'nested h3s': [
      [2, 'Bajet'],
      [3, 'Deposit'],
      [3, 'Bayaran penuh'],
      [2, 'Lokasi'],
      [3, 'Deposit'],
    ],
    'repeated and unsluggable headings': [
      [2, 'Kesimpulan'],
      [2, 'Kesimpulan'],
      [2, '***'],
      [2, 'Kesimpulan'],
    ],
  };

  for (const [label, headings] of Object.entries(cases)) {
    it(`matches for ${label}`, () => {
      const doc = docFromHeadings(headings);
      const tocIds = extractHeadings(doc).map((h) => h.id);
      expect(renderIds(doc)).toEqual(tocIds);
      expect(new Set(tocIds).size).toBe(tocIds.length);
    });
  }

  it('produces the anchors the ten-hall listicle needs', () => {
    const ids = extractHeadings(docFromHeadings(cases['the ten-hall listicle'])).map((h) => h.id);
    expect(ids).toContain('pusat-komuniti-setiawangsa');
    expect(ids).toContain('dewan-seri-siantan-putrajaya');
    expect(ids).toContain('dewan-mbsa-seksyen-7-shah-alam');
  });
});
