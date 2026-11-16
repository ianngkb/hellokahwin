import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import { OpenSearchOnCariHash } from '@/components/inspire/inspire-article-search';
import { bottomCategoryPills, FeaturedHub } from '@/components/inspire/featured-hub';
import { getPublicInspireHomepageResolvedData } from '@/lib/inspire/homepage-queries';
import { INSPIRE_HOMEPAGE_CACHE_TAG } from '@/lib/inspire/homepage-curation';

// ISR: getInspireHomeData() is unstable_cache-wrapped, but the page itself
// inherited dynamic rendering from the layout's currentUser() call (now removed).
// 30-min revalidate matches c1c91fc's baseline window for inspire pages.
export const revalidate = 1800;

export const metadata: Metadata = {
  // Brand omitted — root layout's title.template appends it once (was doubled).
  title: 'Artikel',
  description:
    'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
  alternates: { canonical: '/artikel' },
  openGraph: {
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
    type: 'website',
    // The fourth tag Ahrefs requires, and the one this route was missing while
    // the homepage and the category hubs were being fixed. Relative on purpose:
    // `metadataBase` in the root layout resolves it, and it matches the
    // `alternates.canonical` above rather than restating a host.
    url: '/artikel',
    images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
  },
  twitter: {
    card: 'summary',
    title: 'Artikel | HelloKahwin',
    description:
      'Idea, tips dan panduan perkahwinan untuk pasangan di Malaysia: perancangan dan bajet, hantaran, venue, busana, dan hari akad itu sendiri.',
    images: ['/hellokahwin-logo.png'],
  },
};

// Layout ported from The Wedding Notebook's /inspire (Nov 2026): a 3-story
// featured grid with overlaid headlines, a "Terkini" grid, and category pills
// at the foot. What leads the page is now curated at /admin/inspire/homepage
// (pins + newest-or-category auto-fill, stored in `admin_settings`); with
// nothing saved it is simply the newest articles with a cover.
//
// ⚠️ The cache key is NOT cosmetic. The Vercel Data Cache persists an
// `unstable_cache` entry ACROSS deployments and the key is the only thing that
// scopes it. The returned shape changed completely from `inspire-home-v2`
// (flat `latestArticles` → `resolution`), so reusing the old key would hand
// the first readers after deploy an object this page cannot read. Bump it
// again whenever the shape of `getInspireHomepageResolvedData()` changes.
const getInspireHomeData = unstable_cache(
  getPublicInspireHomepageResolvedData,
  ['artikel-home-v3'],
  {
    revalidate: 600,
    // `revalidatePath('/artikel')` does not evict an `unstable_cache` entry —
    // only a tag does. The curation save purges INSPIRE_HOMEPAGE_CACHE_TAG.
    tags: [INSPIRE_HOMEPAGE_CACHE_TAG, 'articles', 'inspire-categories'],
  },
);

export default async function InspireHomePage() {
  const { resolution, allCategories } = await getInspireHomeData();
  const featured = resolution.featured.map(({ article }) => article);
  const latest = resolution.latest.map(({ article }) => article);

  // twn's pill rule, exactly (Ian, 15 Nov 2026: "exactly like TWN", knowing it
  // yields only a few pills against HelloKahwin's taxonomy).
  const bottomCategories = bottomCategoryPills(allCategories);

  return (
    <div className="inspire-editorial">
      {/* The visible "Artikel · N artikel" row was removed to lift the featured
          cover above the fold. Keep an sr-only h1 so this hub still has a
          top-level heading for the document outline and for SEO — without it the
          page would start at h2. */}
      <h1 className="sr-only">Artikel Perkahwinan HelloKahwin</h1>

      <FeaturedHub
        featured={featured}
        latest={latest}
        categories={bottomCategories}
        afterFeatured={
          /* twn places its above-grid banner here; banners are out of scope, so
             nothing renders. Search lives in the header on every page. Old
             `/artikel#cari` links still open the search screen. */
          <OpenSearchOnCariHash />
        }
      />
    </div>
  );
}
