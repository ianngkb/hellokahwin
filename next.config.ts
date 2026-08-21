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

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ''} https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${r2CspHosts.join(' ')} https://hellokahwin.com https://*.clerk.com https://img.clerk.com`,
  `connect-src 'self'${isDev ? ' ws://localhost:*' : ''} https://*.r2.cloudflarestorage.com https://*.clerk.accounts.dev https://*.clerk.com`,
  "font-src 'self' data:",
  `media-src 'self' ${r2CspHosts.join(' ')}`,
  "frame-src 'self' https://challenges.cloudflare.com",
  "worker-src 'self' blob:",
  "child-src 'self' blob:",
  "frame-ancestors 'none'",
].join('; ');

const nextConfig: NextConfig = {
  // Type-checking runs separately via `pnpm typecheck` (tsconfig.typecheck.json),
  // keeping the full tsc pass off the build critical path — same setup as twn-new.
  typescript: { ignoreBuildErrors: true },
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
            key: 'Cache-Control',
            value: 'public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
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
