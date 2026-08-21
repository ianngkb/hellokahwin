'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import type { SmartCrops } from '@/lib/storage/smart-crop';

const CROP_LABELS: Record<string, { label: string; aspect: string }> = {
  'crop-4x5-mobile-cover': { label: 'Mobile Cover', aspect: '4:5' },
  // Ratio is 3.52:1; the `4.3x1` in the key is a retained legacy identifier.
  'crop-4.3x1-desktop-hero': { label: 'Desktop Hero', aspect: '3.52:1' },
  'crop-4x3-article-card': { label: 'Article Card', aspect: '4:3' },
  'crop-16x9-og': { label: 'Social Share', aspect: '16:9' },
};

interface SmartCropPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  smartCrops: SmartCrops | null;
  originalImageUrl?: string | null;
  onRequestManualCrop?: () => void;
  onRevert?: () => void;
  isReverting?: boolean;
}

export function SmartCropPreviewDialog({
  open,
  onOpenChange,
  smartCrops,
  originalImageUrl,
  onRequestManualCrop,
  onRevert,
  isReverting,
}: SmartCropPreviewDialogProps) {
  if (!smartCrops) return null;

  const cropEntries = Object.entries(smartCrops);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Smart Crop Preview</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-4">
          {originalImageUrl && (
            <div className="space-y-1.5">
              <p className="text-muted-foreground text-xs font-medium">Original</p>
              <div className="bg-muted relative aspect-video overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={originalImageUrl}
                  alt="Original"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
            </div>
          )}
          {cropEntries.map(([name, crop]) => {
            const meta = CROP_LABELS[name];
            return (
              <div key={name} className="space-y-1.5">
                <p className="text-muted-foreground text-xs font-medium">
                  {meta?.label ?? name}{' '}
                  <span className="text-muted-foreground/60">{meta?.aspect}</span>
                </p>
                <div
                  className="bg-muted relative overflow-hidden rounded-md border"
                  style={{ aspectRatio: `${crop.width} / ${crop.height}` }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={crop.url}
                    alt={`${meta?.label ?? name} crop`}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-4">
          <div>
            {onRevert && (
              <Button variant="destructive" size="sm" onClick={onRevert} disabled={isReverting}>
                {isReverting ? 'Reverting...' : 'Revert crops'}
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {onRequestManualCrop && (
              <Button
                variant="quiet"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onRequestManualCrop();
                }}
              >
                Adjust focal point
              </Button>
            )}
            <Button size="sm" onClick={() => onOpenChange(false)}>
              Looks good
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
