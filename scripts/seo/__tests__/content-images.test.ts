/**
 * The shared image walk, and specifically the ORDINAL it hands out.
 *
 * `backfill-image-alt.mts` wrote 369 alts of the form `${title} — gambar ${n}`
 * where `n` came from this walk. `vision-alt.mts` finds those same images by
 * recomputing that string from this walk. The two agree only for as long as
 * the walk is one function with one definition of "an image" and one order, so
 * the cases below are the ones that would break that agreement quietly:
 * containers that must be walked THROUGH, gallery entries that each count, and
 * an image that already has an alt still taking its place in the sequence.
 */
import { describe, expect, it } from 'vitest';
import { parseGallery, textOf, walkArticleImages } from '../_content-images.mts';

const text = (value: string) => ({ type: 'text', text: value });
const para = (value: string) => ({ type: 'paragraph', content: [text(value)] });
const heading = (value: string) => ({ type: 'heading', content: [text(value)] });
const image = (src: string, attrs: Record<string, unknown> = {}) => ({
  type: 'image',
  attrs: { src, ...attrs },
});
const gallery = (images: unknown[]) => ({
  type: 'galleryBlock',
  attrs: { 'data-images': JSON.stringify(images) },
});
const doc = (...content: unknown[]) => ({ type: 'doc', content });

/** Every ordinal the walk hands out, with the src it handed it to. */
function visit(document: unknown) {
  const seen: { ordinal: number; src: unknown; alt: unknown; heading: string | null }[] = [];
  walkArticleImages(document, (site) =>
    seen.push({ ordinal: site.ordinal, src: site.src, alt: site.alt, heading: site.heading }),
  );
  return seen;
}

describe('walkArticleImages', () => {
  it('numbers images from zero in document order', () => {
    const seen = visit(doc(image('a'), para('x'), image('b'), image('c')));
    expect(seen.map((s) => [s.ordinal, s.src])).toEqual([
      [0, 'a'],
      [1, 'b'],
      [2, 'c'],
    ]);
  });

  it('counts an image that already has an alt', () => {
    // The ordinal is a position ON THE PAGE, not a position in the backlog. An
    // image described by an editor still consumes its number, or every image
    // after it shifts and `gambar 4` names the wrong photograph.
    const seen = visit(doc(image('a', { alt: 'sudah ada' }), image('b')));
    expect(seen.map((s) => s.ordinal)).toEqual([0, 1]);
    expect(seen[1].src).toBe('b');
  });

  it('descends into sectionBlock rather than stopping at it', () => {
    // The bug this replaced looked for a node type called `section`, which does
    // not exist, and silently skipped every image inside a real one.
    const seen = visit(
      doc(image('outside'), {
        type: 'sectionBlock',
        content: [image('inside-1'), { type: 'blockquote', content: [image('inside-2')] }],
      }),
    );
    expect(seen.map((s) => s.src)).toEqual(['outside', 'inside-1', 'inside-2']);
  });

  it('treats figureBlock as an image', () => {
    const seen = visit(
      doc({ type: 'figureBlock', attrs: { src: 'f', 'data-caption': 'SOURCE: X' } }),
    );
    expect(seen).toHaveLength(1);
    expect(seen[0].src).toBe('f');
  });

  it('gives every gallery entry its own ordinal', () => {
    const seen = visit(
      doc(image('a'), gallery([{ src: 'g1' }, { src: 'g2' }, { src: 'g3' }]), image('b')),
    );
    expect(seen.map((s) => [s.ordinal, s.src])).toEqual([
      [0, 'a'],
      [1, 'g1'],
      [2, 'g2'],
      [3, 'g3'],
      [4, 'b'],
    ]);
  });

  it('carries the nearest preceding heading, and null above the first one', () => {
    const seen = visit(doc(image('a'), heading('1. Jardin Event Venue'), image('b')));
    expect(seen[0].heading).toBeNull();
    expect(seen[1].heading).toBe('1. Jardin Event Venue');
  });

  it('does not count an image nested inside a heading', () => {
    // A heading contributes its text and nothing else; descending into it would
    // both mis-number and read a decorative mark as a photograph.
    const seen = visit(
      doc({ type: 'heading', content: [text('Tajuk'), image('inside-heading')] }, image('a')),
    );
    expect(seen.map((s) => s.src)).toEqual(['a']);
  });

  it('writes an alt back onto an image node', () => {
    const document = doc(image('a'));
    walkArticleImages(document, (site) => site.setAlt('pelamin putih dengan bunga segar'));
    expect((document.content[0] as { attrs: { alt?: string } }).attrs.alt).toBe(
      'pelamin putih dengan bunga segar',
    );
  });

  it('re-serialises data-images once a gallery entry is rewritten', () => {
    const document = doc(gallery([{ src: 'g1' }, { src: 'g2', alt: 'asal' }]));
    walkArticleImages(document, (site) => {
      if (site.src === 'g1') site.setAlt('meja tetamu');
    });
    const raw = (document.content[0] as { attrs: Record<string, string> }).attrs['data-images'];
    expect(JSON.parse(raw)).toEqual([
      { src: 'g1', alt: 'meja tetamu' },
      { src: 'g2', alt: 'asal' },
    ]);
  });

  it('leaves data-images untouched when nothing in the gallery was rewritten', () => {
    const original = JSON.stringify([{ src: 'g1' }]);
    const document = doc({ type: 'galleryBlock', attrs: { 'data-images': original } });
    walkArticleImages(document, () => {});
    expect((document.content[0] as { attrs: Record<string, string> }).attrs['data-images']).toBe(
      original,
    );
  });

  it('survives a document with no content at all', () => {
    expect(visit(null)).toEqual([]);
    expect(visit({})).toEqual([]);
    expect(visit({ type: 'doc', content: [] })).toEqual([]);
  });
});

describe('parseGallery', () => {
  it('reads the images out of the attribute', () => {
    expect(parseGallery({ 'data-images': '[{"src":"a"}]' })).toEqual([{ src: 'a' }]);
  });

  it('treats malformed or missing JSON as no images rather than throwing', () => {
    // A gallery nobody can parse is a gallery with nothing in it. Throwing here
    // would abort a whole migration over one bad attribute.
    expect(parseGallery({ 'data-images': 'not json' })).toEqual([]);
    expect(parseGallery({ 'data-images': '{"src":"a"}' })).toEqual([]);
    expect(parseGallery({})).toEqual([]);
    expect(parseGallery(undefined)).toEqual([]);
  });
});

describe('textOf', () => {
  it('joins nested text nodes and trims', () => {
    expect(
      textOf({ type: 'heading', content: [text(' Dewan '), { content: [text('Seri')] }] }),
    ).toBe('Dewan Seri');
  });

  it('is empty for a node with no text in it', () => {
    expect(textOf(image('a'))).toBe('');
  });
});
