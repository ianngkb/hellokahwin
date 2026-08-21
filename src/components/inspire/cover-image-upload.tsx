'use client';

import { useState, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { ChevronDown, ImageUp, Library, Loader2, X } from 'lucide-react';
import { MediaPickerDialog } from '@/components/media/media-picker-dialog';
import { uploadInspireImage } from '@/lib/storage/inspire-upload';
import type { UploadStage } from '@/lib/storage/upload';
import type { ImageVariants } from '@/lib/storage/image-variants';
import type { SmartCrops, FocalPoint } from '@/lib/storage/smart-crop';
import type { PickedMedia } from '@/lib/media/picked-media';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import { cn } from '@/lib/utils';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

interface CoverImageUploadProps {
  articleId: string;
  coverImageUrl: string;
  setCoverImageUrl: (url: string) => void;
  coverImageVariants?: ImageVariants | null;
  setCoverImageVariants?: (variants: ImageVariants | null) => void;
  coverImageQuality?: string;
  setCoverImageQuality?: (quality: string) => void;
  coverImageSmartCrops?: unknown;
  setCoverImageSmartCrops?: (crops: SmartCrops | null) => void;
  setCoverImageFocalPoint?: (fp: FocalPoint | null) => void;
  setCoverImageDetectionData?: (data: object | null) => void;
  onSmartCropsReady?: (crops: SmartCrops) => void;
}

export function CoverImageUpload({
  articleId,
  coverImageUrl,
  setCoverImageUrl,
  setCoverImageVariants,
  setCoverImageQuality,
  coverImageSmartCrops,
  setCoverImageSmartCrops,
  setCoverImageFocalPoint,
  setCoverImageDetectionData,
  onSmartCropsReady,
}: CoverImageUploadProps) {
  // Prefer the focal-point-aware desktop-hero smart crop for the preview so it
  // reflects a chosen focal point. `coverImageUrl` stays the full image (used
  // for OG/gallery/cards), so we never overwrite it with a crop URL.
  //
  // The stored crop URL already carries its own focal-point `?v=` cache-bust
  // (see generateSmartCrops), so it is rendered as-is — appending another here
  // would produce a double `?v=…&v=…` that drifts from what the public pages
  // serve.
  const cropUrl = getSmartCropUrl(coverImageSmartCrops, 'crop-4.3x1-desktop-hero');
  const previewUrl = cropUrl ?? coverImageUrl;
  const [stage, setStage] = useState<UploadStage | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isUploading =
    stage === 'compressing' ||
    stage === 'uploading' ||
    stage === 'generating' ||
    stage === 'smart-cropping';

  const handleFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        setError('Please select an image file');
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError(`File too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Max 10MB.`);
        return;
      }

      setError(null);

      try {
        const result = await uploadInspireImage(
          { articleId, skipSmartCrops: false },
          file,
          (s, p) => {
            setStage(s);
            setProgress(p);
          },
        );

        setCoverImageUrl(result.url);
        setCoverImageVariants?.(result.variants);
        setCoverImageQuality?.(result.defaultQuality);
        setCoverImageSmartCrops?.(result.smartCrops);
        setCoverImageFocalPoint?.(result.focalPoint);
        setCoverImageDetectionData?.(result.detectionData);
        if (result.smartCrops) onSmartCropsReady?.(result.smartCrops);
        setStage(null);
        setProgress(0);
      } catch (err) {
        setStage('error');
        setError(err instanceof Error ? err.message : 'Upload failed');
      }
    },
    [
      articleId,
      setCoverImageUrl,
      setCoverImageVariants,
      setCoverImageQuality,
      setCoverImageSmartCrops,
      setCoverImageFocalPoint,
      setCoverImageDetectionData,
      onSmartCropsReady,
    ],
  );

  // A picked image carries no smart-crop analysis of its own, so any crops from
  // a previously uploaded cover are cleared — leaving them would apply the old
  // image's framing to the new one.
  const handleLibrarySelect = useCallback(
    (items: PickedMedia[]) => {
      const item = items[0];
      if (!item) return;

      setCoverImageUrl(item.url);
      setCoverImageVariants?.((item.variants as ImageVariants | null) ?? null);
      setCoverImageQuality?.(item.defaultQuality ?? 'high');
      setCoverImageSmartCrops?.(null);
      setCoverImageFocalPoint?.(null);
      setCoverImageDetectionData?.(null);
    },
    [
      setCoverImageUrl,
      setCoverImageVariants,
      setCoverImageQuality,
      setCoverImageSmartCrops,
      setCoverImageFocalPoint,
      setCoverImageDetectionData,
    ],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className="space-y-2">
      <Label className="text-sm font-semibold">Cover Image</Label>

      {/* Preview */}
      {coverImageUrl && (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={previewUrl}
            alt="Cover preview"
            className="aspect-[88/25] w-full rounded-md object-cover"
          />
          <Button
            type="button"
            variant="quiet"
            size="icon"
            className="absolute top-1.5 right-1.5 h-6 w-6"
            onClick={() => setCoverImageUrl('')}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}

      {/* Upload drop zone */}
      <button
        type="button"
        className={cn(
          'flex w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed p-4 transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
          isUploading && 'pointer-events-none opacity-60',
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? (
          <>
            <Loader2 className="text-muted-foreground h-4 w-4 animate-spin" />
            <span className="text-muted-foreground text-xs">
              {stage === 'compressing'
                ? 'Compressing...'
                : stage === 'generating'
                  ? 'Generating variants...'
                  : stage === 'smart-cropping'
                    ? 'Analyzing image...'
                    : `Uploading ${progress}%`}
            </span>
          </>
        ) : (
          <>
            <ImageUp className="text-muted-foreground h-4 w-4" />
            <span className="text-muted-foreground text-xs">
              {coverImageUrl ? 'Replace image' : 'Drop image or click to upload'}
            </span>
          </>
        )}
      </button>

      <Button
        type="button"
        variant="quiet"
        size="sm"
        className="w-full gap-1.5"
        onClick={() => setPickerOpen(true)}
      >
        <Library className="size-3.5" />
        Choose from Media Library
      </Button>

      {error && <p className="text-destructive text-xs">{error}</p>}

      {/* URL fallback — collapsed by default */}
      <UrlToggle coverImageUrl={coverImageUrl} setCoverImageUrl={setCoverImageUrl} />

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = '';
        }}
      />

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={handleLibrarySelect}
        multiple={false}
        kind="image"
        articleId={articleId}
      />
    </div>
  );
}

function UrlToggle({
  coverImageUrl,
  setCoverImageUrl,
}: {
  coverImageUrl: string;
  setCoverImageUrl: (url: string) => void;
}) {
  const [showUrl, setShowUrl] = useState(false);

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setShowUrl(!showUrl)}
        className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
      >
        <ChevronDown className={cn('size-3 transition-transform', !showUrl && '-rotate-90')} />
        Image URL
      </button>
      {showUrl && (
        <Input
          value={coverImageUrl}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCoverImageUrl(e.target.value)}
          placeholder="Or paste image URL..."
          className="text-sm"
        />
      )}
    </div>
  );
}
