'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeftIcon, ShareIcon } from 'lucide-react';
import { MoodboardSaveButton } from '@/components/moodboard/moodboard-save-button';
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
  coverImageSaved?: boolean;
  hideMoodboard?: boolean;
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
  coverImageSaved,
  hideMoodboard = false,
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

          {/* Overlay nav — back, share, heart */}
          <div className="absolute top-0 right-0 left-0 z-10 flex items-center justify-between px-4 pt-4">
            <Link
              href={`/artikel/${categorySlug}`}
              className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"
              aria-label="Go back"
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
                className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm"
                aria-label="Share"
              >
                <ShareIcon className="size-5" />
              </button>
              {!hideMoodboard && (
                <MoodboardSaveButton
                  photoUrl={coverImageUrl}
                  source="inspire_upload"
                  sourceMetadata={{ type: 'inspire_upload', articleId }}
                  isSaved={coverImageSaved}
                  className="flex size-10 items-center justify-center rounded-full bg-white/90 shadow-md backdrop-blur-sm transition-colors hover:bg-white disabled:opacity-50"
                />
              )}
            </div>
          </div>

          {/* View all photos pill */}
          {galleryImages.length > 0 && (
            <div className="absolute right-4 bottom-10 z-10">
              <PhotoGallery
                images={galleryImages}
                trigger={
                  <span className="rounded-full bg-black/60 px-2.5 py-1 text-xs text-white">
                    View all photos ({galleryImages.length})
                  </span>
                }
              />
            </div>
          )}
        </div>

        {/* Curved content panel — overlaps photo like Airbnb */}
        <div className="relative -mt-6 overflow-hidden">
          <div className="bg-background -mx-1 rounded-t-[24px] px-1">
            <div className="px-4 pt-6">
              <span className="inspire-overline text-brand-secondary">{categoryName}</span>
              <h1 className="mt-2 text-2xl leading-tight">{title}</h1>
              {/* Kept as flowing inline text, not a flex row: the "· Updated
                  {date} · {readTime}" tail below is a fragment of loose text
                  nodes, and each one would become its own flex item. */}
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
                    &middot; Updated{' '}
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
            <div className="bg-border mx-4 my-5 h-px" />
          </div>
        </div>
      </div>
    </div>
  );
}
