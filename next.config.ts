import type { NextConfig } from 'next';

// Extract R2 hostnames from env vars (build-time only, avoids wildcard *.r2.dev)
const r2Hostnames: string[] = [];
for (const envVar of ['R2_PUBLIC_URL', 'R2_ASSETS_PUBLIC_URL']) {
  const url = process.env[envVar];
  if (url) {
    try {
      r2Hostnames.push(`https://${new URL(url).hostname}`);
    } catch {
      /* skip invalid URLs */
    }
  }
}
const r2CspHosts = r2Hostnames.filter((v, i, arr) => arr.indexOf(v) === i);

const isDev = process.env.NODE_ENV === 'development';

// Clerk's Frontend API host.
//
// A DEVELOPMENT instance serves from `*.clerk.accounts.dev`, which the
// wildcard below already covers. A PRODUCTION instance serves clerk-js, the
// UI bundle and every API call from a CNAME on the customer's own domain
// (here: clerk.hellokahwin.com) — a host no wildcard in this policy matches,
// so with a pk_live_ key the sign-in page loads a blank screen and the only
// clue is a CSP violation in the console. Verified 2026-08-22.
//
// The host is encoded in the publishable key: `pk_live_` + base64("<host>$").
// Deriving it here keeps the policy correct across instance swaps without a
// second env var to forget.
function clerkFrontendApiHost(): string | null {
  const key = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
  if (!key) return null;
  const encoded = key.replace(/^pk_(live|test)_/, '');
  if (encoded === key) return null;
  try {
    const host = Buffer.from(encoded, 'base64').toString('utf8').replace(/\$+$/, '');
    // Guard against a malformed key turning into a CSP-breaking string.
    return /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(host) ? host : null;
  } catch {
    return null;
  }
}

const clerkHost = clerkFrontendApiHost();

// Script/XHR surface: clerk-js and the UI bundle load from the instance's
// Frontend API, and Clerk's CDN + telemetry live on *.clerk.com.
const clerkCspHosts = [
  'https://challenges.cloudflare.com',
  'https://*.clerk.accounts.dev',
  'https://*.clerk.com',
  ...(clerkHost ? [`https://${clerkHost}`] : []),
].join(' ');

