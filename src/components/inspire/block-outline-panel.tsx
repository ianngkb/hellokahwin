'use client';

import { useCallback, useEffect, useState } from 'react';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Pilcrow,
  Heading2,
  Heading3,
  Image,
  LayoutGrid,
  List,
  ListOrdered,
  Quote,
  Minus,
  ChevronDown,
  X,
  FolderOpen,
  FolderClosed,
  Frame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { getBlockTree, countAllBlocks, reorderBlocks } from '@/lib/tiptap/block-drag-handle';
import type { BlockTreeNode } from '@/lib/tiptap/block-drag-handle';
import type { EditorInstance } from 'novel';

const BLOCK_TYPE_ICON: Record<string, React.ReactNode> = {
  paragraph: <Pilcrow className="size-3.5 shrink-0" />,
  heading: <Heading2 className="size-3.5 shrink-0" />,
  image: <Image className="size-3.5 shrink-0" />,
  galleryBlock: <LayoutGrid className="size-3.5 shrink-0" />,
  bulletList: <List className="size-3.5 shrink-0" />,
  orderedList: <ListOrdered className="size-3.5 shrink-0" />,
  blockquote: <Quote className="size-3.5 shrink-0" />,
  horizontalRule: <Minus className="size-3.5 shrink-0" />,
  figureBlock: <Frame className="size-3.5 shrink-0" />,
};

function getBlockIcon(block: BlockTreeNode, sectionOpen?: boolean): React.ReactNode {
  if (block.type === 'sectionBlock') {
    return sectionOpen ? (
      <FolderOpen className="size-3.5 shrink-0" />
    ) : (
      <FolderClosed className="size-3.5 shrink-0" />
    );
  }
  if (block.type === 'heading') {
    return BLOCK_TYPE_ICON.heading;
  }
  return BLOCK_TYPE_ICON[block.type] ?? <Pilcrow className="size-3.5 shrink-0" />;
}

function getBlockLabel(block: BlockTreeNode): string {
  if (block.type === 'horizontalRule') return 'Divider';
  if (block.type === 'image') return block.textPreview || 'Image';
  if (block.type === 'galleryBlock') return block.textPreview || 'Gallery';
  if (block.type === 'sectionBlock') return block.textPreview || 'Untitled Section';
  if (block.type === 'figureBlock') return `Image: ${block.textPreview}`;
  if (!block.textPreview || block.textPreview === '(empty)') {
    const typeNames: Record<string, string> = {
      paragraph: 'Empty paragraph',
      heading: 'Empty heading',
      bulletList: 'Bullet list',
      orderedList: 'Numbered list',
      blockquote: 'Blockquote',
    };
    return typeNames[block.type] ?? block.type;
  }
  return block.textPreview.slice(0, 40) + (block.textPreview.length > 40 ? '\u2026' : '');
}

function SortableBlockItem({
  block,
  isSelected,
  onClick,
  onDelete,
}: {
  block: BlockTreeNode;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(block.from),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm transition-colors',
        isSelected && 'bg-primary/10',
      )}
      onClick={onClick}
    >
      <button
        type="button"
        className="shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="text-muted-foreground size-3" />
      </button>
      {getBlockIcon(block)}
      <span className="text-muted-foreground flex-1 truncate text-xs">{getBlockLabel(block)}</span>
      <button
        type="button"
        className="hover:bg-destructive/10 hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onDelete();
        }}
        title="Delete block"
      >
        <X className="size-3" />
      </button>
    </div>
  );
}

function SortableSectionItem({
  block,
  isOpen,
  isSelected,
  onClick,
  onDelete,
  onToggle,
  children,
}: {
  block: BlockTreeNode;
  isOpen: boolean;
  isSelected: boolean;
  onClick: (e: React.MouseEvent) => void;
  onDelete: () => void;
  onToggle: () => void;
  children?: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: String(block.from),
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <div
        className={cn(
          'group hover:bg-muted flex cursor-pointer items-center gap-1.5 rounded px-1.5 py-1 text-sm transition-colors',
          isSelected && 'bg-primary/10',
        )}
        onClick={onClick}
      >
        <button
          type="button"
          className="shrink-0 cursor-grab opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="text-muted-foreground size-3" />
        </button>
        <button
          type="button"
          className="hover:bg-muted-foreground/10 shrink-0 rounded p-0.5 transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <ChevronDown
            className={cn(
              'text-muted-foreground size-3 transition-transform',
              !isOpen && '-rotate-90',
            )}
          />
        </button>
        {getBlockIcon(block, isOpen)}
        <span className="text-muted-foreground flex-1 truncate text-xs font-medium">
          {getBlockLabel(block)}
        </span>
        <button
          type="button"
          className="hover:bg-destructive/10 hover:text-destructive shrink-0 rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Unwrap section"
        >
          <X className="size-3" />
        </button>
      </div>
      {children}
    </div>
  );
}

