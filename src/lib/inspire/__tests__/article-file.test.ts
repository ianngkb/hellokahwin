import { describe, it, expect } from 'vitest';
import { parseArticleFile, ArticleFileError, creditLine } from '../article-file';

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
  it('REFUSES an image written inline in the body instead of declared in front matter', () => {
    const file = validFile().replace(
      'Kadar mas kahwin berbeza mengikut negeri.',
      'Kadar mas kahwin berbeza.\n\n![Dulang hantaran](./images/sneaky.jpg)\n',
    );
    try {
      parseArticleFile(file);
      throw new Error('should have refused');
    } catch (err) {
      expect(err).toBeInstanceOf(ArticleFileError);
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/inline image/);
      expect((err as ArticleFileError).problems.join('\n')).toMatch(/sneaky\.jpg/);
    }
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
