'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { SmartCrops, FocalPoint } from '@/lib/storage/smart-crop';

interface SmartCropManualOverrideProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  originalImageUrl: string;
  currentFocalPoint: FocalPoint | null;
  /**
   * R2 key of the original, used only by the default `fetch` path. Optional
   * because a caller supplying `onSubmitOverride` resolves the key server-side
   * from the entity itself and has nothing to pass here.
   */
  originalKey?: string;
  /**
   * Persist the chosen point via a server action instead of the
   * `/api/v1/inspire/generate-smart-crops` route, resolving to the new crops (or
   * `null` on failure — the dialog then stays open so the point isn't lost).
   * Lets the admin Cover Photos page write the override for articles AND
   * listings while the article editor's existing behaviour is untouched.
   */
  onSubmitOverride?: (point: { x: number; y: number }) => Promise<SmartCrops | null>;
  onApply: (result: {
    focalPointOverride: { x: number; y: number };
    smartCrops: SmartCrops;
  }) => void;
}

export function SmartCropManualOverride({
  open,
  onOpenChange,
  originalImageUrl,
  currentFocalPoint,
  originalKey,
  onSubmitOverride,
  onApply,
}: SmartCropManualOverrideProps) {
  const [focalX, setFocalX] = useState(currentFocalPoint?.x ?? 0.5);
  const [focalY, setFocalY] = useState(currentFocalPoint?.y ?? 0.5);
  const [isProcessing, setIsProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Sync internal state when parent's focal point changes
  useEffect(() => {
    if (currentFocalPoint) {
      setFocalX(currentFocalPoint.x);
      setFocalY(currentFocalPoint.y);
    }
  }, [currentFocalPoint]);

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (isProcessing) return;
      const img = imageRef.current;
      if (!img) return;

      const rect = img.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const y = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      setFocalX(x);
      setFocalY(y);
    },
    [isProcessing],
  );

  const handleApply = useCallback(async () => {
    setIsProcessing(true);

    try {
      let smartCrops: SmartCrops;

      if (onSubmitOverride) {
        // Server-action path: the caller reports failure as `null` and has
        // already surfaced its own error, so leave the dialog open with the
        // chosen point intact rather than discarding the admin's work.
        const result = await onSubmitOverride({ x: focalX, y: focalY });
        if (!result) return;
        smartCrops = result;
      } else {
        const response = await fetch('/api/v1/inspire/generate-smart-crops', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            originalKey,
            focalPointOverride: { x: focalX, y: focalY },
          }),
        });

        if (!response.ok) {
          throw new Error('Failed to regenerate crops');
        }

        const { data } = await response.json();
        smartCrops = data.smartCrops;
      }

      onApply({
        focalPointOverride: { x: focalX, y: focalY },
        smartCrops,
      });
      onOpenChange(false);
    } catch (err) {
      console.error('Manual crop override failed:', err);
      toast.error('Failed to regenerate crops. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  }, [originalKey, onSubmitOverride, focalX, focalY, onApply, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Adjust Focal Point</DialogTitle>
        </DialogHeader>

        <p className="text-muted-foreground text-sm">
          Click on the image to set the focal point. Smart crops will be centered on this position.
        </p>

        <div className="relative cursor-crosshair">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imageRef}
            src={originalImageUrl}
            alt="Original image"
            className="w-full rounded-md"
            onClick={handleImageClick}
            draggable={false}
          />
          {/* Focal point crosshair */}
          <div
            className="pointer-events-none absolute"
            style={{
              left: `${focalX * 100}%`,
              top: `${focalY * 100}%`,
              transform: 'translate(-50%, -50%)',
            }}
          >
            <div className="relative">
              <div className="size-6 rounded-full border-2 border-white shadow-[0_0_0_1px_oklch(0_0_0/0.3)]" />
              <div className="absolute top-1/2 left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow-[0_0_0_1px_oklch(0_0_0/0.3)]" />
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="quiet" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={isProcessing}>
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Regenerating...
              </>
            ) : (
              'Apply'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
