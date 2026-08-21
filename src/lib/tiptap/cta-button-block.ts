import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { CtaButtonBlockNodeView } from './cta-button-block-view';

export const CtaButtonBlock = Node.create({
  name: 'ctaButtonBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      'data-text': {
        default: 'Learn More',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-text') || 'Learn More',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-text': attributes['data-text'],
        }),
      },
      'data-url': {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-url') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-url': attributes['data-url'],
        }),
      },
      'data-new-tab': {
        default: 'false',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-new-tab') || 'false',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-new-tab': attributes['data-new-tab'],
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
    return [{ tag: 'div[data-type="cta-button-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'cta-button-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(CtaButtonBlockNodeView);
  },
});
