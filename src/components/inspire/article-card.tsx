import Link from 'next/link';
import Image from 'next/image';
import './article-twn.css';

/** The card's rendered width: full-width phones, two-up tablets, four-up desktop. */
const CARD_SIZES = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw';

/**
 * The 4:3 card renditions, smallest first. Each srcset descriptor is the
 * crop's STORED width, never a constant — `crop-4x3-article-card-sm` is 528px
 * here, not the 800px it is on The Wedding Notebook, and a guessed descriptor
 * makes the browser pick the wrong file.
 */
const CARD_CROPS = [
  'crop-4x3-article-card-sm',
  'crop-4x3-article-card-md',
  'crop-4x3-article-card',
] as const;

interface ArticleCardCategory {
  name: string;
  slug: string;
}

interface ArticleCardProps {
  /** Overrides the `/artikel/{categorySlug}/{slug}` default. */
  href?: string;
  title: string;
  slug: string;
  categorySlug: string;
  categories: ArticleCardCategory[];
  coverImageUrl: string | null;
  coverImageVariants?: Record<string, { url: string; sizeBytes: number }> | null;
  smartCrops?: Record<string, { url: string; width: number; height: number }> | null;
  publishedAt: string | null;
  /** When provided (list pages), the card shows the last-updated date instead of published. */
  updatedAt?: string | null;
  /** First screenful on a grid — skips lazy-loading for LCP. */
  priority?: boolean;
  /** Base64 LQIP for the blur placeholder. Null falls back to a flat plate. */
  lqip?: string | null;
}

/**
 * The article card, laid out exactly as The Wedding Notebook's: a rounded 4:3
 * plate, a small uppercase category line, a serif title clamped to two lines,
 * then the date.
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
  href: hrefOverride,
  priority = false,
  lqip,
}: ArticleCardProps) {
  const href = hrefOverride ?? `/artikel/${categorySlug}/${slug}`;
  // Prefer last-updated when the caller supplies it; fall back to published.
  const displayDate = updatedAt ?? publishedAt;

  const crops = CARD_CROPS.map((name) => smartCrops?.[name]).filter(
    (c): c is { url: string; width: number; height: number } => Boolean(c?.url && c.width),
  );
  const cardImageUrl = crops[0]?.url ?? coverImageVariants?.low?.url ?? coverImageUrl;
  // With two or more renditions, let the browser choose: the card is 25vw on
  // desktop but full-width on a phone, where a 3x screen wants the big one.
  // Images are served unoptimised, so next/image cannot build this itself.
  const cardSrcSet = crops.length > 1 ? crops.map((c) => `${c.url} ${c.width}w`).join(', ') : null;

  return (
    <article className="group">
      <div
        className="bg-muted rounded-image relative aspect-[4/3] overflow-hidden"
        style={
          lqip
            ? {
                backgroundImage: `url(${lqip})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : undefined
        }
      >
        {/* Stretched link covers the image for article navigation */}
        <Link href={href} className="absolute inset-0 z-[1]" aria-label={title} />
        {cardSrcSet ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={crops[0]!.url}
            srcSet={cardSrcSet}
            sizes={CARD_SIZES}
            alt={title}
            loading={priority ? 'eager' : 'lazy'}
            fetchPriority={priority ? 'high' : undefined}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : cardImageUrl ? (
          <Image
            src={cardImageUrl}
            alt={title}
            fill
            sizes={CARD_SIZES}
            priority={priority}
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
