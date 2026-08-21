'use client';

import { useCallback, useState } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import Image from 'next/image';
import { ImagePlus, Replace, RemoveFormatting } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MediaPickerDialog } from '@/components/media/media-picker-dialog';
import type { PickedMedia } from '@/lib/media/picked-media';
import { uploadInspireImage } from '@/lib/storage/inspire-upload';
import { trackFiles, markCompleted, markFailed } from '@/lib/storage/upload-progress';
import { toast } from 'sonner';

export function FigureBlockNodeView({
  node,
  updateAttributes,
  selected,
  editor,
  getPos,
}: NodeViewProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const [uploading, setUploading] = useState(false);

  const src = node.attrs.src as string | null;
  const alt = (node.attrs.alt as string) || '';
  const caption = (node.attrs['data-caption'] as string) || '';
  const rawCaptionUrl = (node.attrs['data-caption-url'] as string) || '';
  const captionUrl = /^https?:\/\//i.test(rawCaptionUrl) ? rawCaptionUrl : '';

  const handleMediaSelect = useCallback(
    (items: PickedMedia[]) => {
      if (items.length === 0) return;
      const m = items[0];
      updateAttributes({
        src: m.url,
        alt: m.alt ?? '',
        'data-original-src': m.url,
        'data-quality': (m.defaultQuality as string) ?? 'high',
        'data-variants': m.variants ? JSON.stringify(m.variants) : null,
      });
    },
    [updateAttributes],
  );

  const handleFileDrop = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) return;
      if (file.size > 10 * 1024 * 1024) {
        toast.error('Image too large (max 10MB)');
        return;
      }

      setUploading(true);
      trackFiles(1);

      // Show local preview immediately
      const previewUrl = URL.createObjectURL(file);
      updateAttributes({ src: previewUrl, alt: file.name });

      try {
        const storage = editor.storage.figureBlock as
          | { articleId?: string; articleSlug?: string }
          | undefined;
        const articleId = storage?.articleId || '';
        const articleSlug = storage?.articleSlug || '';

        const result = await uploadInspireImage({ slug: articleSlug, articleId }, file);
        updateAttributes({
          src: result.url,
          alt: file.name,
          'data-original-src': result.originalUrl,
          'data-quality': result.defaultQuality,
          'data-variants': JSON.stringify(result.variants),
        });
        markCompleted();
      } catch (err) {
        markFailed();
        toast.error(err instanceof Error ? err.message : 'Image upload failed');
        updateAttributes({ src: null, alt: null });
      } finally {
        URL.revokeObjectURL(previewUrl);
        setUploading(false);
      }
    },
    [updateAttributes],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const file = e.dataTransfer?.files?.[0];
      if (file) handleFileDrop(file);
    },
    [handleFileDrop],
  );

  const handleRemoveCaption = useCallback(() => {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos == null) return;

    const imageAttrs = {
      src: node.attrs.src,
      alt: node.attrs.alt,
      'data-original-src': node.attrs['data-original-src'],
      'data-quality': node.attrs['data-quality'],
      'data-variants': node.attrs['data-variants'],
    };

    editor
      .chain()
      .focus()
      .setNodeSelection(pos)
      .deleteSelection()
      .insertContentAt(pos, { type: 'image', attrs: imageAttrs })
      .run();
  }, [editor, node.attrs, getPos]);

  const handleSelectNode = useCallback(() => {
    const pos = typeof getPos === 'function' ? getPos() : null;
    if (pos == null) return;
    editor.commands.setNodeSelection(pos);
  }, [editor, getPos]);

  return (
    <NodeViewWrapper>
      <figure
        className={cn('relative my-4 rounded-md', selected && 'ring-primary ring-2 ring-offset-2')}
        onMouseEnter={() => setShowToolbar(true)}
        onMouseLeave={() => setShowToolbar(false)}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        {src ? (
          <>
            <div
              className="relative mx-auto cursor-pointer"
              style={{ maxWidth: 'min(480px, 100%)' }}
              onClick={handleSelectNode}
            >
              <Image
                src={src}
                alt={alt}
                width={480}
                height={320}
                sizes="(max-width: 480px) 100vw, 480px"
                className="h-auto w-full rounded-md"
                data-drag-handle
              />
              {uploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-md bg-black/30">
                  <div className="size-6 animate-spin rounded-full border-2 border-white border-t-transparent" />
                </div>
              )}
              {/* Caption overlay — read-only, pointer-events-none so clicks pass through to the image for selection */}
              {caption && (
                <figcaption
                  className="pointer-events-none absolute inset-x-0 bottom-0 rounded-b-md bg-gradient-to-t from-black/70 to-transparent px-3 pt-10 pb-3 text-xs text-white italic"
                  style={{ textShadow: 'var(--text-shadow-scrim)' }}
                >
                  {captionUrl ? (
                    <span className="underline decoration-white/40">{caption}</span>
                  ) : (
                    caption
                  )}
                </figcaption>
              )}
            </div>

            {/* Toolbar on hover */}
            {(showToolbar || selected) && (
              <div
                className="bg-background absolute -top-9 left-0 z-10 flex items-center gap-1 rounded-md border p-1 shadow-sm"
                contentEditable={false}
              >
                <button
                  type="button"
                  className="hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
                  onClick={() => setPickerOpen(true)}
                  title="Replace image"
                >
                  <Replace className="size-3.5" />
                </button>
                <button
                  type="button"
                  className="hover:bg-muted flex size-7 items-center justify-center rounded transition-colors"
                  onClick={handleRemoveCaption}
                  title="Remove caption (convert to image)"
                >
                  <RemoveFormatting className="size-3.5" />
                </button>
              </div>
            )}
          </>
        ) : (
          <div
            className="flex cursor-pointer flex-col items-center gap-3 rounded-md border-2 border-dashed p-8 text-center"
            onClick={() => setPickerOpen(true)}
            contentEditable={false}
          >
            <ImagePlus className="text-muted-foreground/60 size-8" />
            <p className="text-muted-foreground text-sm">Click to add image</p>
          </div>
        )}
      </figure>

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleMediaSelect}
        multiple={false}
      />
    </NodeViewWrapper>
  );
}
