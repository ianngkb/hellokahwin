import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { SectionBlockNodeView } from './section-block-view';

export const SectionBlock = Node.create({
  name: 'sectionBlock',
  group: 'block',
  content: 'block+',
  draggable: true,
  defining: true,

  addAttributes() {
    return {
      'data-title': {
        default: 'Untitled Section',
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-title') || 'Untitled Section',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-title': attributes['data-title'],
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="section-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'section-block' }), 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(SectionBlockNodeView);
  },
});
