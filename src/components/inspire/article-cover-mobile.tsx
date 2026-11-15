'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShareIcon } from 'lucide-react';
import { PhotoGallery } from './photo-gallery';
import { authorArchivePath } from '@/lib/authors/gate';
import { getSmartCropUrl } from '@/lib/storage/smart-crop-url';
import type { GalleryImage } from './article-renderer';

interface ArticleCoverMobileProps {
  coverImageUrl: string;
  smartCrops?: Record<string, { url: string; width: number; height: number }>;
  categoryName: string;
  /**
   * Retained on the interface but no longer read. It fed the overlay back
   * arrow, which is not rendered here because the site header stays visible
   * on article pages (UX-01) and already offers every category.
   */
  categorySlug: string;
  title: string;
  /**
   * 'h1' (default) renders the title as this breakpoint's <h1>. 'p' renders a
   * visually identical, aria-hidden <p> for pages that put their single <h1>
   * elsewhere — the public article page does, so it carries exactly one <h1>.
   */
  titleAs?: 'h1' | 'p';
  authorName: string;
  /**
   * Set only when the author passes `isLinkableAuthor` — the caller does that
   * check, this component just links the name when it gets a slug.
   */
  authorSlug?: string | null;
  authorAvatarUrl?: string | null;
  updatedAt: Date;
  readTime: string | null;
  galleryImages: GalleryImage[];
  articleId: string;
  /** Base64 LQIP for the blur placeholder while the cover decodes. */
  lqip?: string | null;
  /** The cover's photo credit, rendered under the byline. */
  credit?: React.ReactNode;
}

/**
 * The phone cover, laid out as The Wedding Notebook's: a full-bleed 4:5
 * photograph with a share button and a "see all photos" pill on it, and a
 * curved paper panel that overlaps the bottom of the photograph and carries
 * the category, headline and byline.
 */
export function ArticleCoverMobile({
  coverImageUrl,
  smartCrops,
  categoryName,
  title,
  titleAs = 'h1',
  authorName,
  authorSlug,
  authorAvatarUrl,
  updatedAt,
  readTime,
  galleryImages,
  lqip,
  credit,
}: ArticleCoverMobileProps) {
  return (
    <div className="-mx-4 lg:hidden">
      <div className="relative">
        {/* Cover image — 4:5 full-bleed */}
        <div data-mobile-cover className="relative aspect-[4/5] w-full overflow-hidden">
          <Image
            src={getSmartCropUrl(smartCrops, 'crop-4x5-mobile-cover') ?? coverImageUrl}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
            {...(lqip ? { placeholder: 'blur' as const, blurDataURL: lqip } : {})}
          />

          {/* Overlay control — share. There is no back arrow: the site header
              stays visible on article pages, so the masthead is the way out. */}
          <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-end px-4 pt-4">
            <button
              type="button"
              onClick={() => {
                if (navigator.share) {
                  // Swallow the rejection when the user dismisses the native
                  // share sheet (AbortError) — it's not an error.
                  void navigator.share({ title, url: window.location.href }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                }
              }}
              className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"
              aria-label="Kongsi artikel"
            >
              <ShareIcon className="size-5" />
            </button>
          </div>

          {/* View all photos pill */}
          {galleryImages.length > 0 && (
            <div className="absolute right-4 bottom-10 z-10">
              <PhotoGallery
                images={galleryImages}
                trigger={
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                    Lihat semua foto ({galleryImages.length})
                  </span>
                }
              />
            </div>
          )}
        </div>

        {/* Curved content panel — overlaps the photo */}
        <div className="relative -mt-6 overflow-hidden">
          <div className="bg-background -mx-1 rounded-t-[24px] px-1">
            <div className="px-4 pt-6">
              <span className="inspire-overline text-brand-secondary">{categoryName}</span>
              {titleAs === 'h1' ? (
                <h1 className="mt-2 text-2xl leading-tight">{title}</h1>
              ) : (
                <p aria-hidden="true" className="inspire-title-h1 mt-2 text-2xl leading-tight">
                  {title}
                </p>
              )}
              {/* Kept as flowing inline text, not a flex row: the "· Dikemas
                  kini {date} · {readTime}" tail below is a fragment of loose
                  text nodes, and each one would become its own flex item. */}
              <p className="text-muted-foreground mt-2 text-sm">
                {authorAvatarUrl && (
                  <Image
                    src={authorAvatarUrl}
                    alt=""
                    width={20}
                    height={20}
                    className="mr-1.5 inline-block size-5 rounded-full object-cover align-text-bottom"
                  />
                )}
                {authorSlug ? (
                  <Link
                    href={authorArchivePath(authorSlug)}
                    className="hover:text-foreground underline-offset-2 transition-colors hover:underline"
                  >
                    {authorName}
                  </Link>
                ) : (
                  authorName
                )}
                {updatedAt && (
                  <>
                    {' '}
                    &middot; Dikemas kini{' '}
                    {new Date(updatedAt).toLocaleDateString('ms-MY', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </>
                )}
                {readTime && <> &middot; {readTime}</>}
              </p>
              {credit && <div className="mt-2">{credit}</div>}
            </div>
            <div className="bg-border mx-4 my-5 h-px" />
          </div>
        </div>
      </div>
    </div>
  );
}
