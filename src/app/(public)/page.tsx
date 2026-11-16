import type { Metadata } from 'next';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { bottomCategoryPills, FeaturedHub } from '@/components/inspire/featured-hub';
import { getPublicSiteHomepageResolvedData } from '@/lib/inspire/homepage-queries';
import { HOMEPAGE_SURFACES } from '@/lib/inspire/homepage-curation';
import '@/design-system/tokens.css';
import '@/design-system/components.css';

// ISR — same cadence as the artikel hub.
export const revalidate = 1800;

export const metadata: Metadata = {
  title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet — semuanya dalam Bahasa Melayu.',
  alternates: { canonical: '/' },
  openGraph: {
    title: 'HelloKahwin — Idea & Panduan Perkahwinan Malaysia',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan Malaysia. Rancang majlis impian anda mengikut bajet.',
    type: 'website',
    // Ahrefs requires all four of og:title, og:type, og:image and og:url, and
    // the homepage was serving two. `url` is relative on purpose: the root
    // layout sets `metadataBase`, so Next resolves it to the apex. The image is
    // the site default — the same asset the category and tag routes declare;
    // there is no dedicated 1200x630 OG artwork in `public/` yet.
    url: '/',
    images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
  },
};

/**
 * Home = the article directory front door, laid out like The Wedding
 * Notebook's /inspire (Ian, 17 Nov 2026): a 3-story featured photo mosaic, a
 * "Terkini" card grid and category pills — the same `FeaturedHub` /artikel
 * draws, so the two pages read as one site.
 *
 * What leads it is curated at /admin/inspire/homepage → "Laman utama (/)", a
 * SEPARATE arrangement from /artikel's (`site_homepage` in `admin_settings`).
 * With nothing saved it is simply the newest articles with a cover. A
 * curation that cannot be read (e.g. the preview build's read-only DB role)
 * falls back to that automatic layout rather than failing the page.
 *
 * This replaced the Editorial Monotone lead plate + "Terkini" list rows
 * (DES-03 H6 ranking, `selectHomeSet` / `HomeHero`). Those modules are kept,
 * with their tests, for the record; nothing on this page calls them now.
 *
 * ⚠️ The cache key scopes the Vercel Data Cache ACROSS deployments. The old
 * page cached a different shape under `home-*`; bump `site-home-v1` whenever
 * the shape of `getInspireHomepageResolvedData()` changes.
 */
const { cacheTag } = HOMEPAGE_SURFACES.home;
const getHomeData = unstable_cache(getPublicSiteHomepageResolvedData, ['site-home-v1'], {
  revalidate: 600,
  // `revalidatePath('/')` does not evict an `unstable_cache` entry — only a tag
  // does. The curation save for "Laman utama" purges this tag.
  tags: [cacheTag, 'articles', 'inspire-categories'],
});

export default async function HomePage() {
  const { resolution, allCategories } = await getHomeData();
  const featured = resolution.featured.map(({ article }) => article);
  const latest = resolution.latest.map(({ article }) => article);
  const categories = bottomCategoryPills(allCategories);

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://hellokahwin.com';

  return (
    <div className="inspire-editorial">
      {/* DES-09 G18: "Homepage and /artikel emit Organization + WebSite". */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
              {
                '@type': 'Organization',
                name: 'HelloKahwin',
                url: baseUrl,
                logo: `${baseUrl}/hellokahwin-logo.png`,
              },
              { '@type': 'WebSite', name: 'HelloKahwin', url: baseUrl, inLanguage: 'ms' },
            ],
          }).replace(/</g, '\\u003c'),
        }}
      />
      {/* The featured mosaic leads the page above the fold, so the page's one
          h1 is screen-reader only, exactly as on /artikel and TWN /inspire. */}
      <h1 className="sr-only">HelloKahwin — Idea & Panduan Perkahwinan Malaysia</h1>

      <FeaturedHub
        featured={featured}
        latest={latest}
        categories={categories}
        /* Nine stories fill a 3 x 3 grid; a fourth column would leave one
           orphan card on the last row. */
        latestGridClassName="sm:grid-cols-2 lg:grid-cols-3"
        afterLatest={
          <div className="pt-10 text-center">
            <Link href="/artikel" className="s-btn" style={{ display: 'inline-flex' }}>
              Lihat semua artikel
            </Link>
          </div>
        }
      />
    </div>
  );
}