function BlockTreeItem({
  block,
  editor,
  selectedBlocks,
  onBlockClick,
  onDeleteBlock,
  openSections,
  onToggleSection,
}: {
  block: BlockTreeNode;
  editor: EditorInstance;
  selectedBlocks: Set<number>;
  onBlockClick: (block: BlockTreeNode, e: React.MouseEvent) => void;
  onDeleteBlock: (block: BlockTreeNode) => void;
  openSections: Set<number>;
  onToggleSection: (from: number) => void;
}) {
  if (block.type === 'sectionBlock' && block.children) {
    const isOpen = openSections.has(block.from);

    return (
      <SortableSectionItem
        block={block}
        isOpen={isOpen}
        isSelected={selectedBlocks.has(block.index)}
        onClick={(e) => onBlockClick(block, e)}
        onDelete={() => onDeleteBlock(block)}
        onToggle={() => onToggleSection(block.from)}
      >
        {isOpen && block.children.length > 0 && (
          <div className="space-y-0.5 pl-4">
            {block.children.map((child) => (
              <BlockTreeItem
                key={child.from}
                block={child}
                editor={editor}
                selectedBlocks={selectedBlocks}
                onBlockClick={onBlockClick}
                onDeleteBlock={onDeleteBlock}
                openSections={openSections}
                onToggleSection={onToggleSection}
              />
            ))}
          </div>
        )}
      </SortableSectionItem>
    );
  }

  return (
    <SortableBlockItem
      block={block}
      isSelected={selectedBlocks.has(block.index)}
      onClick={(e) => onBlockClick(block, e)}
      onDelete={() => onDeleteBlock(block)}
    />
  );
}

interface BlockOutlinePanelProps {
  editor: EditorInstance;
  selectedBlocks: Set<number>;
  onSelectedBlocksChange: (blocks: Set<number>) => void;
}

export function BlockOutlinePanel({
  editor,
  selectedBlocks,
  onSelectedBlocksChange,
}: BlockOutlinePanelProps) {
  const [blocks, setBlocks] = useState<BlockTreeNode[]>([]);
  const [isOpen, setIsOpen] = useState(true);
  const [openSections, setOpenSections] = useState<Set<number>>(new Set());

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  // Update block list when editor content changes
  useEffect(() => {
    const updateBlocks = () => {
      const tree = getBlockTree(editor.state);
      setBlocks(tree);
      // Auto-open all sections on first load
      const sectionFroms = new Set<number>();
      function collectSections(nodes: BlockTreeNode[]) {
        for (const n of nodes) {
          if (n.type === 'sectionBlock') {
            sectionFroms.add(n.from);
            if (n.children) collectSections(n.children);
          }
        }
      }
      collectSections(tree);
      setOpenSections((prev) => {
        const next = new Set(prev);
        for (const f of sectionFroms) next.add(f);
        return next;
      });
    };

    updateBlocks();
    editor.on('update', updateBlocks);
    return () => {
      editor.off('update', updateBlocks);
    };
  }, [editor]);

  const handleToggleSection = useCallback((from: number) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(from)) {
        next.delete(from);
      } else {
        next.add(from);
      }
      return next;
    });
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      // Only reorder top-level blocks
      const oldIndex = blocks.findIndex((b) => String(b.from) === active.id);
      const newIndex = blocks.findIndex((b) => String(b.from) === over.id);

      if (oldIndex === -1 || newIndex === -1) return;

      const currentOrder = blocks.map((b) => b.index);
      const reordered = arrayMove(currentOrder, oldIndex, newIndex);

      reorderBlocks(editor, reordered);
      onSelectedBlocksChange(new Set());
      editor.commands.focus();
    },
    [editor, blocks, onSelectedBlocksChange],
  );

  const handleBlockClick = useCallback(
    (block: BlockTreeNode, e: React.MouseEvent) => {
      if (e.shiftKey) {
        const next = new Set(selectedBlocks);
        if (next.has(block.index)) {
          next.delete(block.index);
        } else {
          next.add(block.index);
        }
        onSelectedBlocksChange(next);
        return;
      }

      onSelectedBlocksChange(new Set());
      editor
        .chain()
        .focus()
        .setTextSelection(block.from + 1)
        .run();
      const dom = editor.view.nodeDOM(block.from);
      if (dom instanceof HTMLElement) {
        dom.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    },
    [editor, selectedBlocks, onSelectedBlocksChange],
  );

  const handleDeleteBlock = useCallback(
    (block: BlockTreeNode) => {
      if (block.type === 'sectionBlock' && block.children && block.children.length > 0) {
        // Unwrap section: replace the section node with its children
        const { state } = editor;
        const $from = state.doc.resolve(block.from);
        const node = $from.nodeAfter;
        if (!node) return;

        const children: unknown[] = [];
        node.forEach((child) => children.push(child.toJSON()));

        editor.chain().focus().deleteRange({ from: block.from, to: block.to }).run();
        // Insert children at the section's former position
        if (children.length > 0) {
          editor.chain().focus().insertContentAt(block.from, children).run();
        }
        onSelectedBlocksChange(new Set());
        return;
      }

      // Don't delete the last block
      if (editor.state.doc.childCount <= 1) return;
      editor.chain().focus().deleteRange({ from: block.from, to: block.to }).run();
      onSelectedBlocksChange(new Set());
    },
    [editor, onSelectedBlocksChange],
  );

  const totalCount = countAllBlocks(blocks);

  if (blocks.length === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center gap-2 text-sm font-semibold"
      >
        <ChevronDown className={cn('size-4 transition-transform', !isOpen && '-rotate-90')} />
        Block Outline
        <span className="text-muted-foreground ml-auto text-xs font-normal">{totalCount}</span>
      </button>

      {isOpen && (
        <div className="max-h-60 space-y-0.5 overflow-y-auto">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={blocks.map((b) => String(b.from))}
              strategy={verticalListSortingStrategy}
            >
              {blocks.map((block) => (
                <BlockTreeItem
                  key={block.from}
                  block={block}
                  editor={editor}
                  selectedBlocks={selectedBlocks}
                  onBlockClick={handleBlockClick}
                  onDeleteBlock={handleDeleteBlock}
                  openSections={openSections}
                  onToggleSection={handleToggleSection}
                />
              ))}
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
