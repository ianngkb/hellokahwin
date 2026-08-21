import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { GalleryBlockNodeView } from './gallery-block-view';

export interface GalleryImage {
  mediaId: string;
  src: string;
  alt: string;
  caption: string;
  captionUrl: string;
  variants: unknown;
  quality: string;
  width?: number;
  height?: number;
}

export const GalleryBlock = Node.create({
  name: 'galleryBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      'data-images': {
        default: '[]',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-images') || '[]',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-images': attributes['data-images'],
        }),
      },
      'data-layout': {
        default: 'grid-2',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-layout') || 'grid-2',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-layout': attributes['data-layout'],
        }),
      },
      'data-gap': {
        default: 8,
        parseHTML: (element: HTMLElement) => {
          const val = parseInt(element.getAttribute('data-gap') || '8', 10);
          return Number.isFinite(val) ? Math.max(0, Math.min(val, 64)) : 8;
        },
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-gap': String(attributes['data-gap']),
        }),
      },
      'data-show-captions': {
        default: true,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-show-captions') !== 'false',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-show-captions': String(attributes['data-show-captions']),
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="gallery-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'gallery-block' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(GalleryBlockNodeView);
  },
});
