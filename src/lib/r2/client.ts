import { S3Client } from '@aws-sdk/client-s3';

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (!_client) {
    const accountId = process.env.R2_ACCOUNT_ID;
    if (!accountId) throw new Error('R2_ACCOUNT_ID env var is not set');

    _client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return _client;
}

// --- Inspire bucket (existing) ---

export function getR2Bucket(): string {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BUCKET_NAME env var is not set');
  return bucket;
}

export function getR2PublicUrl(): string {
  const url = process.env.R2_PUBLIC_URL;
  if (!url) throw new Error('R2_PUBLIC_URL env var is not set');
  return url;
}

// --- Assets bucket (public: listings, avatars) ---

export function getR2AssetsBucket(): string {
  const bucket = process.env.R2_ASSETS_BUCKET_NAME;
  if (!bucket) throw new Error('R2_ASSETS_BUCKET_NAME env var is not set');
  return bucket;
}

export function getR2AssetsPublicUrl(): string {
  const url = process.env.R2_ASSETS_PUBLIC_URL;
  if (!url) throw new Error('R2_ASSETS_PUBLIC_URL env var is not set');
  return url;
}

// --- Galleries bucket (public: real-wedding gallery photos) ---

export function getR2GalleriesBucket(): string {
  const bucket = process.env.R2_GALLERIES_BUCKET_NAME;
  if (!bucket) throw new Error('R2_GALLERIES_BUCKET_NAME env var is not set');
  return bucket;
}

export function getR2GalleriesPublicUrl(): string {
  const url = process.env.R2_GALLERIES_PUBLIC_URL;
  if (!url) throw new Error('R2_GALLERIES_PUBLIC_URL env var is not set');
  return url;
}

// Every R2 public host an image URL may have been stored under — the current
// env-configured hosts. We persist full absolute URLs, so extractKeyFromUrl
// must recognize any host a stored URL may carry.
const KNOWN_R2_PUBLIC_URL_BASES = [
  process.env.R2_PUBLIC_URL,
  process.env.R2_ASSETS_PUBLIC_URL,
]
  .filter((u): u is string => Boolean(u))
  .map((u) => u.replace(/\/+$/, ''));

export function extractKeyFromUrl(fullUrl: string): string {
  // Stored crop URLs carry a `?v=<focal point>` cache-bust token, which is not
  // part of the R2 key — leaving it on would make every GET/DELETE miss.
  const [urlWithoutQuery] = fullUrl.split(/[?#]/, 1);

  for (const base of KNOWN_R2_PUBLIC_URL_BASES) {
    if (urlWithoutQuery.startsWith(base + '/')) {
      return urlWithoutQuery.slice(base.length + 1);
    }
  }
  return urlWithoutQuery;
}

// --- Ads bucket (public: banner advertisements) ---

export function getR2AdsBucket(): string {
  const bucket = process.env.R2_ADS_BUCKET_NAME;
  if (!bucket) throw new Error('R2_ADS_BUCKET_NAME env var is not set');
  return bucket;
}

export function getR2AdsPublicUrl(): string {
  const url = process.env.R2_ADS_PUBLIC_URL;
  if (!url) throw new Error('R2_ADS_PUBLIC_URL env var is not set');
  return url;
}

// --- Documents bucket (private: brochures, PDFs, menus) ---

export function getR2DocumentsBucket(): string {
  const bucket = process.env.R2_DOCUMENTS_BUCKET_NAME;
  if (!bucket) throw new Error('R2_DOCUMENTS_BUCKET_NAME env var is not set');
  return bucket;
}

// --- Backup bucket (private: DB dumps + asset mirror) ---
// The backup bucket MAY live in a separate Cloudflare account from the primary
// client for account-level isolation (a suspension/credential leak on the main
// account must not take the backups with it). When the R2_BACKUP_* credentials
// are not set, this falls back to the primary account so local/dev still works.

let _backupClient: S3Client | null = null;

export function getR2BackupClient(): S3Client {
  if (!_backupClient) {
    // Validate all three together so a partial backup-account config doesn't
    // silently fall back to a mismatched account (which would presign fine but
    // 403 on fetch). When none of R2_BACKUP_* are set, this falls back wholly
    // to the primary account so local/dev still works.
    const accountId = process.env.R2_BACKUP_ACCOUNT_ID ?? process.env.R2_ACCOUNT_ID;
    const accessKeyId = process.env.R2_BACKUP_ACCESS_KEY_ID ?? process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.R2_BACKUP_SECRET_ACCESS_KEY ?? process.env.R2_SECRET_ACCESS_KEY;
    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('R2 backup credentials are not fully configured (R2_BACKUP_* / R2_*)');
    }

    _backupClient = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return _backupClient;
}

export function getR2BackupBucket(): string {
  const bucket = process.env.R2_BACKUP_BUCKET_NAME;
  if (!bucket) throw new Error('R2_BACKUP_BUCKET_NAME env var is not set');
  return bucket;
}
