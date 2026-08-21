'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Sparkles } from 'lucide-react';
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

interface CoverImageQualityProps {
  coverImageUrl: string;
  variants: ImageVariants | null;
  quality: string;
  onQualityChange: (quality: string) => void;
  onVariantsGenerated: (variants: ImageVariants, defaultQuality: string) => void;
}

export function CoverImageQuality({
  coverImageUrl,
  variants,
  quality,
  onQualityChange,
  onVariantsGenerated,
}: CoverImageQualityProps) {
  const [generating, setGenerating] = useState(false);

  const handleGenerateVariants = useCallback(async () => {
    if (!coverImageUrl) return;
    setGenerating(true);
    try {
      const response = await fetch('/api/v1/inspire/generate-variants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ originalKey: coverImageUrl }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error?.message ?? 'Failed to generate variants');
      }

      const { data } = await response.json();
      const { variants: newVariants, defaultQuality } = data as {
        variants: ImageVariants;
        defaultQuality: string;
      };

      onVariantsGenerated(newVariants, defaultQuality);
    } catch (err) {
      console.error('Failed to generate cover image variants:', err);
    } finally {
      setGenerating(false);
    }
  }, [coverImageUrl, onVariantsGenerated]);

  if (!coverImageUrl) return null;

  if (!variants) {
    return (
      <div className="space-y-1.5">
        <Label className="text-muted-foreground text-xs">Cover Image Quality</Label>
        <Button
          type="button"
          variant="quiet"
          size="sm"
          className="h-7 w-full gap-1.5 text-xs"
          onClick={handleGenerateVariants}
          disabled={generating}
        >
          {generating ? (
            <>
              <Loader2 className="h-3 w-3 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Sparkles className="h-3 w-3" />
              Generate quality variants
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <Label className="text-muted-foreground text-xs">Image Quality</Label>
      <div className="flex flex-wrap gap-1">
        {(['low', 'medium', 'high', 'original'] as const).map((key) => {
          const variant = variants[key];
          if (!variant) return null;
          return (
            <Button
              key={key}
              type="button"
              variant={quality === key ? 'primary' : 'quiet'}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() => onQualityChange(key)}
            >
              {QUALITY_LABELS[key]} ({formatBytes(variant.sizeBytes)})
            </Button>
          );
        })}
      </div>
    </div>
  );
}
