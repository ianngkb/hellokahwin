'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';

interface SearchResult {
  id: string; // F6: API returns UUID string
  title: string;
  slug: string;
  category_slug: string;
  excerpt?: string;
  cover_image_url?: string;
  score?: number;
}

export function InspireArticleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null); // F2: abort stale requests
  const containerRef = useRef<HTMLDivElement>(null);

  // F3: Clean up debounce and abort on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
    };
  }, []);

  const fetchResults = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setHasSearched(false);
      setIsOpen(false);
      return;
    }

    // F2: Abort previous in-flight request
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q)}&type=articles&limit=5`, {
        signal: controller.signal,
      });
      if (!res.ok) throw new Error('Search failed');
      const json = await res.json();
      const articles = json.data?.articles ?? [];
      setResults(articles);
      setHasSearched(true);
      setIsOpen(true);


    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResults([]);
      setHasSearched(true);
      setIsOpen(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setQuery(val);

      if (debounceRef.current) clearTimeout(debounceRef.current);

      if (val.length < 2) {
        setResults([]);
        setHasSearched(false);
        setIsOpen(false);
        return;
      }

      debounceRef.current = setTimeout(() => {
        fetchResults(val);
      }, 300);
    },
    [fetchResults],
  );

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setIsOpen(false);
    }
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const resultsId = 'inspire-search-results';

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-xs md:mx-0"
      style={{ fontFamily: 'var(--font-geist)' }}
    >
      <div className="relative">
        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
        {/* F9: ARIA attributes for autocomplete pattern */}
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasSearched) setIsOpen(true);
          }}
          placeholder="Cari artikel..."
          className="border-border bg-background placeholder:text-muted-foreground focus:ring-ring/30 w-full rounded-full border py-2 pr-4 pl-9 text-sm transition-shadow focus:ring-2 focus:outline-none"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={resultsId}
          aria-autocomplete="list"
        />
      </div>

      {isOpen && (
        <div
          id={resultsId}
          className="inspire-search-results bg-popover absolute top-full right-0 left-0 z-50 mt-2"
          role="listbox"
          aria-live="polite"
        >
          {isLoading ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">Mencari...</div>
          ) : results.length > 0 ? (
            <ul role="listbox">
              {results.map((r) => (
                <li key={r.id} role="option" aria-selected={false}>
                  <Link
                    href={`/artikel/${r.category_slug}/${r.slug}`}
                    className="hover:bg-accent block px-4 py-3 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                    }}
                  >
                    <span className="line-clamp-1 block text-sm leading-snug font-medium">
                      {r.title}
                    </span>
                    <span className="text-muted-foreground mt-0.5 block text-xs capitalize">
                      {r.category_slug?.replace(/-/g, ' ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : hasSearched ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">Tiada hasil dijumpai</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
