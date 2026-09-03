'use client';

import { useState, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Upload, X, Check, AlertCircle, Loader2, ImageIcon } from 'lucide-react';
import { uploadInspireBulk } from '@/lib/storage/inspire-bulk-upload';
import type { UploadStage } from '@/lib/storage/upload';
import { trackFiles, markCompleted, markFailed } from '@/lib/storage/upload-progress';
import { cn } from '@/lib/utils';

const MAX_FILES = 100;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
/**
 * Long enough for a real description, short enough that the whole batch stays
 * well inside the server action's 1 MiB body limit at 100 files.
 */
const MAX_ALT_LENGTH = 300;

/**
 * Whether an alt field actually says anything.
 *
 * `.trim()` alone is not enough: it strips whitespace, and a zero-width space
 * (U+200B) or a byte-order mark is neither whitespace nor visible, so a field
 * holding one would pass the gate and ship an empty accessible name. `\p{Cf}`
 * is the Unicode format category, which is where those characters live.
 */
function hasVisibleText(value: string): boolean {
  return value.replace(/[\s\p{Cf}]/gu, '').length > 0;
}

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
  articleSlug?: string;
  articleId?: string;
}

type FileStatus = 'pending' | 'uploading' | 'generating' | 'smart-cropping' | 'done' | 'error';

interface FileEntry {
  file: File;
  preview: string;
  status: FileStatus;
  progress: number;
  error?: string;
  /**
   * Required before this entry can be uploaded — see `missingAltCount`.
   *
   * Ahrefs' 2026-08-28 crawl found 172 images with no alt text, 49 of them on
   * a single real-wedding essay. They are not decorative; they are the article.
   * The renderer now falls back to the headline plus a position so a screen
   * reader is not told the page is empty, but a fallback is a floor, not a fix
   * — the description has to be typed by whoever knows what is in the frame,
   * and the only moment they are looking at the photograph is this one.
   *
   * Deliberately NOT defaulted to the filename: a silent default is
   * indistinguishable from a real description downstream, and it would make
   * every image look described while describing nothing.
   */
  alt: string;
}

function stageLabel(stage: FileStatus): string {
  switch (stage) {
    case 'pending':
      return 'Queued';
    case 'uploading':
      return 'Uploading...';
    case 'generating':
      return 'Generating variants...';
    case 'smart-cropping':
      return 'Smart cropping...';
    case 'done':
      return 'Done';
    case 'error':
      return 'Failed';
    default:
      return '';
  }
}

