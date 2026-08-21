import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DynamicBlockEmbedNodeView } from './dynamic-block-embed-view';

// Live reference to a dynamic block (dynamic_blocks row). The node stores only
// the block id — content is resolved server-side at render time by
// mergeDynamicBlocks (src/lib/inspire/dynamic-blocks.ts), so editing a block
// updates every article embedding it. A manual embed also suppresses that
// block's automatic START/END injection for the article.
export interface DynamicBlockEmbedOptions {
  /**
   * Ids of currently published + active blocks, provided at editor creation
   * via `DynamicBlockEmbed.configure({ publishedBlockIds })` so NodeViews can
   * flag missing/unpublished references from first mount. Null = unknown
   * (don't flag anything).
   */
  publishedBlockIds: string[] | null;
}

export const DynamicBlockEmbed = Node.create<DynamicBlockEmbedOptions>({
  name: 'dynamicBlockEmbed',
  group: 'block',
  atom: true,
  draggable: true,

  addOptions() {
    return { publishedBlockIds: null };
  },

  addAttributes() {
    return {
      blockId: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-block-id') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-block-id': attributes.blockId,
        }),
      },
      blockName: {
        default: '',
        parseHTML: (element: HTMLElement) => element.getAttribute('data-block-name') || '',
        renderHTML: (attributes: Record<string, unknown>) => ({
          'data-block-name': attributes.blockName,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="dynamic-block-embed"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes, { 'data-type': 'dynamic-block-embed' })];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DynamicBlockEmbedNodeView);
  },
});
