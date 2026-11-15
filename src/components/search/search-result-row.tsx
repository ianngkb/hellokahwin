import type { SearchResultArticle } from '@/lib/search/contract';
import { cn } from '@/lib/utils';

/** "15 November 2026" — the same Malay long date the article cards use. */
export function formatMalayDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString('ms-MY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kuala_Lumpur',
  });
}

/**
 * Underline the query's words inside a title. DES-06 Q3: underlined, not
 * highlighted — a yellow block would be the only saturated colour on a
 * monochrome publication.
 */
export function underlineMatches(text: string, query: string): React.ReactNode {
  const words = query
    .trim()
    .split(/\s+/)
    .filter((w) => w.length >= 2)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return text;
  const re = new RegExp(`(${words.join('|')})`, 'gi');
  return text.split(re).map((part, i) =>
    i % 2 === 1 ? (
      <span key={i} className="underline decoration-1 underline-offset-[3px]">
        {part}
      </span>
    ) : (
      part
    ),
  );
}

interface SearchResultRowProps {
  article: SearchResultArticle;
  query: string;
  id: string;
  active: boolean;
  onSelect: (article: SearchResultArticle, e: React.MouseEvent<HTMLAnchorElement>) => void;
}

/**
 * One option in the results listbox: 4:3 thumbnail (or a neutral block),
 * category, title, date. It is an `<a role="option">` so a long-press or
 * middle-click still offers "open in new tab"; it is not in the Tab order —
 * the arrow keys reach it from the field (aria-activedescendant).
 */
export function SearchResultRow({ article, query, id, active, onSelect }: SearchResultRowProps) {
  const date = formatMalayDate(article.publishedAt);
  return (
    <li role="none">
      <a
        id={id}
        href={article.href}
        role="option"
        aria-selected={active}
        tabIndex={-1}
        onClick={(e) => onSelect(article, e)}
        className={cn(
          'rounded-card flex min-h-[56px] items-start gap-3 px-2 py-2.5 transition-colors',
          active
            ? 'bg-surface-subtle outline-ring outline-2 -outline-offset-2'
            : 'hover:bg-surface-subtle',
        )}
      >
        <span className="rounded-image bg-surface-subtle relative block aspect-[4/3] w-[88px] shrink-0 overflow-hidden">
          {article.thumbnailUrl && (
            // eslint-disable-next-line @next/next/no-img-element -- remote CDN thumbnails, sized by the box
            <img
              src={article.thumbnailUrl}
              alt=""
              loading="lazy"
              decoding="async"
              className="absolute inset-0 size-full object-cover"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="inspire-overline text-muted-foreground block truncate text-[11px]">
            {article.categoryName}
          </span>
          <span className="text-foreground mt-1 line-clamp-2 block font-serif text-base leading-snug">
            {underlineMatches(article.title, query)}
          </span>
          {date && <span className="text-muted-foreground mt-1 block text-xs">{date}</span>}
        </span>
      </a>
    </li>
  );
}
