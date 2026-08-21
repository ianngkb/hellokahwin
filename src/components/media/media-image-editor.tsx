'use client';

import { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { createMediaRecordAction } from '@/app/(admin)/admin/inspire/media/actions';
import type { Media } from '@/lib/db/schema/media';
import type { ImageVariants } from '@/lib/storage/image-variants';

interface MediaImageEditorProps {
  media: Media;
  onBack: () => void;
  onSaved: (newMediaId: string) => void;
}

const ASPECT_PRESETS: { label: string; value: number | undefined }[] = [
  { label: 'Free', value: undefined },
  { label: '16:9', value: 16 / 9 },
  { label: '4:3', value: 4 / 3 },
  { label: '1:1', value: 1 },
  { label: '4:5', value: 4 / 5 },
];

const ROTATION_PRESETS = [0, 90, 180, 270];

export function MediaImageEditor({ media, onBack, onSaved }: MediaImageEditorProps) {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [aspect, setAspect] = useState<number | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [activePreset, setActivePreset] = useState('Free');

  // Custom aspect ratio inputs
  const [customW, setCustomW] = useState('');
  const [customH, setCustomH] = useState('');

  // Source image URL: use high variant, fall back to media.url
  const variants = media.variants as ImageVariants | null;
  const sourceUrl = variants?.high?.url ?? media.url;

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleAspectPreset = useCallback((label: string, value: number | undefined) => {
    setActivePreset(label);
    setAspect(value);
    setCustomW('');
    setCustomH('');
  }, []);

  const handleCustomAspect = useCallback(() => {
    const w = parseFloat(customW);
    const h = parseFloat(customH);
    if (w > 0 && h > 0) {
      setAspect(w / h);
      setActivePreset('');
    }
  }, [customW, customH]);

  const handleSave = useCallback(async () => {
    if (!croppedAreaPixels) {
      toast.error('Please select a crop area first');
      return;
    }

    setSaving(true);
    try {
      // Resolve the source R2 key from the high variant URL
      const sourceR2Key = variants?.high?.url ?? media.url;

      // POST to the crop API
      const response = await fetch('/api/v1/inspire/crop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceR2Key,
          croppedAreaPixels,
          rotation,
          zoom,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error?.message ?? 'Failed to process image');
      }

      const { url, r2Key, filename, width, height, fileSize } = result.data;

      // Create a new media record
      const createResult = await createMediaRecordAction({
        filename,
        r2Key,
        url,
        originalUrl: url,
        mimeType: 'image/webp',
        fileSize,
        width,
        height,
        variants: undefined,
        source: 'library_upload',
        originalArticleId: media.originalArticleId,
        parentMediaId: media.id,
      });

      if (createResult.error) {
        throw new Error(createResult.error);
      }

      toast.success(`Image saved as ${filename}`);
      onSaved(createResult.data!.id);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save image');
    } finally {
      setSaving(false);
    }
  }, [croppedAreaPixels, rotation, zoom, variants, media.url, media.originalArticleId, onSaved]);

  return (
    <div className="flex h-full flex-col">
      {/* Top toolbar */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="gap-1.5">
          <ArrowLeft className="size-4" />
          Back
        </Button>
        <Button size="sm" onClick={handleSave} disabled={saving || !croppedAreaPixels}>
          {saving && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          Save
        </Button>
      </div>

      {/* Canvas area */}
      <div className="bg-muted relative min-h-[300px] flex-1">
        <Cropper
          image={sourceUrl}
          crop={crop}
          zoom={zoom}
          rotation={rotation}
          aspect={aspect}
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onRotationChange={setRotation}
          onCropComplete={onCropComplete}
        />
      </div>

      {/* Bottom controls panel */}
      <div className="max-h-[340px] space-y-4 overflow-y-auto border-t px-4 py-4">
        {/* Crop: Aspect ratio */}
        <div className="space-y-2">
          <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            Aspect Ratio
          </Label>
          <div className="flex flex-wrap gap-1.5">
            {ASPECT_PRESETS.map((preset) => (
              <Button
                key={preset.label}
                variant={activePreset === preset.label ? 'primary' : 'quiet'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => handleAspectPreset(preset.label, preset.value)}
              >
                {preset.label}
              </Button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="W"
              value={customW}
              onChange={(e) => setCustomW(e.target.value)}
              className="h-7 w-16 text-xs"
              min={1}
            />
            <span className="text-muted-foreground text-xs">&times;</span>
            <Input
              type="number"
              placeholder="H"
              value={customH}
              onChange={(e) => setCustomH(e.target.value)}
              className="h-7 w-16 text-xs"
              min={1}
            />
            <Button variant="quiet" size="sm" className="h-7 text-xs" onClick={handleCustomAspect}>
              Apply
            </Button>
          </div>
        </div>

        <Separator />

        {/* Scale: Zoom slider */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Scale
            </Label>
            <span className="text-muted-foreground text-xs">{zoom.toFixed(1)}x</span>
          </div>
          <Slider value={[zoom]} onValueChange={([v]) => setZoom(v)} min={1} max={3} step={0.1} />
        </div>

        <Separator />

        {/* Rotation */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Rotation
            </Label>
            <div className="flex items-center gap-1.5">
              <Input
                type="number"
                value={rotation}
                onChange={(e) => setRotation(Number(e.target.value) || 0)}
                className="h-7 w-16 text-right text-xs"
                min={0}
                max={360}
              />
              <span className="text-muted-foreground text-xs">deg</span>
            </div>
          </div>
          <Slider
            value={[rotation]}
            onValueChange={([v]) => setRotation(v)}
            min={0}
            max={360}
            step={1}
          />
          <div className="flex gap-1.5">
            {ROTATION_PRESETS.map((deg) => (
              <Button
                key={deg}
                variant={rotation === deg ? 'primary' : 'quiet'}
                size="sm"
                className="h-7 px-2.5 text-xs"
                onClick={() => setRotation(deg)}
              >
                {deg}&deg;
              </Button>
            ))}
          </div>
        </div>

        <Separator />

        {/* Crop info */}
        {croppedAreaPixels && (
          <div className="space-y-1.5">
            <Label className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
              Crop Info
            </Label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div className="bg-muted rounded p-1.5 text-center">
                <div className="text-muted-foreground">X</div>
                <div className="font-mono">{Math.round(croppedAreaPixels.x)}</div>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <div className="text-muted-foreground">Y</div>
                <div className="font-mono">{Math.round(croppedAreaPixels.y)}</div>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <div className="text-muted-foreground">W</div>
                <div className="font-mono">{Math.round(croppedAreaPixels.width)}</div>
              </div>
              <div className="bg-muted rounded p-1.5 text-center">
                <div className="text-muted-foreground">H</div>
                <div className="font-mono">{Math.round(croppedAreaPixels.height)}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
