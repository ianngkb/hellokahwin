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
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="hk-meta">Tiada gambar</span>
          </div>
        )}
      </div>
      <div className="mt-3">
        {categories[0] && (
          <p className="hk-eyebrow truncate">
            <Link
              href={`/artikel/${categories[0].slug}`}
              className="hover:text-foreground relative z-[2] transition-colors"
            >
              {categories[0].name}
            </Link>
          </p>
        )}
        <h3 className="hk-card-title mt-1.5 line-clamp-3 text-[1.0625rem] lg:text-[1.125rem]">
          <Link
            href={href}
            className="decoration-border-strong underline-offset-[0.2em] hover:underline"
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
