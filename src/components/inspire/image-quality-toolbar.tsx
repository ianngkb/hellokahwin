'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { EditorInstance } from 'novel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles, ImageIcon } from 'lucide-react';
import type { ImageVariants } from '@/lib/storage/image-variants';

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

const QUALITY_LABELS: Record<string, string> = {
  low: 'Low',
  medium: 'Med',
  high: 'High',
  original: 'Original',
};

interface ImageQualitySidebarProps {
  editor: EditorInstance;
  imageAttrs: Record<string, string>;
  imageName: string;
  nodeType: string;
}

export function ImageQualitySidebar({
  editor,
  imageAttrs,
  imageName,
  nodeType,
}: ImageQualitySidebarProps) {
  const [generatingKey, setGeneratingKey] = useState<string | null>(null);
  const [captionValue, setCaptionValue] = useState(imageAttrs?.['data-caption'] ?? '');
  const [captionUrlValue, setCaptionUrlValue] = useState(imageAttrs?.['data-caption-url'] ?? '');

  useEffect(() => {
    setCaptionValue(imageAttrs?.['data-caption'] ?? '');
    setCaptionUrlValue(imageAttrs?.['data-caption-url'] ?? '');
  }, [imageAttrs?.['data-caption'], imageAttrs?.['data-caption-url'], imageAttrs?.src]);

  const variants: ImageVariants | null = useMemo(() => {
    if (!imageAttrs?.['data-variants']) return null;
    try {
      return JSON.parse(imageAttrs['data-variants']);
    } catch {
      return null;
    }
  }, [imageAttrs]);

  const currentQuality = imageAttrs?.['data-quality'] ?? null;

  // Construct original variant meta — always available
  const originalVariant: { url: string; sizeBytes?: number } = useMemo(() => {
    if (variants?.original) return variants.original;
    return { url: imageAttrs?.['data-original-src'] || imageAttrs?.src || '' };
  }, [variants, imageAttrs]);

  const handleGenerateSingleVariant = useCallback(
    async (key: string) => {
      const originalSrc = imageAttrs?.['data-original-src'] || imageAttrs?.src;
      if (!originalSrc) return;
      setGeneratingKey(key);
      try {
        const response = await fetch('/api/v1/inspire/generate-variants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ originalKey: originalSrc, variantKeys: [key] }),
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error?.message ?? 'Failed to generate variant');
        }

        const { data } = await response.json();
        const newVariants = data.variants as ImageVariants;

        // Merge new variant(s) into existing data-variants
        const existing = variants ?? ({} as Partial<ImageVariants>);
        const merged = { ...existing, ...newVariants };

        const attrs: Record<string, string> = {
          'data-variants': JSON.stringify(merged),
          src: newVariants[key as keyof ImageVariants]?.url ?? imageAttrs.src,
          'data-quality': key,
        };
        if (!imageAttrs?.['data-original-src']) {
          attrs['data-original-src'] = imageAttrs?.src ?? '';
        }

        editor.chain().focus().updateAttributes(nodeType, attrs).run();
      } catch (err) {
        console.error('Failed to generate variant:', err);
      } finally {
        setGeneratingKey(null);
      }
    },
    [editor, imageAttrs, variants, nodeType],
  );

  const handleQualityChange = useCallback(
    (quality: string) => {
      if (quality === 'original') {
        editor
          .chain()
          .updateAttributes(nodeType, {
            src: originalVariant.url,
            'data-quality': 'original',
          })
          .run();
        return;
      }
      if (!variants) return;
      const variant = variants[quality as keyof ImageVariants];
      if (!variant) return;
      editor
        .chain()
        .updateAttributes(nodeType, {
          src: variant.url,
          'data-quality': quality,
        })
        .run();
    },
    [editor, variants, originalVariant, nodeType],
  );

  const handleSaveCaption = useCallback(() => {
    const trimmedCaption = captionValue.trim();
    const trimmedUrl = captionUrlValue.trim();
    editor
      .chain()
      .updateAttributes('figureBlock', {
        'data-caption': trimmedCaption || null,
        'data-caption-url': trimmedUrl || null,
      })
      .run();
  }, [editor, captionValue, captionUrlValue]);

  return (
    <div className="border-info/30 bg-info-subtle space-y-2 rounded-lg border p-3">
      <Label className="text-xs font-semibold">Article Image Quality</Label>
      <p className="text-muted-foreground text-xs break-all">{imageName}</p>
      <div className="flex flex-wrap gap-1">
        {(['low', 'high', 'original'] as const).map((key) => {
          const variant = key === 'original' ? originalVariant : variants?.[key];
          const isGenerated = !!variant && variant.sizeBytes != null;
          const isActive = currentQuality === key;
          const isGenerating = generatingKey === key;

          if (key === 'original') {
            // Original is always clickable
            return (
              <Button
                key={key}
                type="button"
                variant={isActive ? 'primary' : 'quiet'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleQualityChange('original')}
              >
                Original
                {isGenerated && variant.sizeBytes != null
                  ? ` (${formatBytes(variant.sizeBytes)})`
                  : ''}
              </Button>
            );
          }

          if (isGenerated && variant.sizeBytes != null) {
            // Generated variant — active style, click switches quality
            return (
              <Button
                key={key}
                type="button"
                variant={isActive ? 'primary' : 'quiet'}
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={() => handleQualityChange(key)}
              >
                {QUALITY_LABELS[key]} ({formatBytes(variant.sizeBytes)})
              </Button>
            );
          }

          // Ungenerated variant — dimmed/dashed style, click generates
          return (
            <Button
              key={key}
              type="button"
              variant="quiet"
              size="sm"
              className="text-muted-foreground h-7 border-dashed px-2 text-xs"
              onClick={() => handleGenerateSingleVariant(key)}
              disabled={generatingKey != null}
            >
              {isGenerating ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="mr-1 h-3 w-3" />
              )}
              {QUALITY_LABELS[key]}
            </Button>
          );
        })}
      </div>
      {nodeType === 'figureBlock' && (
        <div className="space-y-1">
          <Label htmlFor="figure-caption" className="text-xs">
            Caption
          </Label>
          <input
            id="figure-caption"
            type="text"
            placeholder="Add a caption…"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
            value={captionValue}
            onChange={(e) => setCaptionValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveCaption();
              }
            }}
          />
          <Label htmlFor="figure-caption-url" className="text-xs">
            Caption URL
          </Label>
          <input
            id="figure-caption-url"
            type="url"
            placeholder="Caption link URL (optional)"
            className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring w-full rounded-md border px-2 py-1 text-xs focus-visible:ring-2 focus-visible:outline-none"
            value={captionUrlValue}
            onChange={(e) => setCaptionUrlValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSaveCaption();
              }
            }}
          />
          <Button
            type="button"
            size="sm"
            className="mt-1 h-7 w-full text-xs"
            onClick={handleSaveCaption}
          >
            Save Caption
          </Button>
        </div>
      )}
    </div>
  );
}

