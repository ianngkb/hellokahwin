'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { SearchIcon, XIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  searchPagesAction,
  type PageSearchResult,
} from '@/app/(admin)/admin/site-analytics/actions';

interface PageSearchProps {
  activePage?: string;
  /** Resolved human-readable title for the active page, if any. */
  activePageTitle?: string | null;
  /**
   * Effective date range + traffic mode the dashboard is showing, resolved
   * server-side. Passed as props (not read from the URL) because on a default
   * page load the URL has no `from`/`to`/`traffic` params yet — reading them
   * from the URL would send empty dates and the search would return nothing.
   */
  from: string;
  to: string;
  traffic: string;
}

export function PageSearch({ activePage, activePageTitle, from, to, traffic }: PageSearchProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PageSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // Monotonic id so a slow earlier request can't overwrite a newer one's results.
  const searchSeqRef = useRef(0);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Invalidate any in-flight search (its late response is then dropped by the
  // seq check) and empty the list.
  const resetResults = useCallback(() => {
    searchSeqRef.current++;
    setResults([]);
    setSearching(false);
  }, []);

  // Results belong to one range + traffic mode; when those change, the list is
  // stale, so clear it along with any pending or in-flight search.
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    resetResults();
  }, [from, to, traffic, resetResults]);

  const doSearch = useCallback(
    async (q: string) => {
      if (!q.trim()) {
        resetResults();
        return;
      }
      const seq = ++searchSeqRef.current;
      setSearching(true);
      try {
        const pages = await searchPagesAction(q, from, to, traffic);
        if (seq !== searchSeqRef.current) return; // superseded by a newer search
        setResults(pages);
      } catch {
        if (seq === searchSeqRef.current) setResults([]);
      } finally {
        if (seq === searchSeqRef.current) setSearching(false);
      }
    },
    [from, to, traffic, resetResults],
  );

  const handleInputChange = useCallback(
    (value: string) => {
      setQuery(value);
      setOpen(true);
      // The old list no longer matches what is typed: drop it now rather than
      // after the debounce, and show "Searching…" until the new one lands.
      resetResults();
      if (value.trim()) setSearching(true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => doSearch(value), 300);
    },
    [doSearch, resetResults],
  );

  const selectPage = useCallback(
    (page: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set('page', page);
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
      setOpen(false);
      setQuery('');
    },
    [router, pathname, searchParams],
  );

  const clearPage = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('page');
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  }, [router, pathname, searchParams]);

  // If a page is active, show it as a pill
  if (activePage) {
    return (
      <div
        className={cn(
          'bg-background inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5 text-xs font-medium',
          pending && 'opacity-60',
        )}
      >
        <SearchIcon className="text-muted-foreground size-3.5" />
        <span className="max-w-[300px] truncate" title={activePage}>
          {activePageTitle ? (
            <>
              {activePageTitle}
              <span className="text-muted-foreground ml-1.5 font-normal">{activePage}</span>
            </>
          ) : (
            activePage
          )}
        </span>
        <button
          type="button"
          onClick={clearPage}
          className="hover:bg-accent ml-0.5 rounded-sm p-0.5 transition-colors"
          aria-label="Clear page filter"
        >
          <XIcon className="size-3" />
        </button>
      </div>
    );
  }

  // No active page — show search input
  return (
    <div ref={containerRef} className="relative">
      <div className="bg-background inline-flex h-8 items-center gap-1.5 rounded-md border px-2.5">
        <SearchIcon className="text-muted-foreground size-3.5 shrink-0" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onFocus={() => {
            if (query.trim()) setOpen(true);
          }}
          placeholder="Search pages..."
          className="placeholder:text-muted-foreground h-full w-[180px] bg-transparent text-xs outline-none"
        />
      </div>

      {open && query.trim() !== '' && (
        <div className="bg-popover absolute top-full left-0 z-50 mt-1 w-[400px] rounded-md border shadow-lg">
          {searching ? (
            <div className="text-muted-foreground px-3 py-4 text-center text-xs">Searching...</div>
          ) : results.length === 0 ? (
            <div className="text-muted-foreground px-3 py-4 text-center text-xs">
              No pages found
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto py-1">
              {results.map((result) => (
                <button
                  key={result.pathname}
                  type="button"
                  onClick={() => selectPage(result.pathname)}
                  className="hover:bg-accent w-full px-3 py-2 text-left text-xs transition-colors"
                  title={result.pathname}
                >
                  {result.title ? (
                    <>
                      <span className="block truncate font-medium">{result.title}</span>
                      <span className="text-muted-foreground block truncate">
                        {result.pathname}
                      </span>
                    </>
                  ) : (
                    <span className="block truncate">{result.pathname}</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
