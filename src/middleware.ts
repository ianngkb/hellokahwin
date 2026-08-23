import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse, type NextRequest, type NextFetchEvent } from 'next/server';
import { getPatternRedirect } from '@/lib/redirects/patterns';
import { resolveTrailingSlash } from '@/lib/redirects/trailing-slash';

// Clerk runs ONLY on admin surfaces. Public pages never load or consult Clerk —
// no dev-browser handshake redirects, no auth latency, nothing for the
// (mostly low-end, slow-connection) public audience to pay for. Everything
// that calls `auth()`/`currentUser()` lives under these paths.
const isClerkRoute = createRouteMatcher([
  '/admin(.*)',
  '/login(.*)',
  '/no-access',
  '/api/v1/inspire(.*)',
]);

const withClerk = clerkMiddleware();

export default function middleware(request: NextRequest, event: NextFetchEvent) {
  const { pathname } = request.nextUrl;

  // Trailing slashes FIRST. next.config sets `skipTrailingSlashRedirect`, so
  // Next no longer normalises them and this is the only thing that does — see
  // lib/redirects/trailing-slash.ts for why that trade was worth making.
  // Handling it here is what collapses `/slug/` → `/slug` → `/artikel/…` from
  // two hops to one.
  const slash = resolveTrailingSlash(pathname);
  if (slash.kind === 'redirect') {
    const target = new URL(slash.path, request.url);
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, slash.statusCode);
  }
  if (slash.kind === 'rewrite') {
    const target = new URL(slash.path, request.url);
    target.search = request.nextUrl.search;
    return NextResponse.rewrite(target);
  }

  // Pattern redirects (pure, no DB): legacy WordPress URL shapes
  // (/category/x, /tag/x, /feed, date archives…) 301 at the edge. Exact-match
  // redirects from the `redirects` table are handled in the route layer.
  const pattern = getPatternRedirect(pathname);
  if (pattern) {
    const target = new URL(pattern.destinationPath, request.url);
    // Preserve query params (UTM etc.) across the redirect.
    target.search = request.nextUrl.search;
    return NextResponse.redirect(target, pattern.statusCode);
  }

  if (isClerkRoute(request)) {
    return withClerk(request, event);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Run on everything except Next internals and static assets.
    '/((?!_next|favicon\\.ico|favicon\\.png|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|css|js|woff2?)$).*)',
  ],
};
