/**
 * The rewrite script writes to PUBLISHED editorial content, so the rule it
 * applies is tested here rather than trusted from a dry-run read-through.
 *
 * The fixture is the real production shape as measured on 4 September 2026:
 * `hantaran-kahwin` and `hantaran-tunang` live under `hantaran-mas-kahwin`
 * while article bodies still link them under `hiasan-dekorasi`, and
 * `goodies-kahwin` genuinely still lives under `hiasan-dekorasi` — which is
 * what makes "the category segment is stale" the wrong rule and "the slug is
 * authoritative" the right one.
 */
import { describe, expect, it } from 'vitest';
import { resolveInternalHref, type InternalHrefTargets } from '@/lib/inspire/internal-links';

const targets: InternalHrefTargets = {
  articlePathBySlug: new Map([
    ['hantaran-kahwin', '/artikel/hantaran-mas-kahwin/hantaran-kahwin'],
    ['hantaran-tunang', '/artikel/hantaran-mas-kahwin/hantaran-tunang'],
    ['goodies-kahwin', '/artikel/hiasan-dekorasi/goodies-kahwin'],
    ['dewan-kahwin', '/artikel/idea-dan-nasihat/dewan-kahwin'],
    ['garden-wedding', '/artikel/idea-dan-nasihat/garden-wedding'],
    // Both a published article and a tag on the live site. The collision is
    // the point: see the tag test below.
    ['rukun-nikah', '/artikel/nikah-undang-undang/rukun-nikah'],
  ]),
  categorySlugs: new Set(['hantaran-mas-kahwin', 'hiasan-dekorasi', 'idea-dan-nasihat']),
};

const resolve = (href: string) => resolveInternalHref(href, targets);

describe('resolveInternalHref', () => {
  it('leaves an already-canonical article link alone', () => {
    expect(resolve('/artikel/hantaran-mas-kahwin/hantaran-kahwin')).toBeNull();
    expect(resolve('/artikel/hiasan-dekorasi/goodies-kahwin')).toBeNull();
  });

  it('moves an article linked under its OLD category to the current one', () => {
    expect(resolve('/artikel/hiasan-dekorasi/hantaran-kahwin')).toBe(
      '/artikel/hantaran-mas-kahwin/hantaran-kahwin',
    );
    expect(resolve('/artikel/hiasan-dekorasi/hantaran-tunang')).toBe(
      '/artikel/hantaran-mas-kahwin/hantaran-tunang',
    );
  });

  it('resolves the legacy flat permalink, absolute and slashed, in one step', () => {
    expect(resolve('https://hellokahwin.com/dewan-kahwin/')).toBe(
      '/artikel/idea-dan-nasihat/dewan-kahwin',
    );
    expect(resolve('http://hellokahwin.com/garden-wedding/')).toBe(
      '/artikel/idea-dan-nasihat/garden-wedding',
    );
    expect(resolve('https://www.hellokahwin.com/dewan-kahwin')).toBe(
      '/artikel/idea-dan-nasihat/dewan-kahwin',
    );
    expect(resolve('/dewan-kahwin/')).toBe('/artikel/idea-dan-nasihat/dewan-kahwin');
  });

  it('keeps the query string and the fragment across the rewrite', () => {
    expect(resolve('/dewan-kahwin/?utm_source=ig#bajet')).toBe(
      '/artikel/idea-dan-nasihat/dewan-kahwin?utm_source=ig#bajet',
    );
    expect(resolve('/artikel/hiasan-dekorasi/hantaran-kahwin#senarai')).toBe(
      '/artikel/hantaran-mas-kahwin/hantaran-kahwin#senarai',
    );
  });

  it('applies the WordPress structural rules the middleware already owns', () => {
    expect(resolve('/category/hiasan-dekorasi/')).toBe('/artikel/hiasan-dekorasi');
    expect(resolve('/tag/rukun-nikah')).toBe('/artikel/tag/rukun-nikah');
  });

  it('never reads a tag page as an article, even when the two share a slug', () => {
    // `rukun-nikah` is a tag AND a published article. Three segments, so the
    // article rule would have matched and turned a link to the tag archive
    // into a link to one article — a silent change of meaning, not a redirect
    // saved.
    expect(resolve('/artikel/tag/rukun-nikah')).toBeNull();
    expect(resolve('/artikel/tag/rukun-nikah/')).toBe('/artikel/tag/rukun-nikah');
    expect(resolve('https://hellokahwin.com/tag/rukun-nikah/')).toBe('/artikel/tag/rukun-nikah');
  });

  it('normalises a trailing slash only when the destination is known to exist', () => {
    expect(resolve('/artikel/hantaran-mas-kahwin/')).toBe('/artikel/hantaran-mas-kahwin');
    expect(resolve('/artikel/')).toBe('/artikel');
    expect(resolve('/')).toBeNull();
    // The destination does not exist, so the slash is left alone rather than
    // normalised into a tidy 404.
    expect(resolve('/artikel/tak-wujud/')).toBeNull();
    expect(resolve('/category/tak-wujud/')).toBeNull();
  });

  it('leaves external links, anchors and mail links untouched', () => {
    expect(resolve('https://theweddingnotebook.com/x')).toBeNull();
    expect(resolve('//evil.example/x')).toBeNull();
    expect(resolve('#soalan-lazim')).toBeNull();
    expect(resolve('mailto:hello@hellokahwin.com')).toBeNull();
    expect(resolve('tel:+60123456789')).toBeNull();
  });

  it('resolves a protocol-relative link to our own host', () => {
    expect(resolve('//hellokahwin.com/dewan-kahwin/')).toBe(
      '/artikel/idea-dan-nasihat/dewan-kahwin',
    );
    expect(resolve('//www.hellokahwin.com/dewan-kahwin')).toBe(
      '/artikel/idea-dan-nasihat/dewan-kahwin',
    );
  });

  it('will not rewrite a same-host URL that is not a page of this website', () => {
    // Matching the hostname is not enough: these address a different scheme
    // and a different port, and a root-relative path is not the same resource.
    expect(resolve('ftp://hellokahwin.com/dewan-kahwin/')).toBeNull();
    expect(resolve('https://hellokahwin.com:8443/dewan-kahwin/')).toBeNull();
  });

  it('refuses to guess: unknown slugs, unknown categories and app routes are left as written', () => {
    expect(resolve('/artikel/hantaran-mas-kahwin/tiada-artikel-ini')).toBeNull();
    expect(resolve('/artikel/kategori-yang-tak-wujud')).toBeNull();
    expect(resolve('/tiada-slug-ini')).toBeNull();
    // A reserved top-level segment must never be resolved as an article slug,
    // even if some article one day carries that slug.
    expect(resolve('/admin')).toBeNull();
    expect(resolve('/login')).toBeNull();
    expect(resolve('/brand')).toBeNull();
  });

  it('does not truncate a path shape the app does not serve', () => {
    expect(resolve('/artikel/a/b/c')).toBeNull();
  });
});
