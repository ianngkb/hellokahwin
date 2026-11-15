import Link from 'next/link';
import { getMastheadCategories } from '@/lib/services/inspire-nav';
import { type MenuCategory } from '@/components/inspire/inspire-nav-menu';
import { withDeadline } from '@/lib/api/timeout';
import { SiteWordmark } from '@/components/brand/site-wordmark';
import { SearchTrigger } from '@/components/search/search-trigger';

const linkClass = 'text-plum-deep-muted text-sm transition-colors hover:text-white';
const headingClass =
  'text-plum-deep-accent mb-3 text-[10px] font-semibold tracking-[0.14em] uppercase';

/**
 * Public footer — a port of twn-new's footer layout: dark band, brand column
 * plus three link columns (2-up on phones, 4-up from `md`), copyright below.
 *
 * Colours are HelloKahwin's tokens: `--plum-deep` resolves to the
 * `.hk-public` ink, so the band is HelloKahwin's dark, not TWN's plum. TWN's
 * gold column headings use `--brass`, which `.hk-public` neutralises to ink
 * (invisible on this band), so headings use `--plum-deep-accent` — the token
 * defined for secondary text on this surface.
 *
 * Not ported: social icons (HelloKahwin has no confirmed accounts), the
 * newsletter row (no subscription backend here), vendor/login links (no
 * accounts).
 *
 * Soft-fails like the navbar: without categories the "Topik" column simply
 * is not rendered.
 */
export async function Footer() {
  let categories: MenuCategory[] = [];
  try {
    categories = await withDeadline(getMastheadCategories(), 3000, 'footer-categories');
  } catch (err) {
    console.error('[footer] categories unavailable:', err);
  }
  // Only real category pages — admin-managed custom links (`url`) stay in the navbar.
  const topics = categories.filter((c) => !c.url).slice(0, 8);
  const firstHalf = topics.slice(0, Math.ceil(topics.length / 2));
  const secondHalf = topics.slice(Math.ceil(topics.length / 2));

  return (
    <footer className="bg-plum-deep text-plum-deep-muted py-12">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="HelloKahwin — Laman utama"
              className="mb-3 inline-block text-white"
            >
              <SiteWordmark />
            </Link>
            <p className="text-plum-deep-accent font-accent mb-4 text-sm leading-relaxed italic">
              Idea, tips dan panduan perkahwinan untuk pasangan Malaysia.
            </p>
          </div>
          <div>
            <h4 className={headingClass}>Teroka</h4>
            <div className="flex flex-col gap-2">
              <Link href="/artikel" className={linkClass}>
                Semua Artikel
              </Link>
              {firstHalf.map((cat) => (
                <Link key={cat.slug} href={`/artikel/${cat.slug}`} className={linkClass}>
                  {cat.name}
                </Link>
              ))}
            </div>
          </div>
          {secondHalf.length > 0 && (
            <div>
              <h4 className={headingClass}>Topik</h4>
              <div className="flex flex-col gap-2">
                {secondHalf.map((cat) => (
                  <Link key={cat.slug} href={`/artikel/${cat.slug}`} className={linkClass}>
                    {cat.name}
                  </Link>
                ))}
              </div>
            </div>
          )}
          <div>
            <h4 className={headingClass}>HelloKahwin</h4>
            <div className="flex flex-col gap-2">
              <Link href="/" className={linkClass}>
                Laman Utama
              </Link>
              <SearchTrigger variant="text" className={linkClass}>
                Cari Artikel
              </SearchTrigger>
              <Link href="/brand" className={linkClass}>
                Jenama &amp; Media
              </Link>
            </div>
          </div>
        </div>

        <div className="text-plum-deep-muted mt-10 border-t border-white/10 pt-6 text-center text-sm">
          &copy; {new Date().getFullYear()} HelloKahwin. Hak cipta terpelihara.
        </div>
      </div>
    </footer>
  );
}
