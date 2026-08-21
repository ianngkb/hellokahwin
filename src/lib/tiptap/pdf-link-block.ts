import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { PdfLinkBlockNodeView } from './pdf-link-block-view';

/**
 * A downloadable PDF attachment rendered as a text link or a button.
 * The PDF is uploaded to the article's R2 folder from the node view; the
 * resulting public URL is stored in `data-url`. articleId/slug for the upload
 * are read from `editor.storage.pdfLinkBlock` (set by the editor on create).
 */
export const PdfLinkBlock = Node.create({
  name: 'pdfLinkBlock',
  group: 'block',
  atom: true,
  draggable: true,

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
        default: 'button',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-style') || 'button',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-style': attributes['data-style'],
        }),
      },
      'data-align': {
        default: 'center',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-align') || 'center',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-align': attributes['data-align'],
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="pdf-link-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'pdf-link-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(PdfLinkBlockNodeView);
  },
});