// Framing surface is deliberately NARROWER than the script surface. Only two
// things are ever framed: the Turnstile challenge, and Clerk's own hosted
// pages (the accounts portal on a dev instance, the Frontend API host on a
// production one). `*.clerk.com` is Clerk's CDN/telemetry origin and has no
// business being frameable by us, so it is not listed here.
const clerkFrameHosts = [
  'https://challenges.cloudflare.com',
  'https://*.clerk.accounts.dev',
  ...(clerkHost ? [`https://${clerkHost}`] : []),
].join(' ');

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} ${clerkCspHosts}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${r2CspHosts.join(' ')} https://hellokahwin.com https://*.clerk.com https://img.clerk.com`,
  `connect-src 'self'${isDev ? ' ws://localhost:*' : ''} https://*.r2.cloudflarestorage.com ${clerkCspHosts}`,
  "font-src 'self' data:",
  `media-src 'self' ${r2CspHosts.join(' ')}`,
  `frame-src 'self' ${clerkFrameHosts}`,
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Type-checking runs separately via `pnpm typecheck` (tsconfig.typecheck.json),
  // keeping the full tsc pass off the build critical path — same setup as twn-new.
  typescript: { ignoreBuildErrors: true },
  // Hand trailing-slash handling to middleware. Next's own normalisation runs in
  // the redirects step, BEFORE middleware, which is what made every legacy
  // permalink cost two redirects: /slug/ →308→ /slug →308→ /artikel/{cat}/{slug}
  // (measured against production 2026-08-23). Middleware can collapse that to
  // one; Next cannot, because it has already answered by the time middleware runs.
  //
  // ⚠️ This removes normalisation EVERYWHERE, not just where it hurt. Anything
  // middleware does not handle now serves at both /x and /x/. src/middleware.ts
  // puts the 308 back for every path except the two it improves — do not delete
  // that branch. Paths excluded by the middleware matcher (_next, static assets,
  // robots.txt, sitemap.xml) are no longer normalised at all; they are
  // non-indexable asset paths, which is why that is acceptable.
  skipTrailingSlashRedirect: true,
  // ── THE STALE WINDOW EVERY PAGE ON THE SITE INHERITS ──────────────────────
  //
  // Next builds its own `Cache-Control` for every cacheable route as
  // `s-maxage=<revalidate>, stale-while-revalidate=<expireTime - revalidate>`
  // (server/lib/cache-control.js). `expireTime` DEFAULTS TO 31536000 — one year
  // — so every article page on this site shipped:
  //
  //     Cache-Control: s-maxage=600, stale-while-revalidate=31535400
  //
  // 31535400 seconds is 365 days of licence to serve a stale copy. Nothing in
  // the app chose that number; it is a framework default nobody had a reason to
  // look at, and it is the widest blast radius on the site — every page, every
  // shared cache downstream of us.
  //
  // What it costs, measured on production 26 Aug 2026 rather than argued:
  // expiring the `articles` tag and putting 12 renders in flight against the
  // 5-wide postgres pool produced 50 SHELLS out of 61 requests — pages carrying
  // the site-default homepage title, no canonical and no og tags, while their
  // H1 and JSON-LD were correct. (The asymmetry is generateMetadata's
  // `withDeadline(..., 1_500)` losing the race and returning `{}`; the page
  // component has the larger budget and renders fine.) Re-requesting the same
  // 50 URLs 6.5 minutes later returned `x-vercel-cache: STALE` on all 50, still
  // serving the shell. Under the default that entry stays servable for a year.
  //
  // ── WHY 3600 ──────────────────────────────────────────────────────────────
  //
  // The window has to be shorter than the interval at which content actually
  // changes, or a reader can be served a copy from before the previous
  // editorial pass. Measured on the production database the same day: of 61
  // published articles, 47 were edited within the last 24 hours and 23 within
  // the last 12 — 24 edits on 25 Aug, 23 on 26 Aug. Content on this site moves
  // in DAILY bursts, several times a day inside a sprint. An hour is already an
  // order of magnitude tighter than that.
  //
  // It also costs nothing real. The Vercel edge is governed separately by the
  // `Vercel-CDN-Cache-Control` rules below (`s-maxage=300,
  // stale-while-revalidate=600` — a 15-minute worst case), so `expireTime` only
  // governs caches BEYOND Vercel. And 3600 still leaves an article page
  // ~3000 seconds of stale-serve, against a cold render measured at p90 6.4s in
  // the storm above: the entire performance point of stale-while-revalidate is
  // intact. What is gone is the year.
  //
  // This is a CEILING, not the mechanism that keeps pages fresh. That is the
  // purge chain an ingest runs — `@/lib/cache/purge`, `@/lib/cache/edge-purge`,
  // `@/lib/seo/gsc-sitemap` — which drops the affected paths in seconds. This
  // number only bounds how wrong things can get when that chain has not run.
  expireTime: 3600,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
          { key: 'Strict-Transport-Security', value: 'max-age=31536000; includeSubDomains' },
          { key: 'Content-Security-Policy', value: csp },
        ],
      },
      {
        source: '/admin/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex' }],
      },
      {
        // Client review links for unpublished article drafts — noindex on the
        // response itself, no HTML parse or robots.txt fetch needed.
        source: '/draft/(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/sitemap.xml',
        headers: [
          {
            // This rule sets `Cache-Control` explicitly, so `expireTime` above
            // does not reach it — the stale window here is whatever this line
            // says. It said 86400: a full day during which the edge may hand
            // Googlebot the sitemap it had yesterday.
            //
            // That is the one page on the site where a stale copy is not a
            // cosmetic problem. The sitemap IS the publishing signal (see
            // `@/lib/seo/gsc-sitemap`): an ingest purges this path and then asks
            // Google to come and read it. If the purge is what fails, a day-wide
            // stale window means Google arrives on our invitation and collects a
            // sitemap without the article we invited it for — and records a
            // `last_downloaded` that moved, so it reads as success everywhere.
            //
            // Capped to an hour, matching `s-maxage` above it: two hours of
            // total life, worst case, with no purge. The purge is still what
            // makes a publish visible in seconds; this bounds the failure.
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=3600',
          },
        ],
      },
      // Public article pages render identical HTML for every visitor — cache at
      // the Vercel edge. Audited: no auth()/currentUser()/cookies() in these
      // render paths (per-user UI does not exist on the public site).
      {
        source: '/artikel/:category',
        headers: [
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      {
        source: '/artikel/:category/:slug',
        headers: [
          {
            key: 'Vercel-CDN-Cache-Control',
            value: 'public, s-maxage=300, stale-while-revalidate=600',
          },
        ],
      },
      // NO `Vercel-Cache-Tag` HERE, and it is worth a line to say why, because
      // this is the obvious place for it. The three rules above create CDN
      // entries an ingest needs to be able to delete, and the only handle
      // Vercel offers is a cache tag — but a tag declared as a header in this
      // file is applied by the routing layer, which the CDN's tag index does
      // not read. It looked correct end to end: the header appeared on the
      // response with `:category` interpolated, and the purge API returned 200.
      // The entry simply never moved. Measured 26 Aug 2026; the transcript is
      // in `src/lib/cache/edge-tag.ts`, which does the job from inside the
      // render instead, where `addCacheTag` actually reaches the CDN.
    ];
  },
  // sharp and gs-wasm load native/wasm assets at runtime — keep them external.
  serverExternalPackages: ['sharp', '@jspawn/ghostscript-wasm'],
  outputFileTracingIncludes: {
    // Must match the ACTUAL route path — the PDF route lives under
    // /api/v1/inspire here, not twn-new's /api/v1/storage. A stale key traces
    // the 16MB gs.wasm into a function that does not exist and PDF
    // compression fails in production with a missing-file error.
    '/api/v1/inspire/compress-pdf': [
      './node_modules/@jspawn/ghostscript-wasm/gs.wasm',
      './node_modules/@jspawn/ghostscript-wasm/gs.js',
      './node_modules/@jspawn/ghostscript-wasm/gs.mjs',
      './node_modules/@jspawn/ghostscript-wasm/browser.js',
    ],
  },
  turbopack: {
    root: __dirname,
  },
  images: {
    // Variants are pre-optimized via Sharp at upload time — skip Vercel image optimization.
    unoptimized: true,
  },
};

export default nextConfig;
