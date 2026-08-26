'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ShareIcon } from 'lucide-react';
import { PhotoGallery } from './photo-gallery';
import { getMobileCoverUrl } from '@/lib/storage/smart-crop-url';
import { authorArchivePath } from '@/lib/authors/gate';
import type { GalleryImage } from './article-renderer';

interface ArticleCoverMobileProps {
  coverImageUrl: string;
  smartCrops?: Record<string, { url: string; width: number; height: number }>;
  categoryName: string;
  /**
   * Retained on the interface but no longer read. It fed the overlay back
   * arrow, which UX-01 removed once the site header stopped being hidden on
   * article pages — the masthead's category rail is a strictly better escape
   * (every category, not just this one) and the arrow's destination is an empty
   * state on at least one pillar. Kept so the admin draft-preview surface's
   * call signature is untouched; drop it when that surface is next edited.
   */
  categorySlug: string;
  title: string;
  authorName: string;
  /**
   * Set only when the author passes `isLinkableAuthor` — the caller does that
   * check, this component just links the name when it gets a slug. OPTIONAL so
   * the admin draft-preview surfaces, which render this component without ever
   * touching the author's profile columns, keep working unchanged.
   */
  authorSlug?: string | null;
  authorAvatarUrl?: string | null;
  updatedAt: Date;
  readTime: string | null;
  galleryImages: GalleryImage[];
  articleId: string;
}

export function ArticleCoverMobile({
  coverImageUrl,
  smartCrops,
  categoryName,
  title,
  authorName,
  authorSlug,
  authorAvatarUrl,
  updatedAt,
  readTime,
  galleryImages,
  articleId,
}: ArticleCoverMobileProps) {
  return (
    <div className="-mx-4 lg:hidden">
      <div className="relative">
        {/* Cover image — 3:2 full-bleed.
            Was 4:5 (487px tall at 390px wide), which is a portrait plate on a
            portrait screen: it pushed the headline, the byline and the share
            row down far enough that the first sentence of the article started
            at 793px, 50px off the bottom of an 844px viewport. A reader who
            arrived from Google saw a photograph and nothing else. 3:2 is 260px
            at the same width — 227px handed back to the words, which is what
            the reader came for. Do not make this plate taller without
            re-measuring where the first paragraph lands at 390px. */}
        <div data-mobile-cover className="relative aspect-[3/2] w-full overflow-hidden">
          {/* Crop preference follows the plate, not habit — see
              getMobileCoverUrl. Shared with the route's LCP preload hint so the
              two cannot resolve to different URLs. */}
          <Image
            src={getMobileCoverUrl(smartCrops, coverImageUrl)}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />

          {/* Overlay controls — share only.
              The back arrow that used to sit opposite is gone: the site header
              is no longer hidden here, so the masthead and its category rail
              are pinned above this plate and offer every category rather than
              just the one. Two navigation affordances 60px apart, one of them
              strictly weaker, is a choice the reader should not have to make.
              The spec bans save/heart icons on this surface, so the moodboard
              button is still not rendered. */}
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
              className="flex size-11 items-center justify-center bg-white/90 backdrop-blur-sm"
              aria-label="Kongsi artikel"
            >
              <ShareIcon className="size-5" />
            </button>
          </div>

          {/* View all photos pill. This is where the gallery lives now — on the
              photograph, where the offer makes sense. It used to be here AND in
              a fixed bottom bar, the same words twice, occupying both of the
              two most valuable positions on a phone. The bottom bar now carries
              the next article instead. */}
          {galleryImages.length > 0 && (
            <div className="absolute right-4 bottom-3 z-10">
              <PhotoGallery
                images={galleryImages}
                trigger={
                  <span className="hk-eyebrow flex min-h-11 items-center bg-black/70 px-3 py-2 !text-white">
                    Lihat semua foto ({galleryImages.length})
                  </span>
                }
              />
            </div>
          )}
        </div>

        {/* Editorial header — headline on paper directly under the plate,
            never over it. */}
        <div className="relative">
          <div className="bg-background">
            <div className="px-4 pt-7 text-center">
              <span className="hk-eyebrow">{categoryName}</span>
              <h1 className="hk-display mt-3 text-[1.75rem]">{title}</h1>
              {/* Kept as flowing inline text, not a flex row: the "· Updated
                  {date} · {readTime}" tail below is a fragment of loose text
                  nodes, and each one would become its own flex item. */}
              <p className="hk-meta mt-4">
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
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
