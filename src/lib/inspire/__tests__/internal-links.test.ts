/**
 * The regression guard for the nofollow defect.
 *
 * The test that matters is the LAST one: it runs a markdown internal link
 * through the exact ingest pipeline and then the exact renderer, and asserts
 * the delivered `<a>` is followed. That end-to-end shape is deliberate —
 * asserting the extension in isolation would have passed on 25 Aug too, while
 * production shipped 79 nofollowed internal links.
 */
import { describe, expect, it } from 'vitest';
import { marked } from 'marked';
import { generateJSON, generateHTML } from '@tiptap/html';
import StarterKit from '@tiptap/starter-kit';
import UnderlineExtension from '@tiptap/extension-underline';
import Table from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import ImageExtension from '@tiptap/extension-image';
import { extensions as rendererExtensions } from '@/components/inspire/article-renderer';
import {
  InternalAwareLink,
  isInternalHref,
  normaliseInternalLinkMarks,
} from '@/lib/inspire/internal-links';

const ingestExtensions = [
  StarterKit,
  ImageExtension,
  InternalAwareLink.configure({ openOnClick: false, defaultProtocol: 'https' }),
  UnderlineExtension,
  Table,
  TableRow,
  TableHeader,
  TableCell,
];

describe('isInternalHref', () => {
  it('accepts both spellings the site actually uses', () => {
    expect(isInternalHref('/artikel/venue-perancangan/bajet-kahwin')).toBe(true);
    expect(isInternalHref('https://hellokahwin.com/dewan-kahwin/')).toBe(true);
    expect(isInternalHref('https://www.hellokahwin.com/dewan-kahwin/')).toBe(true);
  });

  it('rejects everything else, protocol-relative URLs included', () => {
    expect(isInternalHref('https://theweddingnotebook.com/inspire/x/')).toBe(false);
    expect(isInternalHref('//hellokahwin.com.evil.test/x')).toBe(false);
    expect(isInternalHref('mailto:hello@hellokahwin.com')).toBe(false);
    expect(isInternalHref('https://nothellokahwin.com/x')).toBe(false);
  });
});

describe('normaliseInternalLinkMarks', () => {
  it('rewrites internal marks and leaves external ones alone', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'dalam',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: '/artikel/a/b',
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                  },
                },
              ],
            },
            {
              type: 'text',
              text: 'luar',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://example.test/x',
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    expect(normaliseInternalLinkMarks(doc)).toBe(1);
    const [internal, external] = doc.content[0].content;
    expect(internal.marks[0].attrs).toMatchObject({ rel: 'noopener', target: '_self' });
    expect(external.marks[0].attrs).toMatchObject({
      rel: 'noopener noreferrer nofollow',
      target: '_blank',
    });
  });

  it('is idempotent, so a re-ingest changes nothing', () => {
    const doc = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'x',
              marks: [{ type: 'link', attrs: { href: '/a', rel: 'noopener', target: '_self' } }],
            },
          ],
        },
      ],
    };
    expect(normaliseInternalLinkMarks(doc)).toBe(0);
  });
});

describe('the ingest -> render pipeline', () => {
  const render = (md: string) => {
    const doc = generateJSON(
      marked.parse(md, { async: false, gfm: true }) as string,
      ingestExtensions as never[],
    );
    normaliseInternalLinkMarks(doc);
    return generateHTML(doc, rendererExtensions as never[]);
  };

  it('does NOT nofollow an internal link written as markdown', () => {
    const html = render(
      'Lihat [harga sewa dewan kahwin](/artikel/venue-perancangan/harga-sewa-dewan-kahwin).',
    );
    const anchor = /<a\b[^>]*>/.exec(html)?.[0] ?? '';
    expect(anchor).toContain('href="/artikel/venue-perancangan/harga-sewa-dewan-kahwin"');
    expect(anchor).not.toMatch(/nofollow/i);
    expect(anchor).not.toMatch(/target="_blank"/i);
  });

  it('still nofollows an external link', () => {
    const html = render('Lihat [TWN](https://theweddingnotebook.com/inspire/x/).');
    const anchor = /<a\b[^>]*>/.exec(html)?.[0] ?? '';
    expect(anchor).toMatch(/nofollow/i);
    expect(anchor).toMatch(/target="_blank"/i);
  });

  it('un-nofollows a legacy row whose mark was stored with nofollow', () => {
    // The WordPress rows: no source file, so only the renderer can reach them.
    const legacy = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Kursus Kahwin',
              marks: [
                {
                  type: 'link',
                  attrs: {
                    href: 'https://hellokahwin.com/kursus-kahwin/',
                    rel: 'noopener noreferrer nofollow',
                    target: '_blank',
                    class: null,
                  },
                },
              ],
            },
          ],
        },
      ],
    };
    const anchor =
      /<a\b[^>]*>/.exec(generateHTML(legacy, rendererExtensions as never[]))?.[0] ?? '';
    expect(anchor).not.toMatch(/nofollow/i);
    expect(anchor).not.toMatch(/target="_blank"/i);
  });
});
