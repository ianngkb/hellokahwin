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
}

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
}: ArticleCardProps) {
  const href = `/artikel/${categorySlug}/${slug}`;
  // Prefer last-updated when the caller supplies it; fall back to published.
  const displayDate = updatedAt ?? publishedAt;
  // Cards are small — use the low variant (q30, 1200px) or smart crop for best perf
  const cardImageUrl =
    smartCrops?.['crop-4x3-article-card']?.url ?? coverImageVariants?.low?.url ?? coverImageUrl;

  return (
    <article className="group">
      <div className="bg-muted rounded-image relative aspect-[4/3] overflow-hidden">
        {/* Stretched link covers the image for article navigation */}
        <Link href={href} className="absolute inset-0 z-[1]" aria-label={title} />
        {cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={title}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-muted-foreground text-sm">Tiada gambar</span>
          </div>
        )}
      </div>
      <div className="mt-2 space-y-0.5">
        {categories[0] && (
          <p className="text-primary text-[10px] font-semibold tracking-[0.12em] uppercase">
            <Link
              href={`/artikel/${categories[0].slug}`}
              className="relative z-[2] transition-opacity hover:opacity-70"
            >
              {categories[0].name}
            </Link>
            {categories.slice(1).map((cat) => (
              <span key={cat.slug} className="text-muted-foreground">
                {' · '}
                <Link
                  href={`/artikel/${cat.slug}`}
                  className="hover:text-foreground relative z-[2] transition-colors"
                >
                  {cat.name}
                </Link>
              </span>
            ))}
          </p>
        )}
        <h3 className="line-clamp-2 font-serif text-[15px] leading-snug font-normal">
          <Link href={href} className="hover:underline">
            {title}
          </Link>
        </h3>
        {displayDate && (
          <p className="text-muted-foreground text-xs">
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
