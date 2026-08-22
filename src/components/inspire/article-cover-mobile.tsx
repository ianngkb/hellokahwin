'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, ShareIcon } from 'lucide-react';
import { PhotoGallery } from './photo-gallery';
import { authorArchivePath } from '@/lib/authors/gate';
import type { GalleryImage } from './article-renderer';

interface ArticleCoverMobileProps {
  coverImageUrl: string;
  smartCrops?: Record<string, { url: string; width: number; height: number }>;
  categoryName: string;
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
  categorySlug,
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
        {/* Cover image — 4:5 full-bleed */}
        <div className="relative aspect-[4/5] w-full overflow-hidden">
          <Image
            src={smartCrops?.['crop-4x5-mobile-cover']?.url ?? coverImageUrl}
            alt={title}
            fill
            sizes="100vw"
            className="object-cover"
            priority
          />

          {/* Overlay controls — back and share only. The spec bans save/heart
              icons on this surface, so the moodboard button is not rendered. */}
          <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-4 pt-4">
            <Link
              href={`/artikel/${categorySlug}`}
              className="flex size-11 items-center justify-center bg-white/90 backdrop-blur-sm"
              aria-label="Kembali ke kategori"
            >
              <ArrowLeftIcon className="size-5" />
            </Link>
            <div className="flex items-center gap-4">
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
          </div>

          {/* View all photos pill */}
          {galleryImages.length > 0 && (
            <div className="absolute right-4 bottom-10 z-10">
              <PhotoGallery
                images={galleryImages}
                trigger={
                  <span className="hk-eyebrow bg-black/70 px-3 py-2 !text-white">
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
