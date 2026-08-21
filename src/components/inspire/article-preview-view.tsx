import Image from 'next/image';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import {
  ArticleRenderer,
  extractImageUrlsWithVariants,
  extractTextContent,
} from '@/components/inspire/article-renderer';
import type { GalleryImage } from '@/components/inspire/article-renderer';
import { ArticleSidebar } from '@/components/inspire/article-sidebar';
import { ArticleCoverMobile } from '@/components/inspire/article-cover-mobile';
import { MobilePhotoBar } from '@/components/inspire/mobile-photo-bar';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import type { PreviewArticleData } from '@/lib/inspire/preview-article';

interface ArticlePreviewViewProps {
  /** Fetched by `getPreviewArticleData` / `getArticleByShareToken`. */
  data: PreviewArticleData;
  /** Rendered above the article — the admin preview passes its sticky banner. */
  banner?: React.ReactNode;
  /**
   * `'print'` drops the sidebar and the mobile photo bar: a saved PDF is the
   * article only, with no navigation or interactive chrome.
   */
  variant?: 'screen' | 'print';
}

/**
 * The shared preview render body (spec-article-draft-client-review).
 *
 * Moved verbatim out of the admin preview page so the admin preview, the client
 * share link and the print/PDF view all render from ONE source — which is what
 * guarantees a client reviewing a draft sees exactly what ships.
 *
 * The image path is deliberately untouched and must stay that way: the `high`
 * cover variant preferred over the original, the `crop-4.3x1-desktop-hero`
 * smart crop, `sizes="(max-width: 1280px) 100vw, 1280px"` and `priority` are
 * the same values the live article page serves. Resolution here was verified —
 * there is nothing to "upgrade".
 */
