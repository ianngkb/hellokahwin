import { describe, it, expect } from 'vitest';
import { parseArticleFile, ArticleFileError, creditLine, bodyInternalLinks } from '../article-file';

/** A file that should pass, used as the base for every "one thing wrong" case. */
function validFile(overrides: { coverExtra?: string; drop?: string } = {}) {
  const coverLines = [
    '  file: ./images/01-dulang.jpg',
    '  alt: Dulang mas kahwin berhias di atas meja akad',
    '  credit: Foto oleh Studio Aisyah',
    '  creditUrl: https://studioaisyah.my',
    '  licenseClass: V',
    '  licensorName: Studio Aisyah Sdn Bhd',
  ].filter((l) => !overrides.drop || !l.trim().startsWith(overrides.drop));

  return `---
title: Mas kahwin ikut negeri 2026
slug: mas-kahwin-ikut-negeri-2026
pillar: P2
cluster: C2.4
metaDescription: Kadar mas kahwin terkini mengikut negeri di Malaysia.
author: me@ian.ng
status: draft
tags:
  - mas kahwin
cover:
${coverLines.join('\n')}${overrides.coverExtra ? '\n' + overrides.coverExtra : ''}
---

# Mas kahwin ikut negeri

Kadar mas kahwin berbeza mengikut negeri.
`;
}

describe('parseArticleFile', () => {
  it('accepts a complete file', () => {
    const parsed = parseArticleFile(validFile());
    expect(parsed.frontMatter.slug).toBe('mas-kahwin-ikut-negeri-2026');
    expect(parsed.frontMatter.pillar).toBe('P2');
    expect(parsed.frontMatter.cluster).toBe('C2.4');
    expect(parsed.frontMatter.cover.credit).toBe('Foto oleh Studio Aisyah');
    // Defaults applied rather than demanded.
    expect(parsed.frontMatter.status).toBe('draft');
    expect(parsed.frontMatter.images).toEqual([]);
    expect(parsed.markdown).toContain('Kadar mas kahwin berbeza mengikut negeri.');
  });

  // ── The owner-level requirement. These three are the gate. ─────────────────

  it('REFUSES a file whose cover image has no credit', () => {
    expect(() => parseArticleFile(validFile({ drop: 'credit:' }))).toThrow(ArticleFileError);
    try {
      parseArticleFile(validFile({ drop: 'credit:' }));
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/cover\.credit/);
    }
  });

  it('REFUSES a file whose image has no licence class', () => {
    try {
      parseArticleFile(validFile({ drop: 'licenseClass:' }));
      throw new Error('should have refused');
    } catch (err) {
      expect(err).toBeInstanceOf(ArticleFileError);
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/cover\.licenseClass/);
    }
  });

  it('REFUSES a file whose image has no licensor name', () => {
    try {
      parseArticleFile(validFile({ drop: 'licensorName:' }));
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/cover\.licensorName/);
    }
  });

  // Regression: a whitespace-only credit passed the owner-level gate. An image
  // credited to "   " is an uncredited image.
  it.each(['credit', 'licensorName', 'alt'])('REFUSES a whitespace-only %s', (field) => {
    const file = validFile().replace(new RegExp(`  ${field}: .*`), `  ${field}: "   "`);
    expect(() => parseArticleFile(file)).toThrow(ArticleFileError);
  });

  // Regression: a markdown image written inline in the body rendered on the
  // page while never passing through `images:` — no credit, no media row, no
  // upload. That is an uncredited photograph on a live page, which is the one
  // thing this gate exists to prevent.
  // All THREE ways to put a picture in a markdown body. The first version of
  // this gate caught only the inline form; reference-style and raw HTML went
  // straight past it, leaving the gate looking shut with two doors open.
  it.each([
    ['inline', '![Dulang hantaran](./images/sneaky.jpg)', 'sneaky\\.jpg'],
    ['full reference', '![Dulang][foto]\n\n[foto]: ./images/sneaky.jpg', 'Dulang'],
    // No second bracket at all — the form a narrower pattern missed.
    ['shortcut reference', '![foto]\n\n[foto]: ./images/sneaky.jpg', 'foto'],
    ['collapsed reference', '![foto][]\n\n[foto]: ./images/sneaky.jpg', 'foto'],
    ['raw HTML', '<img src="./images/sneaky.jpg" alt="Dulang">', 'sneaky\\.jpg'],
    ['raw HTML, unquoted', '<img src=./images/sneaky.jpg>', 'sneaky\\.jpg'],
    // Whitespace around `=` is legal HTML and slipped past a tighter pattern.
    ['raw HTML, spaced =', '<img  src = "./images/sneaky.jpg" >', 'sneaky\\.jpg'],
    ['raw HTML, single quotes', "<img src='./images/sneaky.jpg'>", 'sneaky\\.jpg'],
  ])('REFUSES a %s image written into the body', (_kind, snippet, expected) => {
    const file = validFile().replace(
      'Kadar mas kahwin berbeza mengikut negeri.',
      `Kadar mas kahwin berbeza.\n\n${snippet}\n`,
    );
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect(err).toBeInstanceOf(ArticleFileError);
      const problems = (err as ArticleFileError).problems.join('\n');
      expect(problems).toMatch(/written into the body/);
      expect(problems).toMatch(new RegExp(expected));
    }
  });

  // AA-6. The five classes are policy and stay closed, but a gate that rejects
  // CORRECT work teaches people to route around it, and the image rule cannot
  // afford that. `v` and ` V ` are legitimate credits.
  it.each(['v', 'V ', ' v ', 'c', 'g'])('ACCEPTS licenceClass %o, normalising it', (raw) => {
    const file = validFile().replace('licenseClass: V', `licenseClass: "${raw}"`);
    const parsed = parseArticleFile(file);
    expect(parsed.frontMatter.cover.licenseClass).toBe(raw.trim().toUpperCase());
  });

  it('REFUSES an unknown licence class — there is no sixth class', () => {
    const file = validFile().replace('licenseClass: V', 'licenseClass: X');
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/licenseClass/);
    }
  });

  it('REFUSES an in-article image missing a credit, not just the cover', () => {
    const file = validFile().replace(
      '---\n\n# Mas kahwin',
      `images:
  - file: ./images/02-akad.jpg
    alt: Majlis akad nikah
    licenseClass: V
    licensorName: Studio Aisyah Sdn Bhd
---

# Mas kahwin`,
    );
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/images\.0\.credit/);
    }
  });

  // ── Everything else ingest must not invent ────────────────────────────────

  it('REFUSES a missing meta description rather than generating one', () => {
    const file = validFile().replace(
      'metaDescription: Kadar mas kahwin terkini mengikut negeri di Malaysia.\n',
      '',
    );
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/metaDescription/);
    }
  });

  it('REFUSES a meta description over 160 characters', () => {
    const file = validFile().replace(
      'metaDescription: Kadar mas kahwin terkini mengikut negeri di Malaysia.',
      `metaDescription: ${'a'.repeat(161)}`,
    );
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/160/);
    }
  });

  it('REFUSES a slug that is not URL-safe', () => {
    const file = validFile().replace('slug: mas-kahwin-ikut-negeri-2026', 'slug: Mas Kahwin 2026');
    expect(() => parseArticleFile(file)).toThrow(/slug/);
  });

  it('REFUSES a cluster code that is not in the approved shape', () => {
    const file = validFile().replace('cluster: C2.4', 'cluster: hantaran');
    expect(() => parseArticleFile(file)).toThrow(/cluster/);
  });

  it('REFUSES a file with front matter but no body', () => {
    const file = validFile().replace(/\n# Mas kahwin[\s\S]*$/, '\n');
    expect(() => parseArticleFile(file)).toThrow(/no article body/);
  });

  it('REFUSES a file with no front matter at all', () => {
    expect(() => parseArticleFile('# Just a heading\n\nSome text.')).toThrow(/front matter/);
  });

  it('reports EVERY problem at once, not one per run', () => {
    const file = validFile({ drop: 'credit:' })
      .replace('slug: mas-kahwin-ikut-negeri-2026', 'slug: NOT A SLUG')
      .replace('cluster: C2.4', 'cluster: nope');
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect((err as ArticleFileError).problems.length).toBeGreaterThanOrEqual(3);
    }
  });
});

