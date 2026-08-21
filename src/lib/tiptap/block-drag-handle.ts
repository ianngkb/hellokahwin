import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import type { EditorState } from '@tiptap/pm/state';
import type { EditorView } from '@tiptap/pm/view';
import { Fragment } from '@tiptap/pm/model';

export const blockDragHandlePluginKey = new PluginKey('blockDragHandle');
export const BLOCK_DRAG_TYPE = 'application/x-block-drag';

export interface BlockInfo {
  index: number;
  type: string;
  textPreview: string;
  from: number;
  to: number;
}

export interface BlockTreeNode extends BlockInfo {
  children?: BlockTreeNode[];
}

/**
 * Get info about all top-level blocks in the document.
 * Used by the outline panel and drag-drop logic.
 */
export function getTopLevelBlockInfo(state: EditorState): BlockInfo[] {
  const blocks: BlockInfo[] = [];

  state.doc.forEach((node, offset, index) => {
    let textPreview = '';

    switch (node.type.name) {
      case 'horizontalRule':
        textPreview = 'Divider';
        break;
      case 'galleryBlock':
        try {
          const images = JSON.parse(node.attrs['data-images'] || '[]');
          textPreview = `Gallery: ${images.length} image${images.length !== 1 ? 's' : ''}`;
        } catch {
          textPreview = 'Gallery';
        }
        break;
      case 'image':
        textPreview = node.attrs.alt || 'Image';
        break;
      case 'sectionBlock':
        textPreview = node.attrs['data-title'] || 'Untitled Section';
        break;
      case 'figureBlock':
        textPreview = node.attrs.alt || 'Image with Caption';
        break;
      default: {
        const text = node.textContent;
        textPreview = text.length > 50 ? text.slice(0, 50) + '\u2026' : text;
      }
    }

    blocks.push({
      index,
      type: node.type.name,
      textPreview: textPreview || '(empty)',
      from: offset,
      to: offset + node.nodeSize,
    });
  });

  return blocks;
}

/**
 * Get a hierarchical tree of blocks — sections contain children.
 * Used only by the outline panel for nested display.
 */
export function getBlockTree(state: EditorState): BlockTreeNode[] {
  const tree: BlockTreeNode[] = [];

  function buildChildren(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parent: any,
    parentOffset: number,
  ): BlockTreeNode[] {
    const children: BlockTreeNode[] = [];
    let childIndex = 0;

    parent.forEach((child: typeof parent, offset: number) => {
      const childFrom = parentOffset + offset + 1; // +1 for the parent opening tag
      let textPreview = '';

      switch (child.type.name) {
        case 'sectionBlock':
          textPreview = child.attrs['data-title'] || 'Untitled Section';
          children.push({
            index: childIndex,
            type: child.type.name,
            textPreview,
            from: childFrom,
            to: childFrom + child.nodeSize,
            children: buildChildren(child, childFrom),
          });
          childIndex++;
          return;
        case 'figureBlock':
          textPreview = child.attrs.alt || 'Image with Caption';
          break;
        case 'horizontalRule':
          textPreview = 'Divider';
          break;
        case 'galleryBlock':
          try {
            const images = JSON.parse(child.attrs['data-images'] || '[]');
            textPreview = `Gallery: ${images.length} image${images.length !== 1 ? 's' : ''}`;
          } catch {
            textPreview = 'Gallery';
          }
          break;
        case 'image':
          textPreview = child.attrs.alt || 'Image';
          break;
        default: {
          const text = child.textContent;
          textPreview = text.length > 50 ? text.slice(0, 50) + '\u2026' : text;
        }
      }

      children.push({
        index: childIndex,
        type: child.type.name,
        textPreview: textPreview || '(empty)',
        from: childFrom,
        to: childFrom + child.nodeSize,
      });
      childIndex++;
    });

    return children;
  }

  state.doc.forEach((node, offset, index) => {
    let textPreview = '';

    switch (node.type.name) {
      case 'sectionBlock':
        textPreview = node.attrs['data-title'] || 'Untitled Section';
        tree.push({
          index,
          type: node.type.name,
          textPreview,
          from: offset,
          to: offset + node.nodeSize,
          children: buildChildren(node, offset),
        });
        return;
      case 'figureBlock':
        textPreview = node.attrs.alt || 'Image with Caption';
        break;
      case 'horizontalRule':
        textPreview = 'Divider';
        break;
      case 'galleryBlock':
        try {
          const images = JSON.parse(node.attrs['data-images'] || '[]');
          textPreview = `Gallery: ${images.length} image${images.length !== 1 ? 's' : ''}`;
        } catch {
          textPreview = 'Gallery';
        }
        break;
      case 'image':
        textPreview = node.attrs.alt || 'Image';
        break;
      default: {
        const text = node.textContent;
        textPreview = text.length > 50 ? text.slice(0, 50) + '\u2026' : text;
      }
    }

    tree.push({
      index,
      type: node.type.name,
      textPreview: textPreview || '(empty)',
      from: offset,
      to: offset + node.nodeSize,
    });
  });

  return tree;
}