export function ArticlePreviewView({ data, banner, variant = 'screen' }: ArticlePreviewViewProps) {
  const { article, renderContent, tags, secondaryCategories } = data;
  const isPrint = variant === 'print';

  const bodyImages = extractImageUrlsWithVariants(renderContent);

  const coverGalleryImage: GalleryImage | null = article.coverImageUrl
    ? {
        src: article.coverImageUrl,
        thumbnailUrl: (() => {
          const variants = article.coverImageVariants as Record<string, { url: string }> | null;
          return variants?.low?.url ?? article.coverImageUrl;
        })(),
      }
    : null;

  const galleryImages: GalleryImage[] = [
    ...(coverGalleryImage ? [coverGalleryImage] : []),
    ...bodyImages,
  ];

  const authorName =
    [article.authorFirstName, article.authorLastName].filter(Boolean).join(' ') ||
    'HelloKahwin';

  const categories = [
    ...(article.categoryName && article.categorySlug
      ? [{ name: article.categoryName, slug: article.categorySlug }]
      : []),
    ...secondaryCategories.filter((sc) => sc.slug !== article.categorySlug),
  ];

  const breadcrumbItems = [
    { label: 'Home', href: '/' },
    { label: 'Inspire', href: '/artikel' },
    ...(article.categoryName
      ? [{ label: article.categoryName, href: `/artikel/${article.categorySlug}` }]
      : []),
    { label: article.title },
  ];

  // Estimate read time (~200 words per minute)
  let readTime: string | null = null;
  const text = extractTextContent(article.content);
  if (text) {
    const wordCount = text.split(/\s+/).filter(Boolean).length;
    const minutes = Math.max(1, Math.round(wordCount / 200));
    readTime = `${minutes} min read`;
  }

  return (
    <>
      {banner}

      <div className="container mx-auto px-4 pb-20 lg:px-6 lg:pt-8 lg:pb-8" data-hide-mobile-nav>
        <div className="hidden lg:block">
          <Breadcrumbs items={breadcrumbItems} />
        </div>

        <div className="inspire-editorial">
          {/* Mobile cover — full-bleed 4:5 with overlay nav + curved panel.
              See public article page for the same coverHigh-pref-over-original
              fallback rationale. */}
          {article.coverImageUrl ? (
            (() => {
              const coverHigh =
                (article.coverImageVariants as { high?: { url: string } } | null)?.high?.url ??
                article.coverImageUrl;
              return (
                <>
                  {/* Mobile cover — screen only. On paper the viewport IS the
                      sheet (~730px inside A4's margins), which is below the
                      `lg` breakpoint, so BOTH this block and the `hidden
                      lg:block` desktop hero below would resolve to "visible"
                      and print the cover photo twice. Worse, this one carries
                      interactive chrome — a back link, a share button and a
                      "View all photos" pill — that has no meaning on paper.
                      The print variant therefore renders the desktop hero
                      only; see the `isPrint` override on it below. */}
                  {!isPrint && (
                    <ArticleCoverMobile
                      coverImageUrl={coverHigh}
                      smartCrops={
                        article.coverImageSmartCrops as
                          | Record<string, { url: string; width: number; height: number }>
                          | undefined
                      }
                      categoryName={article.categoryName ?? 'Uncategorized'}
                      categorySlug={article.categorySlug ?? 'inspire'}
                      title={article.title}
                      authorName={authorName}
                      updatedAt={article.updatedAt}
                      readTime={readTime}
                      galleryImages={galleryImages}
                      articleId={article.id}
                      hideMoodboard
                    />
                  )}

                  {/* Desktop cover — 3.52:1 crop; box is aspect-[2.2/1] capped at 350px.
                      `hidden lg:block` on screen; unconditionally shown in the print
                      variant, because print media never matches `lg` and the spec
                      requires the PDF to open on the cover photo AND the title. */}
                  <div
                    className={`rounded-card relative mb-8 aspect-[2.2/1] max-h-[350px] w-full overflow-hidden ${
                      isPrint ? 'block' : 'hidden lg:block'
                    }`}
                  >
                    <Image
                      src={
                        getSmartCropUrl(article.coverImageSmartCrops, 'crop-4.3x1-desktop-hero') ??
                        coverHigh
                      }
                      alt={article.title}
                      fill
                      /* Screen keeps the live article page's string byte-for-byte —
                         the whole point of this component is that a shared draft
                         resolves the identical image URLs production serves.

                         Print cannot: in print media the "viewport" is the sheet,
                         so `100vw` resolves to ~730px inside A4's 14mm margins and
                         the browser picks a ~730px candidate for a ~180mm-wide
                         printed image — about 103 DPI, visibly soft on paper. A
                         fixed 1600px forces a high-resolution candidate instead,
                         landing near 225 DPI at the same physical size. */
                      sizes={isPrint ? '1600px' : '(max-width: 1280px) 100vw, 1280px'}
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-end bg-gradient-to-t from-black/60 to-transparent px-6 pb-10 text-center text-white">
                      <span className="inspire-overline text-brand-secondary">
                        {article.categoryName ?? 'Uncategorized'}
                      </span>
                      <h1 className="mt-2 max-w-[700px] text-[2.25rem] text-white">
                        {article.title}
                      </h1>
                      <p className="mt-3 text-sm text-white/60">
                        {authorName}
                        {article.updatedAt && (
                          <>
                            {' '}
                            &middot; Updated{' '}
                            {new Date(article.updatedAt).toLocaleDateString('en-MY', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </>
                        )}
                        {readTime && <> &middot; {readTime}</>}
                      </p>
                    </div>
                  </div>
                </>
              );
            })()
          ) : (
            <div className="mb-8">
              <div className="bg-muted rounded-card mb-6 aspect-[2.2/1] max-h-[350px] w-full" />
              <div className="mb-8 text-center">
                <span className="inspire-overline text-brand-secondary">
                  {article.categoryName ?? 'Uncategorized'}
                </span>
                <h1 className="mx-auto mt-2 max-w-[700px] text-[2.25rem]">{article.title}</h1>
                <p className="text-muted-foreground mt-3 text-sm">
                  {authorName}
                  {article.updatedAt && (
                    <>
                      {' '}
                      &middot; Updated{' '}
                      {new Date(article.updatedAt).toLocaleDateString('en-MY', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </>
                  )}
                  {readTime && <> &middot; {readTime}</>}
                </p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_280px]">
            {/* Main article content — no articleId = no moodboard buttons, no inlineBanner = no ads */}
            <article>
              <ArticleRenderer content={renderContent} />
            </article>

            {/* Sidebar.

                Deliberately NOT sticky, mirroring the public article page.
                When this column was pinned (`lg:sticky lg:top-[160px]`) its
                height was capped at the viewport, and Vendor Credits — the last
                block in it — fell below that edge with no way to scroll to
                them. The offset here was larger than the public page's, so the
                cut-off was strictly worse. Letting the column scroll with the
                page makes every credit reachable. */}
            {!isPrint && (
              <div className="hidden lg:block">
                <ArticleSidebar
                  updatedAt={new Date(article.updatedAt).toISOString()}
                  categories={categories}
                  authorName={authorName}
                  tags={tags}
                  galleryImages={galleryImages}
                />
              </div>
            )}
          </div>

          {/* Mobile sidebar content */}
          {!isPrint && (
            <div className="mt-8 border-t pt-8 lg:hidden">
              <ArticleSidebar
                updatedAt={new Date(article.updatedAt).toISOString()}
                categories={categories}
                authorName={authorName}
                tags={tags}
                galleryImages={galleryImages}
                variant="mobile"
              />
            </div>
          )}
        </div>
      </div>

      {!isPrint && <MobilePhotoBar galleryImages={galleryImages} />}
    </>
  );
}
