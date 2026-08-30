'use client';

import { useState, useRef, useCallback, useEffect, useId } from 'react';
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

/**
 * The article search field on /artikel#cari — the site's only search surface.
 *
 * UI-09 brought this up to DES-06 §8, which HelloKahwin wrote in Sprint 03 and
 * then shipped a field that failed. Five things changed, and each one is a
 * measured number rather than a preference:
 *
 *  1. FOCUS. The field painted its ring as `focus:ring-ring/30`. That ring is
 *     real — 2px of `--ring` at 30% alpha — but 30% of ink over warm paper
 *     composites to rgb(182,181,180), which is 1.98:1 against the page.
 *     WCAG 2.2 SC 1.4.11 asks 3:1 of a focus indicator. It is now a 2px
 *     `--ring` outline at full opacity with a 2px offset: 17.7:1, and the same
 *     ink the rest of the page is set in. It is drawn on `:focus-visible`, not
 *     `:focus`, so a mouse click does not leave a ring behind.
 *
 *  2. NAME. The accessible name came from the placeholder alone, which
 *     disappears the moment a reader types — taking the field's name with it.
 *     There is now a real <label for> reading "Cari", visible, per DES-06 §8.
 *
 *  3. ANNOUNCEMENT. The old aria-live region was created at the same moment
 *     its content arrived, which is the classic reason an announcement is
 *     never made: a screen reader has to be observing a region BEFORE it
 *     changes. The region below is rendered from first paint and starts empty.
 *     It is written once per settled query, never during typing or loading.
 *
 *  4. TYPE SIZE. 14px made iOS Safari zoom the page on focus — on 79% of this
 *     site's traffic. 16px is the threshold and 16px is what it is now.
 *
 *  5. TARGET. 38px tall, under the 44px floor DES-06 §8 sets for every
 *     interactive element. Now 46px.
 *
 * The nested `role="listbox"` inside `role="listbox"` DES-06 §8 called invalid
 * is flattened here: exactly one listbox, with the <ul> transparent to the
 * accessibility tree so the options are its direct children.
 *
 * NOT built here, and deliberately: the `/` and Ctrl/⌘K shortcuts, the Radix
 * dialog with its focus trap and inert background, aria-activedescendant arrow
 * navigation, Home/End, and Enter submitting to a `/cari?q=…` results page that
 * does not exist yet. All of those are DES-06 §8 too, and all of them are a
 * search REBUILD, which Sprint 04 declined. See the UI-09 work-done entry.
 */
export function InspireArticleSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  // What the live region says. Empty until a query has SETTLED — never during
  // typing, never during loading (DES-06 §8: "Nothing fires during typing or
  // loading"). An announcement per keystroke is noise a screen-reader user
  // cannot type through.
  const [announcement, setAnnouncement] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null); // F2: abort stale requests
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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
      setAnnouncement('');
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
      // Malay does not inflect for plural, so "1 hasil" and "9 hasil" are both
      // correct and no n===1 branch is needed.
      setAnnouncement(articles.length > 0 ? `${articles.length} hasil.` : 'Tiada hasil dijumpai.');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setResults([]);
      setHasSearched(true);
      setIsOpen(true);
      // A failed request is not "no results", and saying so would send the
      // reader off to rephrase a query that was never the problem (DES-06 §4).
      setAnnouncement('Carian gagal.');
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
        setAnnouncement('');
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

  // Arriving from the masthead's search link (/artikel#cari) puts the caret in
  // the field. Without this the link lands the reader next to a search box they
  // then have to tap a second time, which on a phone means the keyboard is two
  // taps away from a control they already told us they wanted. The hash is
  // checked rather than always focusing, because /artikel is also a browse
  // destination in its own right and stealing focus there would yank the page
  // down to the search box for readers who only wanted the index.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#cari') return;
    // After paint, so the browser's own hash-scroll has already happened and
    // preventScroll leaves us where the anchor put us.
    const id = requestAnimationFrame(() => inputRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(id);
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

  // useId rather than a module constant: the masthead links every page to
  // /artikel#cari, but nothing stops a second instance of this component
  // appearing on a page later, and two elements sharing an id would silently
  // break both the label association and aria-controls.
  const uid = useId();
  const inputId = `inspire-search-${uid}`;
  const resultsId = `inspire-search-results-${uid}`;
  const statusId = `inspire-search-status-${uid}`;

  return (
    <div
      ref={containerRef}
      className="relative mx-auto max-w-xs md:mx-0"
      style={{ fontFamily: 'var(--font-geist)' }}
    >
      {/* DES-06 §8: "A visible <label> reading Cari, not a placeholder standing
          in for one." The placeholder stays as a hint about WHAT can be
          searched; it is no longer carrying the field's name. */}
      <label htmlFor={inputId} className="hk-eyebrow mb-2 block">
        Cari
      </label>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
        />
        {/* F9: ARIA attributes for autocomplete pattern */}
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (hasSearched) setIsOpen(true);
          }}
          placeholder="Cari artikel..."
          // text-base is 16px and is load-bearing, not a style choice: iOS
          // Safari zooms the page when a field under 16px takes focus, and
          // mobile is 79% of this site's clicks.
          // min-h-[2.75rem] is the 44px floor; py-2.5 + 24px line-height + 2px
          // of border lands at 46px, which clears it without a fixed height
          // that would clip if a reader has enlarged their default type.
          className="bg-background placeholder:text-muted-foreground hk-search-input min-h-[2.75rem] w-full rounded-full border py-2.5 pr-4 pl-9 text-base"
          role="combobox"
          aria-expanded={isOpen}
          aria-controls={resultsId}
          aria-autocomplete="list"
          // The browser's own autofill panel would otherwise open over the
          // results and contradict aria-expanded.
          autoComplete="off"
        />
      </div>

      {/* DES-06 §8: present in the DOM from first render and starting empty.
          Rendered unconditionally and OUTSIDE the results panel — a live
          region that is mounted together with its content is not observed
          when the content arrives, which is why the shipped field announced
          nothing despite carrying aria-live. */}
      <div id={statusId} role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>

      {isOpen && (
        <div
          id={resultsId}
          className="inspire-search-results bg-popover absolute top-full right-0 left-0 z-50 mt-2"
          // One listbox, not two. The shipped markup put role="listbox" on
          // this div AND on the <ul> inside it; DES-06 §8 calls that invalid
          // and says to flatten it. The <ul> below is role="none" so its <li>
          // options are this listbox's direct children in the a11y tree.
          role="listbox"
          aria-label="Hasil carian"
        >
          {isLoading ? (
            <div className="text-muted-foreground px-4 py-3 text-sm">Mencari...</div>
          ) : results.length > 0 ? (
            <ul role="none" className="m-0 list-none p-0">
              {results.map((r) => (
                <li key={r.id} role="option" aria-selected={false}>
                  <Link
                    href={`/artikel/${r.category_slug}/${r.slug}`}
                    className="hover:bg-accent block px-4 py-3 transition-colors"
                    onClick={() => {
                      setIsOpen(false);
                      setQuery('');
                      setAnnouncement('');
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
