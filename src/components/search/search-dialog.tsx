'use client';

import { useCallback, useId, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ArrowRightIcon, SearchIcon, WifiOffIcon, XIcon } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  POPULAR_SEARCHES,
  SEARCH_PAGE_PATH,
  searchPageHref,
  type SearchResponse,
  type SearchResultArticle,
} from '@/lib/search/contract';
import { cn } from '@/lib/utils';
import { SearchResultRow } from './search-result-row';
import { HINT_TEXT, SEARCH_PLACEHOLDER } from './copy';
import { useArticleSearch, useOnline, type SearchState } from './use-article-search';

/** What the polite live region says once a query settles (DES-06 §8). Nothing during typing or loading. */
export function announcementFor(state: SearchState, online: boolean): string {
  if (!online) return 'Tiada sambungan internet.';
  if (state.status === 'error') return 'Carian gagal.';
  if (state.status !== 'success') return '';
  const { articles, total } = state.response;
  if (articles.length === 0) return 'Tiada hasil.';
  // Malay does not inflect for plural: "1 hasil", "9 hasil".
  return `${Math.max(total, articles.length)} hasil.`;
}

interface SearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
  onCloseAutoFocus?: () => void;
}

/**
 * The search screen (DES-06 E2 → Q1–Q5, F1, F2).
 *
 * Below 768px it is a full screen with a back arrow, the way a phone reader
 * expects a header search to open; from 768px it is TWN's panel, dropped from
 * the top of the viewport. Either way it is a Radix dialog: focus moves to the
 * field, Tab stays inside, the page behind is inert, and it sits on
 * `--z-overlay`, above the sticky header.
 *
 * The field is inside a real `<form action="/cari" method="get">`, so Enter
 * with no result highlighted goes to the shareable results page — and would
 * even if this script failed between render and submit.
 */