export function BulkUploadDialog({
  open,
  onOpenChange,
  onComplete,
  articleSlug,
  articleId,
}: BulkUploadDialogProps) {
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFiles((prev) => {
      prev.forEach((f) => {
        if (f.preview) URL.revokeObjectURL(f.preview);
      });
      return [];
    });
    setIsUploading(false);
    setIsDone(false);
    setValidationError(null);
  }, []);

  const handleClose = useCallback(
    (isOpen: boolean) => {
      if (isUploading) return; // Prevent closing during upload
      if (!isOpen) {
        reset();
      }
      onOpenChange(isOpen);
    },
    [isUploading, reset, onOpenChange],
  );

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      setValidationError(null);
      const fileArray = Array.from(newFiles);
      const totalCount = files.length + fileArray.length;

      if (totalCount > MAX_FILES) {
        setValidationError(`Maximum ${MAX_FILES} files per upload`);
        return;
      }

      const entries: FileEntry[] = [];
      for (const file of fileArray) {
        if (!ACCEPTED_TYPES.includes(file.type)) {
          continue; // Skip invalid types silently
        }
        if (file.size > MAX_FILE_SIZE) {
          entries.push({
            file,
            preview: '',
            status: 'error',
            progress: 0,
            error: 'File too large. Maximum 10MB',
            alt: '',
          });
          continue;
        }
        entries.push({
          file,
          preview: URL.createObjectURL(file),
          status: 'pending',
          progress: 0,
          alt: '',
        });
      }

      setFiles((prev) => [...prev, ...entries]);
    },
    [files.length],
  );

  const setAlt = useCallback((index: number, alt: string) => {
    setFiles((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], alt };
      return next;
    });
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => {
      const next = [...prev];
      if (next[index].preview) URL.revokeObjectURL(next[index].preview);
      next.splice(index, 1);
      return next;
    });
  }, []);

  const handleUpload = useCallback(async () => {
    const uploadableFiles = files.filter((f) => f.status === 'pending');
    if (uploadableFiles.length === 0) return;

    // A message, not a silent default. The button stays live so the reason is
    // readable rather than inferred from a control that does nothing.
    const missingAlt = uploadableFiles.filter((f) => !hasVisibleText(f.alt)).length;
    if (missingAlt > 0) {
      setValidationError(
        missingAlt === 1
          ? 'One image still needs alt text. Describe what is in the photo before uploading.'
          : `${missingAlt} images still need alt text. Describe what is in each photo before uploading.`,
      );
      return;
    }
    setValidationError(null);

    trackFiles(uploadableFiles.length);
    setIsUploading(true);

    // Map file indices from uploadableFiles back to files array indices
    const indexMap: number[] = [];
    files.forEach((f, i) => {
      if (f.status === 'pending') indexMap.push(i);
    });

    await uploadInspireBulk(
      uploadableFiles.map((f) => f.file),
      {
        slug: articleSlug,
        articleId,
        concurrency: 3,
        alts: uploadableFiles.map((f) => f.alt.trim()),
        onFileProgress: (fileIndex, stage, progress) => {
          const realIndex = indexMap[fileIndex];
          setFiles((prev) => {
            const next = [...prev];
            next[realIndex] = {
              ...next[realIndex],
              status: stage as FileStatus,
              progress,
            };
            return next;
          });
        },
        onFileComplete: (fileIndex) => {
          const realIndex = indexMap[fileIndex];
          markCompleted();
          setFiles((prev) => {
            const next = [...prev];
            next[realIndex] = { ...next[realIndex], status: 'done', progress: 100 };
            return next;
          });
        },
        onFileError: (fileIndex, error) => {
          const realIndex = indexMap[fileIndex];
          markFailed();
          setFiles((prev) => {
            const next = [...prev];
            next[realIndex] = {
              ...next[realIndex],
              status: 'error',
              error: error.message,
            };
            return next;
          });
        },
      },
    );

    setIsUploading(false);
    setIsDone(true);
  }, [files, articleSlug, articleId]);

  const missingAltCount = files.filter(
    (f) => f.status === 'pending' && !hasVisibleText(f.alt),
  ).length;
  const succeededCount = files.filter((f) => f.status === 'done').length;
  const failedCount = files.filter((f) => f.status === 'error').length;
  const pendingCount = files.filter((f) => f.status === 'pending').length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="flex max-h-[85vh] flex-col sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Upload Images</DialogTitle>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto">
          {/* Drop zone (visible when no files or not uploading) */}
          {!isUploading && !isDone && (
            <button
              type="button"
              className={cn(
                'flex w-full cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-8 transition-colors',
                isDragging
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-muted-foreground/50 hover:bg-muted/50',
              )}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                addFiles(e.dataTransfer.files);
              }}
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="text-muted-foreground size-8" />
              <div className="text-center">
                <p className="text-sm font-medium">Drop images here or click to browse</p>
                <p className="text-muted-foreground mt-1 text-xs">
                  JPEG, PNG, WebP, AVIF. Max 10MB each. Up to {MAX_FILES} files.
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  Every image needs alt text before it can be uploaded.
                </p>
              </div>
            </button>
          )}

          {validationError && (
            <div className="text-destructive bg-destructive/10 flex items-center gap-2 rounded-md p-3 text-sm">
              <AlertCircle className="size-4 shrink-0" />
              {validationError}
            </div>
          )}

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-2">
              {!isDone && !isUploading && (
                <p className="text-muted-foreground text-sm">
                  {files.length} file{files.length === 1 ? '' : 's'} selected
                  {missingAltCount > 0 && ` · ${missingAltCount} still need alt text`}
                </p>
              )}

              {isDone && (
                <div className="bg-muted rounded-md p-3 text-sm">
                  {failedCount === 0
                    ? `All ${succeededCount} images uploaded successfully.`
                    : `${succeededCount} of ${succeededCount + failedCount} uploaded. ${failedCount} failed.`}
                </div>
              )}

              <div className="max-h-[40vh] space-y-1.5 overflow-y-auto">
                {files.map((entry, index) => (
                  <div key={index} className="flex items-start gap-3 rounded-md border p-2 text-sm">
                    {/* Thumbnail */}
                    <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded">
                      {entry.preview ? (
                        <img src={entry.preview} alt="" className="size-full object-cover" />
                      ) : (
                        <div className="flex size-full items-center justify-center">
                          <ImageIcon className="text-muted-foreground size-5" />
                        </div>
                      )}
                    </div>

                    {/* Info */}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{entry.file.name}</p>
                      <div className="flex items-center gap-2">
                        <span
                          className={cn(
                            'text-[10px]',
                            entry.status === 'done' && 'text-success',
                            entry.status === 'error' && 'text-destructive',
                            entry.status !== 'done' &&
                              entry.status !== 'error' &&
                              entry.status !== 'pending' &&
                              'text-primary',
                          )}
                        >
                          {stageLabel(entry.status)}
                        </span>
                        {entry.error && (
                          <span className="text-destructive truncate text-[10px]">
                            {entry.error}
                          </span>
                        )}
                      </div>
                      {entry.status !== 'pending' &&
                        entry.status !== 'done' &&
                        entry.status !== 'error' && (
                          <Progress value={entry.progress} className="mt-1 h-1" />
                        )}
                      {entry.status === 'pending' && !isUploading && (
                        <div className="mt-1.5">
                          <Input
                            value={entry.alt}
                            onChange={(e) => setAlt(index, e.target.value)}
                            placeholder="Alt text — what is in this photo?"
                            aria-label={`Alt text for ${entry.file.name}`}
                            maxLength={MAX_ALT_LENGTH}
                            aria-invalid={!hasVisibleText(entry.alt)}
                            className={cn(
                              'h-8 text-xs',
                              !hasVisibleText(entry.alt) && 'border-destructive',
                            )}
                          />
                        </div>
                      )}
                    </div>

                    {/* Status icon / remove */}
                    {entry.status === 'done' ? (
                      <Check className="text-success size-4 shrink-0" />
                    ) : entry.status === 'error' ? (
                      <AlertCircle className="text-destructive size-4 shrink-0" />
                    ) : isUploading && entry.status !== 'pending' ? (
                      <Loader2 className="text-muted-foreground size-4 shrink-0 animate-spin" />
                    ) : !isUploading ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-7 shrink-0 p-0"
                        onClick={() => removeFile(index)}
                      >
                        <X className="size-3.5" />
                      </Button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 border-t pt-2">
          {isDone ? (
            <Button onClick={onComplete}>Done</Button>
          ) : (
            <>
              <Button variant="quiet" onClick={() => handleClose(false)} disabled={isUploading}>
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={isUploading || pendingCount === 0}
                className="gap-1.5"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="size-4" />
                    Upload {pendingCount > 0 ? `(${pendingCount})` : ''}
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/avif"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
