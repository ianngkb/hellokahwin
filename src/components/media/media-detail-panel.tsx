'use client';

import { useState, useEffect, useCallback, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { Copy, Trash2, ExternalLink, Check, Crop, Library } from 'lucide-react';
import {
  getMediaByIdAction,
  updateMediaAction,
  deleteMediaAction,
  getMediaUsageAction,
  getMediaChildrenAction,
} from '@/app/(admin)/admin/inspire/media/actions';
import { toast } from 'sonner';
import type { Media } from '@/lib/db/schema/media';
import type { ImageVariants } from '@/lib/storage/image-variants';
import { cn, formatFileSize } from '@/lib/utils';
import { MediaImageEditor } from './media-image-editor';

interface MediaDetailPanelProps {
  mediaId: string | null;
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
  onDeleted: () => void;
  onNavigate?: (mediaId: string) => void;
}

export function MediaDetailPanel({
  mediaId,
  open,
  onClose,
  onUpdated,
  onDeleted,
  onNavigate,
}: MediaDetailPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [mediaData, setMediaData] = useState<
    | (Media & {
        originalArticleTitle?: string;
        uploaderName?: string;
        parentMediaFilename?: string | null;
      })
    | null
  >(null);
  const [usages, setUsages] = useState<{ id: string; title: string; slug: string }[]>([]);
  const [children, setChildren] = useState<
    {
      id: string;
      filename: string;
      url: string;
      width: number | null;
      height: number | null;
      createdAt: Date;
    }[]
  >([]);
  const [alt, setAlt] = useState('');
  const [caption, setCaption] = useState('');
  const [captionUrl, setCaptionUrl] = useState('');
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!mediaId || !open) {
      setMediaData(null);
      setEditing(false);
      return;
    }

    setEditing(false);
    startTransition(async () => {
      const [mediaResult, usageResult, childrenResult] = await Promise.all([
        getMediaByIdAction(mediaId),
        getMediaUsageAction(mediaId),
        getMediaChildrenAction(mediaId),
      ]);

      if (mediaResult.data) {
        setMediaData(mediaResult.data);
        setAlt(mediaResult.data.alt ?? '');
        setCaption(mediaResult.data.caption ?? '');
        setCaptionUrl(mediaResult.data.captionUrl ?? '');
      }
      if (usageResult.data) {
        setUsages(usageResult.data);
      }
      setChildren(childrenResult.data ?? []);
    });
  }, [mediaId, open]);

  const handleSaveField = useCallback(
    (field: 'alt' | 'caption' | 'captionUrl', value: string) => {
      if (!mediaId) return;
      startTransition(async () => {
        const result = await updateMediaAction(mediaId, { [field]: value });
        if (result.error) {
          toast.error(result.error);
        } else {
          onUpdated();
        }
      });
    },
    [mediaId, onUpdated],
  );

  const handleDelete = useCallback(() => {
    if (!mediaId) return;
    startTransition(async () => {
      const result = await deleteMediaAction(mediaId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success('Media deleted');
        onDeleted();
      }
    });
  }, [mediaId, onDeleted]);

  const handleCopyUrl = useCallback(() => {
    if (!mediaData) return;
    navigator.clipboard.writeText(mediaData.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [mediaData]);

  const variants = mediaData?.variants as ImageVariants | null;
  const hasHighVariant = !!variants?.high;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        className={cn('w-full overflow-y-auto p-0', editing ? 'sm:max-w-2xl' : 'sm:max-w-lg')}
      >
        <div className="px-6 pt-6 pb-2">
          <SheetHeader>
            <SheetTitle className="truncate pr-8">
              {editing ? 'Edit Image' : (mediaData?.filename ?? 'Loading...')}
            </SheetTitle>
          </SheetHeader>
        </div>

        {editing && mediaData ? (
          <MediaImageEditor
            media={mediaData}
            onBack={() => setEditing(false)}
            onSaved={(newMediaId) => {
              setEditing(false);
              onUpdated();
              onNavigate?.(newMediaId);
            }}
          />
        ) : mediaData ? (
          <div className="space-y-5 px-6 pb-6">
            {/* Preview */}
            <div className="bg-muted relative aspect-video overflow-hidden rounded-md border">
              <Image
                src={mediaData.url}
                alt={mediaData.alt ?? mediaData.filename}
                fill
                sizes="(max-width: 640px) 100vw, 480px"
                className="object-contain"
              />
            </div>

            {/* Metadata */}
            <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
              <span className="text-muted-foreground">Dimensions</span>
              <span>
                {mediaData.width && mediaData.height
                  ? `${mediaData.width}\u00D7${mediaData.height}`
                  : '—'}
              </span>
              <span className="text-muted-foreground">File size</span>
              <span>{formatFileSize(mediaData.fileSize)}</span>
              <span className="text-muted-foreground">Type</span>
              <span>{mediaData.mimeType}</span>
              <span className="text-muted-foreground">Source</span>
              <span>
                {mediaData.source === 'article_upload' ? 'Article upload' : 'Library upload'}
              </span>
              <span className="text-muted-foreground">Uploaded</span>
              <span>
                {new Date(mediaData.createdAt).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </span>
              {String((mediaData as Record<string, unknown>).uploaderName ?? '') && (
                <>
                  <span className="text-muted-foreground">Uploaded by</span>
                  <span>{String((mediaData as Record<string, unknown>).uploaderName)}</span>
                </>
              )}
            </div>

            {/* Copy URL */}
            <Button variant="quiet" size="sm" className="w-full gap-1.5" onClick={handleCopyUrl}>
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? 'Copied!' : 'Copy URL'}
            </Button>

            {/* Open Media Library */}
            <Button variant="quiet" size="sm" className="w-full gap-1.5" asChild>
              <Link href="/admin/inspire/media">
                <Library className="size-3.5" />
                Open Media Library
              </Link>
            </Button>

            {/* Edit Image or Cropped From link */}
            {mediaData.parentMediaId ? (
              <Button
                variant="quiet"
                size="sm"
                className="w-full gap-1.5"
                onClick={() => onNavigate?.(mediaData.parentMediaId!)}
              >
                <Crop className="size-3.5" />
                Cropped from: {mediaData.parentMediaFilename ?? 'original'}
              </Button>
            ) : (
              <Button
                variant="quiet"
                size="sm"
                className="w-full gap-1.5"
                disabled={!hasHighVariant}
                onClick={() => setEditing(true)}
                title={hasHighVariant ? undefined : 'Generate variants first'}
              >
                <Crop className="size-3.5" />
                {hasHighVariant ? 'Edit Image' : 'Edit Image (generate variants first)'}
              </Button>
            )}

            <Separator />

            {/* Editable fields */}
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Alt text</Label>
                <Textarea
                  value={alt}
                  onChange={(e) => setAlt(e.target.value)}
                  onBlur={() => handleSaveField('alt', alt)}
                  placeholder="Describe this image..."
                  rows={2}
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Caption</Label>
                <Input
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  onBlur={() => handleSaveField('caption', caption)}
                  placeholder="Photo credit or caption"
                  className="text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Caption URL</Label>
                <Input
                  value={captionUrl}
                  onChange={(e) => setCaptionUrl(e.target.value)}
                  onBlur={() => handleSaveField('captionUrl', captionUrl)}
                  placeholder="https://..."
                  className="text-sm"
                />
              </div>
            </div>

            {/* Variant info */}
            {variants && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Variants</h4>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {(['original', 'high', 'medium', 'low'] as const).map((key) => {
                      const v = variants[key];
                      if (!v) return null;
                      return (
                        <div key={key} className="bg-muted flex justify-between rounded p-2">
                          <span className="capitalize">{key}</span>
                          <span className="text-muted-foreground">
                            {formatFileSize(v.sizeBytes)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            {/* Edits (child crops) */}
            {children.length > 0 && (
              <>
                <Separator />
                <div className="space-y-2">
                  <h4 className="text-sm font-medium">Edits ({children.length})</h4>
                  <div className="space-y-1.5">
                    {children.map((child) => (
                      <button
                        key={child.id}
                        type="button"
                        className="hover:bg-muted flex w-full items-center gap-2.5 rounded-md p-1.5 text-left transition-colors"
                        onClick={() => onNavigate?.(child.id)}
                      >
                        <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded">
                          <Image
                            src={child.url}
                            alt={child.filename}
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs">{child.filename}</p>
                          <p className="text-muted-foreground text-[10px]">
                            {child.width && child.height
                              ? `${child.width}\u00D7${child.height}`
                              : ''}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Original article */}
            {String((mediaData as Record<string, unknown>).originalArticleTitle ?? '') &&
              mediaData.originalArticleId && (
                <>
                  <Separator />
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-medium">Original article</h4>
                    <Link
                      href={`/admin/inspire/${mediaData.originalArticleId}/edit`}
                      className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                    >
                      {String((mediaData as Record<string, unknown>).originalArticleTitle)}
                      <ExternalLink className="size-3" />
                    </Link>
                  </div>
                </>
              )}

            {/* Used in articles */}
            {usages.length > 0 && (
              <>
                <Separator />
                <div className="space-y-1.5">
                  <h4 className="text-sm font-medium">Used in articles ({usages.length})</h4>
                  <ul className="space-y-1">
                    {usages.map((a) => (
                      <li key={a.id}>
                        <Link
                          href={`/admin/inspire/${a.id}/edit`}
                          className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
                        >
                          {a.title}
                          <ExternalLink className="size-3" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            <Separator />

            {/* Delete */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" className="w-full gap-1.5">
                  <Trash2 className="size-3.5" />
                  Delete
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete media?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {usages.length > 0
                      ? `This image is used in ${usages.length} article${usages.length === 1 ? '' : 's'}. Deleting it will remove it from R2 storage. The image references in articles will become broken.`
                      : 'This will permanently delete the image and all its variants from R2 storage.'}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
