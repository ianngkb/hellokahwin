import { NextResponse, type NextRequest } from 'next/server';
import { lookupLegacyImageRedirect } from '@/lib/services/legacy-image-redirects';

/**
 * Legacy WordPress media paths (/wp-content/uploads/...) — 301 to the R2 copy
 * when the importer has mapped the URL (legacy_image_redirects, keyed by
 * `wp_url`), 404 otherwise. Image fetchers get the image; a browser deep-link
 * gets the article the image lives in.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const wpPath = `/wp-content/${path.join('/')}`;

  const hit = await lookupLegacyImageRedirect(wpPath);
  if (!hit) return new NextResponse(null, { status: 404 });

  const accept = request.headers.get('accept') ?? '';
  const wantsHtml = accept.includes('text/html');
  const target = wantsHtml ? hit.articleDestinationUrl : hit.imageDestinationUrl;

  const res = NextResponse.redirect(new URL(target, request.url), 301);
  // Cache the redirect decision at the CDN, not in browsers — the mapping can
  // be corrected by a re-import.
  res.headers.set('Cache-Control', 'public, max-age=0, s-maxage=86400');
  // REQUIRED because the target varies on Accept (HTML → article, otherwise →
  // image). Without it the first requester poisons the shared cache entry for
  // 24h: one browser deep-link and every <img> of that path 301s to an HTML
  // page, breaking the image everywhere.
  res.headers.set('Vary', 'Accept');
  return res;
}
