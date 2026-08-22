import { describe, it, expect } from 'vitest';
import { generateHTML } from '@tiptap/html';
import sanitizeHtml from 'sanitize-html';
import { extensions, sanitizeOptions } from '../article-renderer';

/**
 * The top-level React path (`splitContentByGalleryBlocks`, `unwrapSections`)
 * intercepts these node types before they reach `generateHTML`. A block NESTED
 * inside a blockquote, a list item or a table cell does not get intercepted —
 * it reaches `generateHTML`, which used to throw on an unknown node type into a
 * bare `catch {}` that deleted the whole surrounding chunk of the article.
 *
 * These assert the degraded path: no throw, and the content still readable.
 */
const render = (nested: Record<string, unknown>) => {
  const doc = { type: 'doc', content: [{ type: 'blockquote', content: [nested] }] };
  return sanitizeHtml(
    generateHTML(doc as Parameters<typeof generateHTML>[0], extensions as never),
    sanitizeOptions,
  );
};

describe('nested custom blocks reach the page instead of vanishing', () => {
  it('renders a nested gallery as figures with images and captions', () => {
    const html = render({
      type: 'galleryBlock',
      attrs: {
        'data-images': JSON.stringify([
          { src: 'https://img.example/a.jpg', alt: 'A', caption: 'Shot by X', captionUrl: '' },
          { src: 'https://img.example/b.jpg', alt: 'B', caption: '', captionUrl: '' },
        ]),
      },
    });
    expect(html).toContain('https://img.example/a.jpg');
    expect(html).toContain('https://img.example/b.jpg');
    expect(html).toContain('Shot by X');
  });

  it('survives a gallery whose data-images is malformed', () => {
    expect(() =>
      render({ type: 'galleryBlock', attrs: { 'data-images': 'not json' } }),
    ).not.toThrow();
  });

  it('renders a nested figure as an image plus its caption', () => {
    const html = render({
      type: 'figureBlock',
      attrs: {
        src: 'https://img.example/f.jpg',
        alt: 'F',
        'data-caption': 'Venue: Somewhere',
        'data-caption-url': 'https://example.com/venue',
      },
    });
    expect(html).toContain('https://img.example/f.jpg');
    expect(html).toContain('Venue: Somewhere');
    expect(html).toContain('https://example.com/venue');
  });

  it('renders a nested CTA button as a real link', () => {
    const html = render({
      type: 'ctaButtonBlock',
      attrs: { 'data-text': 'Book a viewing', 'data-url': 'https://example.com/book' },
    });
    expect(html).toContain('https://example.com/book');
    expect(html).toContain('Book a viewing');
  });

  it('renders a nested PDF block as a real link', () => {
    const html = render({
      type: 'pdfLinkBlock',
      attrs: { 'data-text': 'Price list', 'data-url': 'https://cdn.example/prices.pdf' },
    });
    expect(html).toContain('https://cdn.example/prices.pdf');
    expect(html).toContain('Price list');
  });

  it('renders a nested section transparently, keeping its children', () => {
    const html = render({
      type: 'sectionBlock',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'inner copy' }] }],
    });
    expect(html).toContain('inner copy');
  });

  it('keeps a CTA/PDF label even when the url attribute is missing', () => {
    expect(render({ type: 'ctaButtonBlock', attrs: { 'data-text': 'No link' } })).toContain(
      'No link',
    );
    expect(render({ type: 'pdfLinkBlock', attrs: { 'data-text': 'No file' } })).toContain(
      'No file',
    );
  });
});
