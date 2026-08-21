'use client';

import { useCallback, useMemo, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import Image from 'next/image';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Columns2,
  Columns3,
  Grid2X2,
  LayoutGrid,
  X,
  Plus,
  ImagePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaPickerDialog } from '@/components/media/media-picker-dialog';
import type { PickedMedia } from '@/lib/media/picked-media';
import type { GalleryImage } from './gallery-block';

type Layout = 'grid-1' | 'grid-2' | 'grid-3' | 'masonry';

function SortableImage({
  image,
  index,
  showCaption,
  onRemove,
}: {
  image: GalleryImage;
  index: number;
  showCaption: boolean;
  onRemove: (index: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.mediaId || `img-${index}`,
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
      className="group bg-muted relative overflow-hidden rounded-md"
    >
      <Image
        src={image.src}
        alt={image.alt || ''}
        width={image.width || 800}
        height={image.height || 800}
        sizes="(max-width: 768px) 50vw, 33vw"
        className="h-auto w-full"
      />

      {/* Drag handle — stopPropagation prevents block-level drag from activating */}
      <button
        type="button"
        className="absolute top-1 left-1 flex size-6 cursor-grab items-center justify-center rounded bg-black/50 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
        {...attributes}
        {...listeners}
        onPointerDown={(e) => {
          e.stopPropagation();
          // Call the original listener if dnd-kit attached one
          listeners?.onPointerDown?.(e);
        }}
      >
        <GripVertical className="size-3.5 text-white" />
      </button>

      {/* Remove button */}
      <button
        type="button"
        className="hover:bg-destructive/80 absolute top-1 right-1 flex size-6 items-center justify-center rounded bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(index);
        }}
      >
        <X className="size-3.5 text-white" />
      </button>

      {/* Caption */}
      {showCaption && image.caption && (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-2 pt-4 pb-1.5">
          <p className="truncate text-[10px] text-white/90">{image.caption}</p>
        </div>
      )}
    </div>
  );
}