// --- Article Images List (always-visible sidebar section) ---

export interface BodyImageInfo {
  name: string;
  src: string;
  quality: string | null;
  sizeBytes: number | null;
}

interface ArticleImagesListProps {
  editor: EditorInstance;
  images: BodyImageInfo[];
}

export function ArticleImagesList({ editor, images }: ArticleImagesListProps) {
  const [targetQuality, setTargetQuality] = useState<string>('high');
  const [applying, setApplying] = useState(false);
  // src -> size in bytes, or -1 if unresolvable
  const [fetchedSizes, setFetchedSizes] = useState<Record<string, number>>({});

  // Get file sizes from the browser's performance API (already-loaded images)
  useEffect(() => {
    const toResolve = images.filter(
      (img) => img.sizeBytes == null && img.src && !(img.src in fetchedSizes),
    );
    if (toResolve.length === 0) return;
    const updates: Record<string, number> = {};
    for (const img of toResolve) {
      const entry = performance.getEntriesByName(img.src).pop() as
        PerformanceResourceTiming | undefined;
      const size = entry?.transferSize || entry?.encodedBodySize || 0;
      updates[img.src] = size > 0 ? size : -1;
    }
    setFetchedSizes((prev) => ({ ...prev, ...updates }));
  }, [images, fetchedSizes]);

  const handleApplyToAll = useCallback(async () => {
    setApplying(true);
    try {
      // Phase 1: Generate the target variant for images that need it
      const needsGeneration: { src: string; originalSrc: string; hasVariants: boolean }[] = [];
      editor.state.doc.descendants((node) => {
        if (node.type.name === 'image' && node.attrs.src) {
          const originalSrc = node.attrs['data-original-src'] || node.attrs.src;
          if (!node.attrs['data-variants']) {
            // No variants at all — needs generation
            needsGeneration.push({ src: node.attrs.src, originalSrc, hasVariants: false });
          } else if (targetQuality !== 'original') {
            // Has partial variants — check if target quality exists
            try {
              const v = JSON.parse(node.attrs['data-variants']) as ImageVariants;
              if (!v[targetQuality as keyof ImageVariants]) {
                needsGeneration.push({ src: node.attrs.src, originalSrc, hasVariants: true });
              }
            } catch {
              /* skip */
            }
          }
        }
      });

      for (const { src, originalSrc, hasVariants } of needsGeneration) {
        if (targetQuality === 'original') continue;
        try {
          const response = await fetch('/api/v1/inspire/generate-variants', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ originalKey: originalSrc, variantKeys: [targetQuality] }),
          });
          if (!response.ok) continue;
          const { data } = await response.json();
          const newVariants = data.variants as ImageVariants;

          let currentPos = -1;
          editor.state.doc.descendants((node, pos) => {
            if (currentPos === -1 && node.type.name === 'image' && node.attrs.src === src) {
              currentPos = pos;
            }
          });
          if (currentPos === -1) continue;

          const variant = newVariants[targetQuality as keyof ImageVariants];
          if (!variant) continue;

          // Merge into existing variants
          let existing: Partial<ImageVariants> = {};
          if (hasVariants) {
            try {
              const node = editor.state.doc.nodeAt(currentPos);
              if (node?.attrs['data-variants']) {
                existing = JSON.parse(node.attrs['data-variants']);
              }
            } catch {
              /* start fresh */
            }
          }
          const merged = { ...existing, ...newVariants };

          editor
            .chain()
            .command(({ tr }) => {
              if (!hasVariants) {
                tr.setNodeAttribute(currentPos, 'data-original-src', originalSrc);
              }
              tr.setNodeAttribute(currentPos, 'data-variants', JSON.stringify(merged));
              tr.setNodeAttribute(currentPos, 'data-quality', targetQuality);
              tr.setNodeAttribute(currentPos, 'src', variant.url);
              return true;
            })
            .run();
        } catch {
          /* skip failed */
        }
      }

      // Phase 2: Switch quality on images that already have the target variant
      const chain = editor.chain();
      editor.state.doc.descendants((node, pos) => {
        if (node.type.name === 'image' && node.attrs['data-variants']) {
          try {
            const v = JSON.parse(node.attrs['data-variants']) as ImageVariants;
            const variant = v[targetQuality as keyof ImageVariants];
            if (variant) {
              chain.command(({ tr }) => {
                tr.setNodeAttribute(pos, 'src', variant.url);
                tr.setNodeAttribute(pos, 'data-quality', targetQuality);
                return true;
              });
            }
          } catch {
            /* skip */
          }
        }
      });
      chain.run();
    } catch (err) {
      console.error('Failed to apply to all:', err);
    } finally {
      setApplying(false);
    }
  }, [editor, targetQuality]);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-semibold">
          <ImageIcon className="size-3.5" />
          Article Images
          <span className="text-muted-foreground font-normal">({images.length})</span>
        </Label>
      </div>

      {/* Apply to all controls */}
      <div className="flex items-center gap-1">
        {(['low', 'high', 'original'] as const).map((key) => (
          <Button
            key={key}
            type="button"
            variant={targetQuality === key ? 'primary' : 'quiet'}
            size="sm"
            className="h-6 px-1.5 text-[11px]"
            onClick={() => setTargetQuality(key)}
          >
            {QUALITY_LABELS[key]}
          </Button>
        ))}
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="ml-auto h-6 px-2 text-[11px]"
          onClick={handleApplyToAll}
          disabled={applying}
        >
          {applying ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Applying...
            </>
          ) : (
            'Apply to all'
          )}
        </Button>
      </div>

      {/* Image list */}
      <div className="max-h-48 space-y-1 overflow-y-auto">
        {images.map((img, i) => (
          <div
            key={`${img.src}-${i}`}
            className="text-muted-foreground flex items-center justify-between py-0.5 text-xs"
          >
            <span className="mr-2 truncate" title={img.name}>
              {img.name}
            </span>
            <span className="shrink-0">
              {img.quality && img.sizeBytes != null
                ? `${QUALITY_LABELS[img.quality] ?? img.quality} · ${formatBytes(img.sizeBytes)}`
                : fetchedSizes[img.src] > 0
                  ? formatBytes(fetchedSizes[img.src])
                  : 'Original'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