// ECH-7. Only the front-matter list was validated; the links a writer actually
// types into their prose went unchecked. On this site internal linking IS the
// architecture, so a dead body link is a defect in the thing being built.
describe('bodyInternalLinks', () => {
  it('finds a canonical article link', () => {
    expect(
      bodyInternalLinks('See [hantaran kahwin](/artikel/hantaran-mas-kahwin/hantaran-kahwin).'),
    ).toEqual(['hantaran-kahwin']);
  });

  it('finds a legacy root permalink', () => {
    expect(bodyInternalLinks('See [mas kahwin](/mas-kahwin-ikut-negeri).')).toEqual([
      'mas-kahwin-ikut-negeri',
    ]);
  });

  it('strips fragments, query strings and trailing slashes', () => {
    expect(
      bodyInternalLinks(
        '[a](/artikel/p/slug-a#bahagian-2) [b](/artikel/p/slug-b?utm=x) [c](/artikel/p/slug-c/)',
      ),
    ).toEqual(['slug-a', 'slug-b', 'slug-c']);
  });

  it('ignores a category hub — it is not an article', () => {
    expect(bodyInternalLinks('[hub](/artikel/hantaran-mas-kahwin)')).toEqual([]);
  });

  it('ignores external links, anchors and mailto', () => {
    expect(
      bodyInternalLinks('[a](https://example.com/x) [b](#heading) [c](mailto:me@ian.ng)'),
    ).toEqual([]);
  });

  it('deduplicates repeated links to the same article', () => {
    expect(bodyInternalLinks('[a](/artikel/p/x) and again [a](/artikel/p/x)')).toEqual(['x']);
  });
});

describe('creditLine', () => {
  it('uses the credit alone when there is no caption', () => {
    expect(creditLine({ credit: 'Foto oleh Studio Aisyah' })).toBe('Foto oleh Studio Aisyah');
  });

  it('keeps caption and credit distinct rather than one replacing the other', () => {
    expect(
      creditLine({ caption: 'Dulang hantaran lapan', credit: 'Foto oleh Studio Aisyah' }),
    ).toBe('Dulang hantaran lapan — Foto oleh Studio Aisyah');
  });
});
