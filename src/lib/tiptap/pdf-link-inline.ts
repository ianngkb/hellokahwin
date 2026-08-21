import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PdfLinkInlineNodeView } from './pdf-link-inline-view';

/**
 * Inline variant of the PDF attachment — flows within paragraph text. Shares
 * attrs (minus alignment) and upload storage with `pdfLinkBlock`; the author
 * switches between the two via the Placement toggle in the edit panel.
 */
export const PdfLinkInline = Node.create({
  name: 'pdfLinkInline',
  group: 'inline',
  inline: true,
  atom: true,

  addStorage() {
    return {
      articleId: null as string | null,
      articleSlug: null as string | null,
    };
  },

  addAttributes() {
    return {
      'data-url': {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-url') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-url': attributes['data-url'],
        }),
      },
      'data-text': {
        default: 'Download PDF',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-text') || 'Download PDF',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-text': attributes['data-text'],
        }),
      },
      'data-file-size': {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-file-size') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-file-size': attributes['data-file-size'],
        }),
      },
      'data-style': {
        // 'link' (inline text link) | 'button'
        default: 'link',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-style') || 'link',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-style': attributes['data-style'],
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="pdf-link-inline"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { 'data-type': 'pdf-link-inline' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfLinkInlineNodeView);
  },
});