/**
 * Count total blocks including nested children.
 */
export function countAllBlocks(tree: BlockTreeNode[]): number {
  let count = 0;
  for (const node of tree) {
    count++;
    if (node.children) count += countAllBlocks(node.children);
  }
  return count;
}

/**
 * Resolve which top-level block is at the given client coordinates.
 * Returns null if no block is found (e.g. mouse is outside the editor).
 */
export function resolveBlockAtCoords(
  view: EditorView,
  clientX: number,
  clientY: number,
): { index: number; from: number; to: number } | null {
  const posResult = view.posAtCoords({ left: clientX, top: clientY });
  if (!posResult) return null;

  try {
    const resolved = view.state.doc.resolve(posResult.pos);
    if (resolved.depth === 0) {
      // At doc level — find nearest block by index
      const index = resolved.index(0);
      if (index >= view.state.doc.childCount) return null;
      const blocks = getTopLevelBlockInfo(view.state);
      return blocks[index] ?? null;
    }

    // Walk up to depth 1 (top-level block)
    const from = resolved.before(1);
    const to = resolved.after(1);
    const index = resolved.index(0);

    return { index, from, to };
  } catch {
    return null;
  }
}

/**
 * Determine the drop target gap index from mouse Y position.
 * Returns the index where the block should be inserted (0 = before first block, N = after last block).
 */
export function resolveDropTarget(view: EditorView, clientY: number): number {
  const blocks = getTopLevelBlockInfo(view.state);
  if (blocks.length === 0) return 0;

  for (let i = 0; i < blocks.length; i++) {
    const dom = view.nodeDOM(blocks[i].from);
    if (!dom || !(dom instanceof HTMLElement)) continue;

    const rect = dom.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    if (clientY < midY) return i;
  }

  return blocks.length;
}

/**
 * Reorder blocks according to a new index order.
 * Used by both editor drag-drop and outline panel dnd-kit.
 */
export function reorderBlocks(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  editor: any,
  newOrder: number[],
): boolean {
  const { state } = editor;
  const doc = state.doc;

  if (newOrder.length !== doc.childCount) return false;

  // Collect nodes in new order
  const nodes = newOrder.map((i) => doc.child(i));
  const newContent = Fragment.from(nodes);

  // Replace the entire document content
  const tr = state.tr;
  tr.replaceWith(0, doc.content.size, newContent);

  editor.view.dispatch(tr);
  return true;
}

/**
 * Build a new index order array for moving a single block.
 */
export function buildMoveOrder(blockCount: number, fromIndex: number, toIndex: number): number[] {
  const order = Array.from({ length: blockCount }, (_, i) => i);
  const [removed] = order.splice(fromIndex, 1);
  order.splice(toIndex, 0, removed);
  return order;
}

/**
 * Build a new index order array for moving multiple blocks as a group.
 * Selected blocks are removed from their positions and inserted contiguously at targetGap.
 * targetGap is the gap index (0 = before first, N = after last) in the ORIGINAL array.
 */
export function buildMultiMoveOrder(
  blockCount: number,
  selectedIndices: number[],
  targetGap: number,
): number[] {
  const selected = [...selectedIndices].sort((a, b) => a - b);
  const remaining = Array.from({ length: blockCount }, (_, i) => i).filter(
    (i) => !selected.includes(i),
  );

  // Calculate insertion index in the remaining array
  // Count how many non-selected items are before the target gap
  let insertAt = 0;
  for (const idx of remaining) {
    if (idx < targetGap) insertAt++;
    else break;
  }

  remaining.splice(insertAt, 0, ...selected);
  return remaining;
}

/**
 * Tiptap extension — registers the block drag handle system.
 * The actual UI is handled by the BlockDragHandleView React component.
 */
export const BlockDragHandle = Extension.create({
  name: 'blockDragHandle',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: blockDragHandlePluginKey,
      }),
    ];
  },
});
