import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureBlockNodeView } from './figure-block-view';

export const FigureBlock = Node.create({
  name: 'figureBlock',
  group: 'block',
  content: 'inline*',
  draggable: true,

  addStorage() {
    return {
      articleId: '' as string,
      articleSlug: '' as string,
    };
  },

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      'data-original-src': { default: null },
      'data-quality': { default: null },
      'data-variants': { default: null },
      'data-caption': { default: null },
      'data-caption-url': { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="figure-block"]' }];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-type': 'figure-block' }),
      ['img', { src: node.attrs.src, alt: node.attrs.alt }],
      ['figcaption', 0],
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(FigureBlockNodeView);
  },
});
