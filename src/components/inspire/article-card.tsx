import Link from 'next/link';
import Image from 'next/image';

interface ArticleCardCategory {
  name: string;
  slug: string;
}

interface ArticleCardProps {
  title: string;
  slug: string;
  categorySlug: string;
  categories: ArticleCardCategory[];
  coverImageUrl: string | null;
  coverImageVariants?: Record<string, { url: string; sizeBytes: number }> | null;
  smartCrops?: Record<string, { url: string; width: number; height: number }> | null;
  publishedAt: string | null;
  /** When provided (inspire list pages), the card shows the last-updated date instead of published. */
  updatedAt?: string | null;
  /** First screenful on the hub/home grid — skips lazy-loading for LCP. */
  priority?: boolean;
  /**
   * Base64 LQIP for the blur placeholder. Only the first two cards get
   * `priority`; every card below the fold is `loading="lazy"`, so without this
   * the reader watches a flat plate sit where a photograph belongs until the
   * WebP decodes. Null falls back to that flat plate.
   */
  lqip?: string | null;
}

/**
 * Editorial Monotone card: square 4:3 plate, eyebrow, serif title below the
 * image. Deliberately no rounded corners, no shadow, no save icon and no
 * timestamp — the plate and the hairline do all the work.
 */
export function ArticleCard({
  title,
  slug,
  categorySlug,
  categories,
  coverImageUrl,
  coverImageVariants,
  smartCrops,
  publishedAt,
  updatedAt,
  priority = false,
  lqip,
}: ArticleCardProps) {
  const href = `/artikel/${categorySlug}/${slug}`;
  // Prefer last-updated when the caller supplies it; fall back to published.
  const displayDate = updatedAt ?? publishedAt;
  // Cards are small — use the low variant (q30, 1200px) or smart crop for best perf
  const cardImageUrl =
    smartCrops?.['crop-4x3-article-card']?.url ?? coverImageVariants?.low?.url ?? coverImageUrl;

  return (
    <article className="group">
      <div className="bg-muted relative aspect-[4/3] overflow-hidden">
        {/* Stretched link covers the image for article navigation */}
        <Link href={href} className="absolute inset-0 z-[1]" aria-label={title} />
        {cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
            priority={priority}
            {...(lqip ? { placeholder: 'blur' as const, blurDataURL: lqip } : {})}
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="hk-meta">Tiada gambar</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {/*
          UI-07: this label wraps; it must never truncate. `truncate` hid 10px of
          "Hantaran & Mas Kahwin" in the 171px two-up column at 390px, and the two
          longest live category names lose 81px at 1024 and 17px at 1440 in the
          four-up column too — the defect only looked mobile-only because no
          article in the current grid carries them. Wrapping is the only fix that
          holds at every width: the longest live label needs 301px, the widest
          card column is 284px, and the label may not shrink below 11px or hide.
          `wrap-anywhere` breaks a pathological single token instead of
          overflowing the grid — the longest live token is 123px, so it is a
          guard, not a behaviour anyone sees today.
        */}
        {categories[0] && (
          // UI-11: the label is a standalone target and measured 181.2 x 15.
          // `hk-tap` and not the truncating variant, because UI-07 landed first
          // and its finding stands: this label WRAPS and must never truncate.
          // `inline-flex` is shrink-to-fit, so it wraps inside the column like
          // the inline anchor it replaces, and `overflow-wrap` inherits from
          // the `wrap-anywhere` on the <p> above it.
          <p className="hk-eyebrow wrap-anywhere">
            <Link
              href={`/artikel/${categories[0].slug}`}
              className="hk-tap hover:text-foreground relative z-[2] transition-colors"
            >
              {categories[0].name}
            </Link>
          </p>
        )}
        {/* UI-11: `line-clamp-3` moved from the <h3> on to the <a>. The anchor
            is the target, and an inline anchor's box comes from font metrics —
            22px at this size — so a short title that fits on ONE line measured
            466 x 22 and 533 x 22 at 1440 (it wraps at 390 and passes there).
            The clamp sets `display: -webkit-box`, which gives the anchor a real
            box that `min-h-[var(--tap-min)]` can raise, and clamping is
            unchanged because the anchor is now the clamped box. Doing this the
            other way round — leaving the clamp on the <h3> and making the
            anchor inline-block — breaks the clamp: the -webkit-box would see
            one atomic item instead of three line boxes. */}
        <h3 className="hk-card-title mt-1.5 text-[1.0625rem] lg:text-[1.125rem]">
          <Link
            href={href}
            className="decoration-border-strong line-clamp-3 min-h-[var(--tap-min)] underline-offset-[0.2em] hover:underline"
          >
            {title}
          </Link>
        </h3>
        {displayDate && (
          <p className="hk-meta mt-2">
            {new Date(displayDate).toLocaleDateString('ms-MY', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        )}
      </div>
    </article>
  );
}
