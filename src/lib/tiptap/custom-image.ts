import { TiptapImage } from 'novel';

export const CustomImage = TiptapImage.extend({
  draggable: true,

  addAttributes() {
    return {
      // `...this.parent?.()` keeps the base Image extension's own attributes.
      // Without it this list REPLACED them, so anything the parent declares
      // (and anything a future Tiptap version adds) was silently dropped from
      // the schema and stripped out of the document on the next transaction.
      ...this.parent?.(),
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      'data-original-src': { default: null },
      'data-quality': { default: null },
      'data-variants': { default: null },
      // Declared because the public renderer READS them
      // (`article-renderer.tsx` → `<figcaption>`): an attribute ProseMirror
      // does not know about is discarded, so a caption picked from the media
      // library could never survive as far as the saved document.
      'data-caption': { default: null },
      'data-caption-url': { default: null },
    };
  },
});
