import Link from 'next/link';
import type { SearchResultArticle } from '@/lib/search/contract';

export function formatTarikh(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ms-MY', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  });
}

/**
 * One search result: a 4:3 thumbnail beside the category, title, excerpt and
 * date. The thumbnail repeats the title link, so it is hidden from the tab
 * order and from screen readers; the title link is the one stop per result.
 */
export function SearchResultRow({
  article,
  priority = false,
  headingLevel = 'h2',
}: {
  article: SearchResultArticle;
  priority?: boolean;
  /** h3 when the list sits under its own h2 ("Padanan hampir"). */
  headingLevel?: 'h2' | 'h3';
}) {
  const date = formatTarikh(article.publishedAt);
  const Heading = headingLevel;
  return (
    <li className="border-border flex gap-4 border-b py-5 first:pt-0 last:border-b-0 sm:gap-6">
      <Link
        href={article.href}
        tabIndex={-1}
        aria-hidden="true"
        className="bg-muted rounded-image relative aspect-[4/3] w-28 shrink-0 self-start overflow-hidden sm:w-44"
      >
        {article.thumbnailUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- crops are pre-sized and served unoptimised, like ArticleCard
          <img
            src={article.thumbnailUrl}
            alt=""
            loading={priority ? 'eager' : 'lazy'}
            decoding="async"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : null}
      </Link>
      <div className="min-w-0 flex-1 space-y-1">
        <p className="text-primary text-[10px] font-semibold tracking-[0.12em] uppercase">
          <Link href={`/artikel/${article.categorySlug}`} className="hover:opacity-70">
            {article.categoryName}
          </Link>
        </p>
        <Heading className="font-serif text-base leading-snug font-normal break-words sm:text-lg">
          <Link href={article.href} className="hover:underline">
            {article.title}
          </Link>
        </Heading>
        {article.excerpt && (
          <p className="text-muted-foreground line-clamp-2 text-sm">{article.excerpt}</p>
        )}
        {date && <p className="text-muted-foreground text-xs">{date}</p>}
      </div>
    </li>
  );
}
