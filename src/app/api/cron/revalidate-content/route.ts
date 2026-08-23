import { NextResponse, type NextRequest } from 'next/server';
import { revalidateTag } from 'next/cache';

/**
 * Drop the content caches. Bearer-authenticated with `CRON_SECRET`, exactly
 * like the scheduled-publish worker next door.
 *
 * WHY THIS EXISTS. The public read layer caches with `revalidate: false` —
 * forever — and relies entirely on `revalidateTag` being called from the admin
 * write paths (see `admin/inspire/actions.ts`). The ingest CLI writes to the
 * database DIRECTLY, from outside the running app, so none of those write paths
 * fire. Without this route an ingested article would be in the database and
 * invisible on the site: no pillar-page entry, no sitemap row, no article page,
 * indefinitely.
 *
 * Caught in review before it could bite. It is the difference between an ingest
 * path that works and one that appears to work.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // The two tags the whole inspire read layer is keyed on. 'max' matches what
  // the admin actions pass, so a CLI write and an editor save invalidate
  // identically — one cache-invalidation behaviour, not two.
  revalidateTag('articles', 'max');
  revalidateTag('inspire-categories', 'max');

  return NextResponse.json({ revalidated: ['articles', 'inspire-categories'] });
}