export function SearchDialog({
  open,
  onOpenChange,
  initialQuery = '',
  onCloseAutoFocus,
}: SearchDialogProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  // The highlighted row belongs to one response; a new response starts with none.
  const [active, setActive] = useState<{ response: SearchResponse | null; index: number }>({
    response: null,
    index: -1,
  });
  const { state, search, searchNow, reset, retry } = useArticleSearch();
  const online = useOnline();

  const uid = useId();
  const inputId = `search-input-${uid}`;
  const listboxId = `search-results-${uid}`;
  const hintId = `search-hint-${uid}`;
  const optionId = (i: number) => `${listboxId}-opt-${i}`;

  const response = state.status === 'success' ? state.response : null;
  const articles = response?.articles ?? [];
  const activeIndex = response && active.response === response ? active.index : -1;
  const showList = online && articles.length > 0;

  const handleOpenChange = useCallback(
    (next: boolean) => {
      if (!next) {
        setQuery('');
        setActive({ response: null, index: -1 });
        reset();
      }
      onOpenChange(next);
    },
    [onOpenChange, reset],
  );

  const runTerm = (term: string) => {
    setQuery(term);
    searchNow(term);
    inputRef.current?.focus();
  };

  const openArticle = (article: SearchResultArticle) => {
    handleOpenChange(false);
    router.push(article.href);
  };

  const goToResultsPage = (q: string) => {
    handleOpenChange(false);
    router.push(searchPageHref(q));
  };

  const moveTo = (index: number) => {
    setActive({ response, index });
    requestAnimationFrame(() => {
      document.getElementById(optionId(index))?.scrollIntoView?.({ block: 'nearest' });
    });
  };

  const onInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showList) return;
    const last = articles.length - 1;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      moveTo(activeIndex >= last ? 0 : activeIndex + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      moveTo(activeIndex <= 0 ? last : activeIndex - 1);
    } else if (activeIndex >= 0 && e.key === 'Home') {
      e.preventDefault();
      moveTo(0);
    } else if (activeIndex >= 0 && e.key === 'End') {
      e.preventDefault();
      moveTo(last);
    }
  };

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (showList && activeIndex >= 0 && articles[activeIndex]) {
      openArticle(articles[activeIndex]);
      return;
    }
    const q = query.trim();
    if (q) goToResultsPage(q);
  };

  const announcement = announcementFor(state, online);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogPortal>
        <DialogOverlay className="hidden md:block" />
        <DialogPrimitive.Content
          data-slot="search-dialog"
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            const el = inputRef.current;
            if (initialQuery) {
              setQuery(initialQuery);
              searchNow(initialQuery);
            }
            if (el) {
              el.focus();
              el.setSelectionRange(initialQuery.length, initialQuery.length);
            }
          }}
          onCloseAutoFocus={(e) => {
            if (!onCloseAutoFocus) return;
            e.preventDefault();
            onCloseAutoFocus();
          }}
          className={cn(
            // `hk-public`: the portal renders under <body>, outside the public
            // layout's palette wrapper (same reason the phone menu carries it).
            'hk-public bg-background text-foreground fixed inset-0 z-[var(--z-overlay)] flex flex-col outline-none',
            'md:inset-x-auto md:top-[8vh] md:bottom-auto md:left-1/2 md:max-h-[84vh] md:w-[calc(100%-2rem)] md:max-w-xl md:-translate-x-1/2',
            'md:border-hairline md:rounded-modal md:overflow-hidden md:border md:shadow-lg',
          )}
        >
          <DialogTitle className="sr-only">Cari artikel</DialogTitle>
          <DialogDescription className="sr-only">
            Taip sekurang-kurangnya dua huruf. Gunakan anak panah atas dan bawah untuk memilih
            hasil, Enter untuk membuka.
          </DialogDescription>

          <form
            role="search"
            action={SEARCH_PAGE_PATH}
            method="get"
            onSubmit={onSubmit}
            className="border-hairline shrink-0 border-b px-2 pt-1 pb-3 md:px-4 md:pt-2"
          >
            <div className="flex min-h-11 items-center">
              <DialogClose asChild>
                <button
                  type="button"
                  aria-label="Kembali"
                  className="text-foreground -ml-0.5 flex size-11 items-center justify-center md:hidden"
                >
                  <ArrowLeftIcon className="size-[22px]" aria-hidden="true" />
                </button>
              </DialogClose>
              <label htmlFor={inputId} className="hk-eyebrow md:ml-0">
                Cari
              </label>
              <DialogClose asChild>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground ml-auto hidden min-h-11 items-center gap-2 px-1 text-sm md:inline-flex"
                >
                  Tutup
                  <kbd className="border-border rounded border px-1.5 py-0.5 text-[10px] font-medium">
                    Esc
                  </kbd>
                </button>
              </DialogClose>
            </div>
            <div className="relative px-2 md:px-0">
              <SearchIcon
                aria-hidden="true"
                className="text-muted-foreground pointer-events-none absolute top-1/2 left-5.5 size-4 -translate-y-1/2 md:left-3.5"
              />
              <input
                ref={inputRef}
                id={inputId}
                name="q"
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  search(e.target.value);
                }}
                onKeyDown={onInputKeyDown}
                placeholder={SEARCH_PLACEHOLDER}
                enterKeyHint="search"
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showList}
                aria-controls={showList ? listboxId : undefined}
                aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
                aria-describedby={hintId}
                // 16px: iOS Safari zooms the page on focus below it.
                className="hk-search-input bg-background placeholder:text-muted-foreground min-h-12 w-full rounded-full border py-2.5 pr-11 pl-10 text-base [&::-webkit-search-cancel-button]:appearance-none"
              />
              {query && (
                <button
                  type="button"
                  aria-label="Padam carian"
                  onClick={() => runTerm('')}
                  className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 flex size-11 -translate-y-1/2 items-center justify-center md:right-0"
                >
                  <XIcon className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </form>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 md:px-4">
            <SearchBody
              state={state}
              online={online}
              hintId={hintId}
              listboxId={listboxId}
              optionId={optionId}
              activeIndex={activeIndex}
              onRunTerm={runTerm}
              onRetry={retry}
              onSelect={(article, e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                openArticle(article);
              }}
              onSeeAll={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                goToResultsPage(state.status === 'success' ? state.query : query.trim());
              }}
              onClose={() => handleOpenChange(false)}
            />
          </div>

          {/* Mounted with the screen, before any query runs, and starts empty. */}
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {announcement}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

interface SearchBodyProps {
  state: SearchState;
  online: boolean;
  hintId: string;
  listboxId: string;
  optionId: (i: number) => string;
  activeIndex: number;
  onRunTerm: (term: string) => void;
  onRetry: () => void;
  onSelect: (article: SearchResultArticle, e: React.MouseEvent<HTMLAnchorElement>) => void;
  onSeeAll: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  onClose: () => void;
}

function SearchBody({
  state,
  online,
  hintId,
  listboxId,
  optionId,
  activeIndex,
  onRunTerm,
  onRetry,
  onSelect,
  onSeeAll,
  onClose,
}: SearchBodyProps) {
  // F2 — checked before anything else, so the reader is not left waiting on a timeout.
  if (!online) {
    return (
      <div id={hintId} className="flex items-start gap-3 py-2">
        <WifiOffIcon className="text-muted-foreground mt-0.5 size-5 shrink-0" aria-hidden="true" />
        <div>
          <p className="text-foreground text-base font-medium">Tiada sambungan internet.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Carian perlukan sambungan. Kami akan cuba semula sebaik sahaja anda kembali dalam
            talian.
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'idle') {
    return (
      <div>
        <p id={hintId} className="text-muted-foreground text-sm leading-relaxed">
          {HINT_TEXT}
        </p>
        <PopularSearches heading="Selalu dicari" onRunTerm={onRunTerm} />
      </div>
    );
  }

  if (state.status === 'short') {
    // Q1: replaces the suggestions rather than appearing beneath them, so nothing shifts.
    return (
      <p id={hintId} className="text-muted-foreground text-sm">
        Taip satu huruf lagi untuk mula mencari.
      </p>
    );
  }

  if (state.status === 'loading') {
    return (
      <div id={hintId} aria-busy="true">
        {state.slow ? (
          <p className="text-muted-foreground text-sm">Mencari…</p>
        ) : (
          // Q2: flat skeleton rows at a result row's height — no shimmer, no spinner.
          <ul aria-hidden="true" className="space-y-1">
            {[0, 1, 2].map((i) => (
              <li key={i} className="flex min-h-[56px] items-start gap-3 px-2 py-2.5">
                <span className="rounded-image bg-surface-subtle block aspect-[4/3] w-[88px] shrink-0" />
                <span className="flex-1 space-y-2 pt-1">
                  <span className="bg-surface-subtle block h-2.5 w-24 rounded" />
                  <span className="bg-surface-subtle block h-3.5 w-full rounded" />
                  <span className="bg-surface-subtle block h-3.5 w-2/3 rounded" />
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (state.status === 'error') {
    // F1: a failed request is NOT "no results" — never say "Tiada hasil" here.
    return (
      <div id={hintId}>
        <p className="text-foreground text-base font-medium">Carian gagal.</p>
        <p className="text-muted-foreground mt-1 text-sm">Semak sambungan anda dan cuba lagi.</p>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="bg-primary text-primary-foreground rounded-control inline-flex min-h-11 items-center px-5 text-sm font-medium"
          >
            Cuba lagi
          </button>
          <Link
            href="/artikel"
            onClick={onClose}
            className="text-foreground inline-flex min-h-11 items-center px-2 text-sm underline underline-offset-4"
          >
            Semua artikel
          </Link>
        </div>
      </div>
    );
  }

  const { response } = state;
  const { articles, total, mode, suggestion } = response;
  const shown = articles.length;
  const count = Math.max(total, shown);

  const suggestionButton = suggestion ? (
    <p className="text-foreground mt-2 text-sm">
      Mungkin maksud anda:{' '}
      <button
        type="button"
        onClick={() => onRunTerm(suggestion)}
        className="inline-flex min-h-11 items-center font-medium underline underline-offset-4"
      >
        {suggestion}
      </button>
    </p>
  ) : null;

  if (shown === 0) {
    // Q5 — name the miss, offer a correction and the topics we do cover.
    return (
      <div id={hintId}>
        <p className="text-foreground text-base">
          Tiada artikel untuk “<span className="font-medium">{state.query}</span>”.
        </p>
        {suggestionButton}
        <PopularSearches heading="Cuba carian ini" onRunTerm={onRunTerm} />
      </div>
    );
  }

  return (
    <div>
      <div id={hintId} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2">
        <p className="text-muted-foreground text-xs font-medium tracking-[0.08em] uppercase">
          {count} hasil
        </p>
        {mode === 'approximate' && (
          <span className="border-border text-muted-foreground rounded-full border px-2.5 py-0.5 text-[11px]">
            Padanan hampir
          </span>
        )}
      </div>
      {suggestionButton && <div className="px-2">{suggestionButton}</div>}
      <ul
        id={listboxId}
        role="listbox"
        aria-label={`Hasil carian untuk ${state.query}`}
        className="mt-2 space-y-0.5"
      >
        {articles.map((article, i) => (
          <SearchResultRow
            key={article.id}
            id={optionId(i)}
            article={article}
            query={state.query}
            active={i === activeIndex}
            onSelect={onSelect}
          />
        ))}
      </ul>
      {total > shown && (
        <a
          href={searchPageHref(state.query)}
          onClick={onSeeAll}
          className="border-hairline text-foreground mt-3 flex min-h-12 items-center justify-center gap-2 border-t pt-3 text-sm font-medium hover:underline"
        >
          Lihat semua {count} hasil
          <ArrowRightIcon className="size-4" aria-hidden="true" />
        </a>
      )}
    </div>
  );
}

function PopularSearches({
  heading,
  onRunTerm,
}: {
  heading: string;
  onRunTerm: (term: string) => void;
}) {
  const headingId = useId();
  return (
    <div className="mt-5">
      <h3 id={headingId} className="hk-eyebrow mb-2">
        {heading}
      </h3>
      <ul aria-labelledby={headingId} className="flex flex-wrap gap-2">
        {POPULAR_SEARCHES.map((term) => (
          <li key={term}>
            <button
              type="button"
              onClick={() => onRunTerm(term)}
              className="border-border text-foreground hover:border-primary hover:text-primary inline-flex min-h-11 items-center rounded-full border px-4 text-sm transition-colors"
            >
              {term}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
