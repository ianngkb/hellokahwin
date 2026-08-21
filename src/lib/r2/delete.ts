import { DeleteObjectsCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getR2Client, getR2Bucket, getR2AdsBucket } from './client';

/**
 * Delete multiple R2 objects from the inspire bucket.
 * Silently ignores keys that don't exist.
 */
export async function deleteR2Objects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: getR2Bucket(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

/**
 * Delete multiple R2 objects from the ads bucket.
 * Silently ignores keys that don't exist.
 */
export async function deleteR2AdsObjects(keys: string[]): Promise<void> {
  if (keys.length === 0) return;

  await getR2Client().send(
    new DeleteObjectsCommand({
      Bucket: getR2AdsBucket(),
      Delete: { Objects: keys.map((Key) => ({ Key })) },
    }),
  );
}

/**
 * List all R2 object keys under a prefix, then batch-delete them.
 * Uses paginated listing to handle any number of objects.
 */
export async function listAndDeleteR2Prefix(bucket: string, prefix: string): Promise<number> {
  const client = getR2Client();
  const allKeys: string[] = [];

  let continuationToken: string | undefined;
  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      }),
    );

    if (response.Contents) {
      for (const obj of response.Contents) {
        if (obj.Key) allKeys.push(obj.Key);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  if (allKeys.length === 0) return 0;

  const BATCH_SIZE = 1000;
  for (let i = 0; i < allKeys.length; i += BATCH_SIZE) {
    const batch = allKeys.slice(i, i + BATCH_SIZE);
    await client.send(
      new DeleteObjectsCommand({
        Bucket: bucket,
        Delete: { Objects: batch.map((Key) => ({ Key })), Quiet: true },
      }),
    );
  }

  return allKeys.length;
}