export function GalleryBlockNodeView({ node, updateAttributes, selected }: NodeViewProps) {
  const [showToolbar, setShowToolbar] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const images: GalleryImage[] = useMemo(() => {
    try {
      return JSON.parse(node.attrs['data-images'] || '[]');
    } catch (err) {
      console.warn('Failed to parse gallery block images:', err);
      return [];
    }
  }, [node.attrs['data-images']]);

  const layout = (node.attrs['data-layout'] || 'grid-2') as Layout;
  const rawGap = Number(node.attrs['data-gap'] || 8);
  const gap = Number.isFinite(rawGap) ? Math.max(0, Math.min(rawGap, 64)) : 8;
  const showCaptions =
    node.attrs['data-show-captions'] !== false && node.attrs['data-show-captions'] !== 'false';

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 5 },
    }),
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      if (!over || active.id === over.id) return;

      const oldIndex = images.findIndex(
        (img) => (img.mediaId || `img-${images.indexOf(img)}`) === active.id,
      );
      const newIndex = images.findIndex(
        (img) => (img.mediaId || `img-${images.indexOf(img)}`) === over.id,
      );

      if (oldIndex === -1 || newIndex === -1) return;

      const reordered = arrayMove(images, oldIndex, newIndex);
      updateAttributes({ 'data-images': JSON.stringify(reordered) });
    },
    [images, updateAttributes],
  );

  const handleRemoveImage = useCallback(
    (index: number) => {
      const updated = images.filter((_, i) => i !== index);
      updateAttributes({ 'data-images': JSON.stringify(updated) });
    },
    [images, updateAttributes],
  );

  const handleLayoutChange = useCallback(
    (newLayout: Layout) => {
      updateAttributes({ 'data-layout': newLayout });
    },
    [updateAttributes],
  );

  const handleAddImages = useCallback(
    (selected: PickedMedia[]) => {
      const newImages: GalleryImage[] = selected.map((m) => ({
        mediaId: m.id,
        src: m.url,
        alt: m.alt ?? '',
        caption: m.caption ?? '',
        captionUrl: m.captionUrl ?? '',
        variants: m.variants,
        quality: (m.defaultQuality as string) ?? 'high',
        width: m.width || undefined,
        height: m.height || undefined,
      }));
      const merged = [...images, ...newImages];
      updateAttributes({ 'data-images': JSON.stringify(merged) });
    },
    [images, updateAttributes],
  );

  const gridCols = {
    'grid-1': '',
    'grid-2': '',
    'grid-3': '',
    masonry: 'columns-2 sm:columns-3',
  };

  if (images.length === 0) {
    return (
      <NodeViewWrapper>
        <div className="flex flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 text-center">
          <ImagePlus className="text-muted-foreground/60 size-8" />
          <p className="text-muted-foreground text-sm">Empty gallery block</p>
          <button
            type="button"
            className="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
            onClick={() => setPickerOpen(true)}
          >
            <Plus className="size-3.5" />
            Add images
          </button>
        </div>
        <MediaPickerDialog
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          onSelect={handleAddImages}
          multiple
        />
      </NodeViewWrapper>
    );
  }

  const isMasonry = layout === 'masonry';

  return (
    <NodeViewWrapper>
      <div
        className={cn('relative my-4 rounded-md', selected && 'ring-primary ring-2 ring-offset-2')}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
      >
        {/* Toolbar overlay */}
        {(showToolbar || selected) && (
          <div className="bg-background absolute -top-9 left-0 z-10 flex items-center gap-1 rounded-md border p-1 shadow-sm">
            <button
              type="button"
              className={cn(
                'flex size-7 items-center justify-center rounded text-xs',
                layout === 'grid-1' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => handleLayoutChange('grid-1')}
              title="1 column"
            >
              1
            </button>
            <button
              type="button"
              className={cn(
                'flex size-7 items-center justify-center rounded',
                layout === 'grid-2' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => handleLayoutChange('grid-2')}
              title="2 columns"
            >
              <Columns2 className="size-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                'flex size-7 items-center justify-center rounded',
                layout === 'grid-3' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => handleLayoutChange('grid-3')}
              title="3 columns"
            >
              <Columns3 className="size-3.5" />
            </button>
            <button
              type="button"
              className={cn(
                'flex size-7 items-center justify-center rounded',
                layout === 'masonry' && 'bg-primary text-primary-foreground',
              )}
              onClick={() => handleLayoutChange('masonry')}
              title="Masonry"
            >
              <LayoutGrid className="size-3.5" />
            </button>
            <div className="bg-border mx-0.5 h-5 w-px" />
            <button
              type="button"
              className="hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
              onClick={() => setPickerOpen(true)}
              title="Add images"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        )}

        {/* Gallery grid */}
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext
            items={images.map((img, i) => img.mediaId || `img-${i}`)}
            strategy={rectSortingStrategy}
          >
            {isMasonry ? (
              <div className={gridCols[layout]} style={{ gap: `${gap}px` }}>
                {images.map((image, index) => (
                  <div key={image.mediaId || `img-${index}`} className="mb-2 break-inside-avoid">
                    <SortableImage
                      image={image}
                      index={index}
                      showCaption={showCaptions}
                      onRemove={handleRemoveImage}
                    />
                  </div>
                ))}
              </div>
            ) : layout === 'grid-1' ? (
              <div className="flex flex-col" style={{ gap: `${gap}px` }}>
                {images.map((image, index) => (
                  <div key={image.mediaId || `img-${index}`}>
                    <SortableImage
                      image={image}
                      index={index}
                      showCaption={showCaptions}
                      onRemove={handleRemoveImage}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col" style={{ gap: `${gap}px` }}>
                {(() => {
                  const cols = layout === 'grid-3' ? 3 : 2;
                  return Array.from({ length: Math.ceil(images.length / cols) }, (_, rowIdx) => {
                    const rowImages = images.slice(rowIdx * cols, rowIdx * cols + cols);
                    return (
                      <div key={`row-${rowIdx}`} className="flex" style={{ gap: `${gap}px` }}>
                        {rowImages.map((image, colIdx) => {
                          const index = rowIdx * cols + colIdx;
                          const aspectRatio =
                            image.width && image.height ? image.width / image.height : 1;
                          return (
                            <div
                              key={image.mediaId || `img-${index}`}
                              style={{ flex: `${aspectRatio} 1 0%` }}
                            >
                              <SortableImage
                                image={image}
                                index={index}
                                showCaption={showCaptions}
                                onRemove={handleRemoveImage}
                              />
                            </div>
                          );
                        })}
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </SortableContext>
        </DndContext>
      </div>
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleAddImages}
        multiple
      />
    </NodeViewWrapper>
  );
}
