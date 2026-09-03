import { uploadInspireImage } from './inspire-upload';
import type { InspireUploadResult } from './inspire-upload';
import type { UploadStage } from './upload';

export interface BulkUploadOptions {
  slug?: string;
  articleId?: string;
  concurrency?: number;
  /**
   * Alt text per file, positionally aligned with `files`. The upload dialog
   * will not submit until every entry has one; a missing entry here is not
   * silently defaulted, it simply leaves the media row's alt null.
   */
  alts?: string[];
  onFileProgress?: (fileIndex: number, stage: UploadStage, progress: number) => void;
  onFileComplete?: (fileIndex: number, result: InspireUploadResult) => void;
  onFileError?: (fileIndex: number, error: Error) => void;
}

export interface BulkUploadResult {
  succeeded: (InspireUploadResult & { fileIndex: number })[];
  failed: { index: number; filename: string; error: string }[];
}

export async function uploadInspireBulk(
  files: File[],
  options: BulkUploadOptions = {},
): Promise<BulkUploadResult> {
  const concurrency = options.concurrency ?? 3;
  const succeeded: BulkUploadResult['succeeded'] = [];
  const failed: BulkUploadResult['failed'] = [];

  let nextIndex = 0;

  async function processNext(): Promise<void> {
    while (nextIndex < files.length) {
      const currentIndex = nextIndex++;
      const file = files[currentIndex];

      try {
        const result = await uploadInspireImage(
          { slug: options.slug, articleId: options.articleId, alt: options.alts?.[currentIndex] },
          file,
          (stage, progress) => {
            options.onFileProgress?.(currentIndex, stage, progress);
          },
        );

        succeeded.push({ ...result, fileIndex: currentIndex });
        options.onFileComplete?.(currentIndex, result);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Upload failed');
        failed.push({
          index: currentIndex,
          filename: file.name,
          error: error.message,
        });
        options.onFileError?.(currentIndex, error);
      }
    }
  }

  // Start concurrent workers
  const workers = Array.from({ length: Math.min(concurrency, files.length) }, () => processNext());

  await Promise.all(workers);

  return { succeeded, failed };
}
