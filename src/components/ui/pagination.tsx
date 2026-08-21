import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';

/**
 * Returns an array of page numbers and ellipsis markers for pagination display.
 * Always shows first, last, and a window of pages around the current page.
 */
function getPageNumbers(current: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);

  // Determine the visible window of 5 pages, adjusting near edges
  let windowStart = current - 2;
  let windowEnd = current + 2;

  if (windowStart <= 2) {
    windowStart = 1;
    windowEnd = 5;
  } else if (windowEnd >= total - 1) {
    windowStart = total - 4;
    windowEnd = total;
  }

  for (let i = windowStart; i <= windowEnd; i++) {
    pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: (number | 'ellipsis')[] = [];

  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) {
      result.push('ellipsis');
    }
    result.push(sorted[i]);
  }

  return result;
}

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  baseHref: string;
  searchParams: Record<string, string>;
}

export function Pagination({ currentPage, totalPages, baseHref, searchParams }: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages);

  function buildHref(pageNum: number) {
    // Strip the inbound `page` value so the page-1 link does not inherit
    // the current page from `searchParams`.
    const query: Record<string, string> = { ...searchParams };
    delete query.page;
    if (pageNum !== 1) query.page = String(pageNum);
    const qs = new URLSearchParams(query).toString();
    return qs ? `${baseHref}?${qs}` : baseHref;
  }

  return (
    <nav aria-label="Pagination" className="mt-16">
      {/* Desktop: full numbered pagination */}
      <div className="hidden items-center justify-center gap-1.5 md:flex">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="text-muted-foreground hover:bg-accent/50 hover:text-foreground inline-flex size-9 items-center justify-center rounded-full transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span
            className="text-muted-foreground/40 inline-flex size-9 items-center justify-center rounded-full"
            aria-disabled="true"
          >
            <ChevronLeft className="size-4" />
          </span>
        )}

        {pages.map((item, idx) => {
          if (item === 'ellipsis') {
            return (
              <span
                key={`ellipsis-${idx}`}
                className="text-muted-foreground px-1.5 text-sm select-none"
              >
                ...
              </span>
            );
          }

          const isActive = item === currentPage;

          return isActive ? (
            <span
              key={item}
              className="bg-foreground text-background inline-flex size-9 items-center justify-center rounded-full text-sm font-medium"
              aria-current="page"
            >
              {item}
            </span>
          ) : (
            <Link
              key={item}
              href={buildHref(item)}
              className="text-muted-foreground hover:bg-accent/50 hover:text-foreground inline-flex size-9 items-center justify-center rounded-full text-sm transition-colors"
            >
              {item}
            </Link>
          );
        })}

        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="text-muted-foreground hover:bg-accent/50 hover:text-foreground inline-flex size-9 items-center justify-center rounded-full transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span
            className="text-muted-foreground/40 inline-flex size-9 items-center justify-center rounded-full"
            aria-disabled="true"
          >
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>

      {/* Mobile: simplified pagination */}
      <div className="flex items-center justify-center gap-3 md:hidden">
        {currentPage > 1 ? (
          <Link
            href={buildHref(currentPage - 1)}
            className="text-muted-foreground hover:bg-accent/50 hover:text-foreground inline-flex size-9 items-center justify-center rounded-full transition-colors"
            aria-label="Previous page"
          >
            <ChevronLeft className="size-4" />
          </Link>
        ) : (
          <span
            className="text-muted-foreground/40 inline-flex size-9 items-center justify-center rounded-full"
            aria-disabled="true"
          >
            <ChevronLeft className="size-4" />
          </span>
        )}

        <span className="text-muted-foreground text-sm">
          Page {currentPage} of {totalPages}
        </span>

        {currentPage < totalPages ? (
          <Link
            href={buildHref(currentPage + 1)}
            className="text-muted-foreground hover:bg-accent/50 hover:text-foreground inline-flex size-9 items-center justify-center rounded-full transition-colors"
            aria-label="Next page"
          >
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span
            className="text-muted-foreground/40 inline-flex size-9 items-center justify-center rounded-full"
            aria-disabled="true"
          >
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}
