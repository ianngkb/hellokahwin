import { TiptapImage } from 'novel';

export const CustomImage = TiptapImage.extend({
  draggable: true,

  addAttributes() {
    return {
      src: { default: null },
      alt: { default: null },
      title: { default: null },
      'data-original-src': { default: null },
      'data-quality': { default: null },
      'data-variants': { default: null },
    };
  },
});
