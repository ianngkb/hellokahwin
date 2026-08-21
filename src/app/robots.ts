import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  const disallow = [
    '/admin/',
    '/login',
    '/no-access',
    '/sso-callback',
    // Unpublished article drafts shared for review — they must never enter the
    // index ahead of the real article at /artikel/…
    '/draft/',
  ];

  return {
    rules: [
      // Explicit Googlebot rule — defensive duplicate of the wildcard below
      // so Search Console diagnostics never show ambiguity about Google's
      // crawl access. Googlebot would also match the `*` rule, but a named
      // rule wins and removes any doubt during indexing audits.
      {
        userAgent: 'Googlebot',
        allow: '/',
        disallow,
      },
      {
        userAgent: '*',
        allow: '/',
        disallow,
      },
    ],
    // Only sitemaps that exist — advertising a missing one is a permanent
    // Search Console error.
    sitemap: [`${baseUrl}/sitemap.xml`],
  };
}
