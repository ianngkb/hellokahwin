import { type NextRequest } from 'next/server';
import { eq } from 'drizzle-orm';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getR2Client, getR2Bucket, getR2PublicUrl } from '@/lib/r2/client';
import { requireRole } from '@/lib/api/middleware';
import { apiSuccess, apiError } from '@/lib/api/response';
import { ApiError } from '@/lib/api/errors';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB (images)
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB (article PDF attachments)
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];
const ALLOWED_TYPES = [...ALLOWED_IMAGE_TYPES, 'application/pdf'];
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_RE = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,199}$/;

export async function POST(request: NextRequest) {
  try {
    await requireRole(request, ['admin']);

    const body = await request.json();
    const {
      articleId,
      slug: providedSlug,
      fileName,
      contentType,
      fileSize,
    } = body as {
      articleId?: string;
      slug?: string;
      fileName: string;
      contentType: string;
      fileSize: number;
    };

    if (!fileName || !contentType) {
      return apiError('Missing required fields: fileName, contentType', 400);
    }

    if (!ALLOWED_TYPES.includes(contentType)) {
      return apiError('Invalid file type. Allowed: JPEG, PNG, WebP, AVIF, PDF', 400);
    }

    if (typeof fileSize !== 'number' || fileSize <= 0) {
      return apiError('fileSize is required and must be a positive number', 400);
    }

    const isPdf = contentType === 'application/pdf';
    const maxSize = isPdf ? MAX_PDF_SIZE : MAX_FILE_SIZE;
    if (fileSize > maxSize) {
      return apiError(isPdf ? 'File too large. Maximum 25MB' : 'File too large. Maximum 10MB', 400);
    }

    // Determine the R2 path prefix
    let pathPrefix: string;
    let resolvedSlug: string | undefined;

    if (providedSlug && SLUG_RE.test(providedSlug)) {
      // Slug provided directly
      pathPrefix = `inspire/${providedSlug}`;
      resolvedSlug = providedSlug;
    } else if (articleId && UUID_RE.test(articleId)) {
      // UUID provided — look up article slug
      const [article] = await db
        .select({ slug: articles.slug })
        .from(articles)
        .where(eq(articles.id, articleId))
        .limit(1);

      if (article?.slug) {
        pathPrefix = `inspire/${article.slug}`;
        resolvedSlug = article.slug;
      } else {
        // Fallback to UUID if article not found
        pathPrefix = `inspire/${articleId}`;
      }
    } else {
      // Library upload — no article context
      pathPrefix = 'inspire/general';
    }

    const sanitized = fileName.replace(/[^a-zA-Z0-9.-]/g, '_').replace(/\.[^.]+$/, '') || 'file';
    const ext = isPdf
      ? 'pdf'
      : contentType === 'image/webp'
        ? 'webp'
        : contentType === 'image/avif'
          ? 'avif'
          : contentType === 'image/png'
            ? 'png'
            : 'jpg';
    const key = `${pathPrefix}/${Date.now()}-${sanitized}/original.${ext}`;

    const command = new PutObjectCommand({
      Bucket: getR2Bucket(),
      Key: key,
      ContentType: contentType,
      ContentLength: fileSize,
    });

    const uploadUrl = await getSignedUrl(getR2Client(), command, { expiresIn: 600 });
    const publicUrl = `${getR2PublicUrl()}/${key}`;

    return apiSuccess({ uploadUrl, publicUrl, key, slug: resolvedSlug });
  } catch (error) {
    if (error instanceof ApiError) {
      return apiError(error.message, error.statusCode);
    }
    console.error('POST /api/v1/inspire/upload error:', error);
    return apiError('Internal server error', 500);
  }
}
