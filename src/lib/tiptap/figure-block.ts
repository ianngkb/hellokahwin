import { ReactNodeViewRenderer } from '@tiptap/react';
import { FigureBlockNodeView } from './figure-block-view';
import { FigureBlockSchema } from './figure-block-schema';

export const FigureBlock = FigureBlockSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(FigureBlockNodeView);
  },
});
