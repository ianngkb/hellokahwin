'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { GripVertical, Plus, Trash2, MousePointerClick, Square, CheckSquare2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  BLOCK_DRAG_TYPE,
  resolveBlockAtCoords,
  resolveDropTarget,
  getTopLevelBlockInfo,
  reorderBlocks,
  buildMoveOrder,
  buildMultiMoveOrder,
} from './block-drag-handle';
import type { EditorInstance } from 'novel';

interface BlockDragHandleViewProps {
  editor: EditorInstance;
  selectedBlocks: Set<number>;
  onSelectedBlocksChange: (blocks: Set<number>) => void;
}

export function BlockDragHandleView({
  editor,
  selectedBlocks,
  onSelectedBlocksChange,
}: BlockDragHandleViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [handleTop, setHandleTop] = useState(0);
  const [handleLeft, setHandleLeft] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dropIndicatorTop, setDropIndicatorTop] = useState<number | null>(null);
  const dragSourceRef = useRef<number | null>(null);

  // F2 fix: Use refs for values needed in event handlers to avoid stale closures
  const hoveredIndexRef = useRef<number | null>(null);
  const selectedBlocksRef = useRef<Set<number>>(selectedBlocks);
  selectedBlocksRef.current = selectedBlocks;
  const isDraggingRef = useRef(false);
  isDraggingRef.current = isDragging;

  const [checkboxPositions, setCheckboxPositions] = useState<{ index: number; top: number }[]>([]);
  const [selectMode, setSelectMode] = useState(false);
  const selectModeRef = useRef(false);
  selectModeRef.current = selectMode;

  const getContainer = useCallback(() => {
    return wrapperRef.current?.parentElement ?? null;
  }, []);

  // Shared helper: compute checkbox positions from block DOM rects (F8 DRY fix)
  const computeCheckboxPositions = useCallback(
    (container: HTMLElement): { index: number; top: number }[] => {
      const containerRect = container.getBoundingClientRect();
      const blocks = getTopLevelBlockInfo(editor.state);
      const positions: { index: number; top: number }[] = [];
      for (const block of blocks) {
        const dom = editor.view.nodeDOM(block.from);
        if (dom instanceof HTMLElement) {
          const blockRect = dom.getBoundingClientRect();
          positions.push({
            index: block.index,
            top: blockRect.top - containerRect.top + container.scrollTop,
          });
        }
      }
      return positions;
    },
    [editor],
  );

  // Update checkbox positions only when values actually changed (F4 perf fix)
  const updateCheckboxPositions = useCallback((positions: { index: number; top: number }[]) => {
    setCheckboxPositions((prev) => {
      if (
        prev.length === positions.length &&
        prev.every((p, i) => p.index === positions[i].index && p.top === positions[i].top)
      ) {
        return prev;
      }
      return positions;
    });
  }, []);

  // F2 fix: Mouse tracking uses isDraggingRef instead of isDragging in deps
  useEffect(() => {
    const container = getContainer();
    if (!container) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (isDraggingRef.current) return;

      const result = resolveBlockAtCoords(editor.view, e.clientX, e.clientY);
      if (!result) {
        setHoveredIndex(null);
        hoveredIndexRef.current = null;
        return;
      }

      hoveredIndexRef.current = result.index;
      setHoveredIndex(result.index);

      // Position handle next to the hovered block's left edge
      const blockDom = editor.view.nodeDOM(result.from);
      if (blockDom && blockDom instanceof HTMLElement && container) {
        const containerRect = container.getBoundingClientRect();
        const blockRect = blockDom.getBoundingClientRect();
        setHandleTop(blockRect.top - containerRect.top + container.scrollTop);
        // Place handle to the left of the block content (28px handle + 6px gap)
        setHandleLeft(Math.max(2, blockRect.left - containerRect.left - 34));
      }
    };

    const handleMouseLeave = () => {
      if (!isDraggingRef.current) {
        setHoveredIndex(null);
        hoveredIndexRef.current = null;
      }
    };

    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', handleMouseLeave);
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      container.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [editor, getContainer]); // F2: removed isDragging from deps

  // Drag over — show drop indicator
  useEffect(() => {
    const container = getContainer();
    if (!container) return;

    const handleDragOver = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes(BLOCK_DRAG_TYPE)) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';

      const targetGap = resolveDropTarget(editor.view, e.clientY);
      const blocks = getTopLevelBlockInfo(editor.state);

      if (blocks.length === 0) {
        setDropIndicatorTop(null);
        return;
      }

      // Calculate Y position for the drop indicator line
      let indicatorY: number;
      const containerRect = container.getBoundingClientRect();

      if (targetGap === 0) {
        const firstDom = editor.view.nodeDOM(blocks[0].from);
        if (firstDom instanceof HTMLElement) {
          indicatorY =
            firstDom.getBoundingClientRect().top - containerRect.top + container.scrollTop;
        } else {
          indicatorY = 0;
        }
      } else if (targetGap >= blocks.length) {
        const lastDom = editor.view.nodeDOM(blocks[blocks.length - 1].from);
        if (lastDom instanceof HTMLElement) {
          const lastRect = lastDom.getBoundingClientRect();
          indicatorY = lastRect.bottom - containerRect.top + container.scrollTop;
        } else {
          indicatorY = container.scrollHeight;
        }
      } else {
        const aboveDom = editor.view.nodeDOM(blocks[targetGap - 1].from);
        const belowDom = editor.view.nodeDOM(blocks[targetGap].from);
        if (aboveDom instanceof HTMLElement && belowDom instanceof HTMLElement) {
          const aboveBottom = aboveDom.getBoundingClientRect().bottom;
          const belowTop = belowDom.getBoundingClientRect().top;
          indicatorY = (aboveBottom + belowTop) / 2 - containerRect.top + container.scrollTop;
        } else {
          indicatorY = 0;
        }
      }

      setDropIndicatorTop(indicatorY);
    };

    const handleDragLeave = (e: DragEvent) => {
      if (!container.contains(e.relatedTarget as Node)) {
        setDropIndicatorTop(null);
      }
    };

    const handleDrop = (e: DragEvent) => {
      if (!e.dataTransfer?.types.includes(BLOCK_DRAG_TYPE)) return;
      e.preventDefault();
      e.stopPropagation();

      const targetGap = resolveDropTarget(editor.view, e.clientY);
      const sourceIndex = dragSourceRef.current;
      const blockCount = editor.state.doc.childCount;

      if (sourceIndex == null || blockCount <= 1) {
        cleanup();
        return;
      }

      const selected = selectedBlocksRef.current;

      let newOrder: number[];
      if (selected.size > 1 && selected.has(sourceIndex)) {
        newOrder = buildMultiMoveOrder(blockCount, Array.from(selected), targetGap);
      } else {
        let toIndex = targetGap;
        if (targetGap > sourceIndex) toIndex = Math.min(targetGap - 1, blockCount - 1);
        if (toIndex === sourceIndex) {
          cleanup();
          return;
        }
        newOrder = buildMoveOrder(blockCount, sourceIndex, toIndex);
      }

      reorderBlocks(editor, newOrder);
      onSelectedBlocksChange(new Set());
      cleanup();
    };

    function cleanup() {
      setIsDragging(false);
      setDropIndicatorTop(null);
      dragSourceRef.current = null;
    }

    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', handleDrop);
    return () => {
      container.removeEventListener('dragover', handleDragOver);
      container.removeEventListener('dragleave', handleDragLeave);
      container.removeEventListener('drop', handleDrop);
    };
  }, [editor, getContainer, onSelectedBlocksChange]);

  // F6 fix: Unified CSS class application — re-applies after editor DOM updates
  useEffect(() => {
    const applyClasses = () => {
      try {
        const blocks = getTopLevelBlockInfo(editor.state);
        // F13 fix: only add select-mode padding when container is available for checkboxes
        const container = getContainer();
        const inSelectMode = selectModeRef.current && !!container;
        for (const block of blocks) {
          const dom = editor.view.nodeDOM(block.from);
          if (!(dom instanceof HTMLElement)) continue;

          dom.classList.toggle(
            'block-hovered',
            block.index === hoveredIndexRef.current && !isDraggingRef.current,
          );
          dom.classList.toggle('block-selected', selectedBlocksRef.current.has(block.index));

          const draggingSource = isDraggingRef.current ? dragSourceRef.current : null;
          const isBeingDragged =
            draggingSource != null &&
            (selectedBlocksRef.current.size > 1 && selectedBlocksRef.current.has(draggingSource)
              ? selectedBlocksRef.current.has(block.index)
              : block.index === draggingSource);
          dom.classList.toggle('block-dragging', isBeingDragged);
          dom.classList.toggle('block-select-mode', inSelectMode);
        }

        // Compute checkbox positions when select mode is active
        if (inSelectMode && container) {
          updateCheckboxPositions(computeCheckboxPositions(container));
        } else {
          setCheckboxPositions([]);
        }
      } catch {
        // Editor may be destroyed during cleanup
      }
    };

    applyClasses();
    editor.on('update', applyClasses);

    return () => {
      editor.off('update', applyClasses);
      try {
        const blocks = getTopLevelBlockInfo(editor.state);
        for (const block of blocks) {
          const dom = editor.view.nodeDOM(block.from);
          if (dom instanceof HTMLElement) {
            dom.classList.remove(
              'block-hovered',
              'block-selected',
              'block-dragging',
              'block-select-mode',
            );
          }
        }
      } catch {
        // Editor may be destroyed
      }
    };
    // F11: selectMode is intentionally in deps (not just via ref) so the initial
    // applyClasses() call fires immediately on toggle, showing checkboxes without
    // waiting for the next editor update event.
  }, [
    editor,
    hoveredIndex,
    selectedBlocks,
    isDragging,
    selectMode,
    getContainer,
    computeCheckboxPositions,
    updateCheckboxPositions,
  ]);

  // Recompute checkbox positions on scroll and container resize (F5 fix)
  useEffect(() => {
    if (!selectMode) return;
    const container = getContainer();
    if (!container) return;

    const recompute = () => {
      updateCheckboxPositions(computeCheckboxPositions(container));
    };

    container.addEventListener('scroll', recompute);
    const resizeObserver = new ResizeObserver(recompute);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener('scroll', recompute);
      resizeObserver.disconnect();
    };
  }, [selectMode, editor, getContainer, computeCheckboxPositions, updateCheckboxPositions]);

  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (selectModeRef.current) {
        e.preventDefault();
        return;
      }
      const idx = hoveredIndexRef.current;
      if (idx == null) return;

      if (selectedBlocks.size > 0 && !selectedBlocks.has(idx)) {
        onSelectedBlocksChange(new Set());
      }

      e.dataTransfer.setData(BLOCK_DRAG_TYPE, String(idx));
      e.dataTransfer.effectAllowed = 'move';
      dragSourceRef.current = idx;
      setIsDragging(true);
    },
    [selectedBlocks, onSelectedBlocksChange],
  );

  const handleDragEnd = useCallback(() => {
    setIsDragging(false);
    setDropIndicatorTop(null);
    dragSourceRef.current = null;
  }, []);

  // F5 fix: Consolidated into two transactions instead of three
  const handlePlusClick = useCallback(() => {
    const idx = hoveredIndexRef.current;
    if (idx == null) return;

    const blocks = getTopLevelBlockInfo(editor.state);
    const block = blocks[idx];
    if (!block) return;

    // Insert paragraph after this block
    editor.chain().focus().insertContentAt(block.to, { type: 'paragraph' }).run();

    // Set cursor inside the new paragraph and type "/" to trigger slash commands
    editor
      .chain()
      .focus()
      .setTextSelection(block.to + 1)
      .insertContent('/')
      .run();
  }, [editor]);

  const handleDeleteClick = useCallback(() => {
    const idx = hoveredIndexRef.current;
    if (idx == null) return;

    // Don't delete the last block — editor needs at least one
    if (editor.state.doc.childCount <= 1) return;

    const blocks = getTopLevelBlockInfo(editor.state);
    const block = blocks[idx];
    if (!block) return;

    editor.chain().focus().deleteRange({ from: block.from, to: block.to }).run();
    onSelectedBlocksChange(new Set());
    setHoveredIndex(null);
    hoveredIndexRef.current = null;
  }, [editor, onSelectedBlocksChange]);

  const blockCount = editor.state.doc.childCount;
  const showHandle = hoveredIndex != null && blockCount > 0;

  return (
    <div ref={wrapperRef} className="pointer-events-none absolute inset-0 z-10">
      {/* Floating handle */}
      {showHandle && (
        <div
          className={cn(
            'pointer-events-auto absolute flex flex-col items-center gap-0.5 transition-opacity duration-150',
            isDragging ? 'opacity-50' : 'opacity-100',
          )}
          style={{ top: handleTop, left: handleLeft }}
        >
          <button
            type="button"
            className={cn(
              'hover:bg-muted flex size-6 items-center justify-center rounded transition-colors',
              selectMode ? 'cursor-default opacity-50' : 'cursor-grab active:cursor-grabbing',
            )}
            draggable={!selectMode}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            title={selectMode ? 'Select mode active — use checkboxes' : 'Drag to reorder'}
          >
            <GripVertical className="text-muted-foreground size-4" />
          </button>
          <button
            type="button"
            className="hover:bg-muted flex size-6 items-center justify-center rounded transition-colors"
            onClick={handlePlusClick}
            title="Add block"
          >
            <Plus className="text-muted-foreground size-4" />
          </button>
          <button
            type="button"
            className={cn(
              'flex size-6 items-center justify-center rounded transition-colors',
              selectMode ? 'bg-primary/20 text-primary' : 'hover:bg-muted text-muted-foreground',
            )}
            onClick={() => {
              setSelectMode((v) => !v);
              if (selectMode) onSelectedBlocksChange(new Set());
            }}
            title={selectMode ? 'Exit select mode' : 'Select blocks to group'}
          >
            <MousePointerClick className="size-3.5" />
          </button>
          {blockCount > 1 && (
            <button
              type="button"
              className="hover:bg-destructive/10 flex size-6 items-center justify-center rounded transition-colors"
              onClick={handleDeleteClick}
              title="Delete block"
            >
              <Trash2 className="text-muted-foreground hover:text-destructive size-3.5" />
            </button>
          )}
        </div>
      )}

      {/* Checkbox overlays for select mode
         left: 6 positions inside the 32px padding from .block-select-mode CSS (globals.css) */}
      {selectMode &&
        checkboxPositions.map((pos) => {
          const isChecked = selectedBlocks.has(pos.index);
          return (
            <button
              key={pos.index}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              className="hover:bg-muted/50 pointer-events-auto absolute flex size-5 items-center justify-center rounded transition-colors"
              style={{ top: pos.top + 4, left: 6 }}
              onClick={() => {
                const next = new Set(selectedBlocks);
                if (next.has(pos.index)) {
                  next.delete(pos.index);
                } else {
                  next.add(pos.index);
                }
                onSelectedBlocksChange(next);
              }}
              title={isChecked ? 'Deselect block' : 'Select block'}
            >
              {isChecked ? (
                <CheckSquare2 className="text-primary size-4" />
              ) : (
                <Square className="text-muted-foreground/50 size-4" />
              )}
            </button>
          );
        })}

      {/* Drop indicator line */}
      {isDragging && dropIndicatorTop != null && (
        <div
          className="bg-primary pointer-events-none absolute right-2 left-8 h-0.5 rounded-full"
          style={{ top: dropIndicatorTop }}
        />
      )}
    </div>
  );
}
