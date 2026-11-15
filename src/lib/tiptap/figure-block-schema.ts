/**
 * Schema-only definition of `FigureBlock` (no React node view), so code that
 * must not import the editor's client components — unit tests, server-side
 * HTML ⇄ Tiptap conversion — can build the same schema. The editor's
 * `FigureBlock` (./figure-block.ts) extends this with its node view; keep
 * attributes and parse rules HERE so both stay identical.
 */
import { Node, mergeAttributes } from '@tiptap/core';

export const FigureBlockSchema = Node.create({
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
});
