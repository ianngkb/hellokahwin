'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SearchDialog } from './search-dialog';

interface SearchContextValue {
  open: boolean;
  /** Open the search screen, optionally pre-filled with a query. */
  openSearch: (query?: string) => void;
  closeSearch: () => void;
}

const SearchContext = createContext<SearchContextValue | null>(null);

/**
 * Access the site search screen. Returns null outside a <SearchProvider>, so a
 * trigger rendered somewhere without the provider degrades to its plain
 * `/cari` link instead of throwing.
 */
export function useSearch(): SearchContextValue | null {
  return useContext(SearchContext);
}

/** True while the reader is typing into some other field — shortcuts must not fire there. */
export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (
    target.isContentEditable ||
    target.closest('[contenteditable]:not([contenteditable="false"])')
  )
    return true;
  const tag = target.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/**
 * Mounts ONE search screen for every public page and owns the ways into it:
 * the header trigger, the /artikel box, the footer link, and the `/` and
 * Ctrl/⌘K shortcuts (DES-06 §8 — "anywhere except inside a field").
 *
 * Focus return: Radix only restores focus to a `<Dialog.Trigger>`, and these
 * triggers live outside the dialog's tree. So the element that had focus when
 * the screen opened is remembered and given focus back on close. Opened by
 * shortcut from the page body, or from the phone menu (whose button is gone
 * once the menu closes), focus falls back to the visible header trigger.
 */
export function SearchProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState('');
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openSearch = useCallback((query = '') => {
    const active = document.activeElement;
    returnFocusRef.current =
      active instanceof HTMLElement && active !== document.body ? active : null;
    setInitialQuery(query);
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (open || e.defaultPrevented || e.isComposing) return;
      if (isEditableTarget(e.target)) return;
      const isSlash = e.key === '/' && !e.metaKey && !e.ctrlKey && !e.altKey;
      const isCmdK = (e.metaKey || e.ctrlKey) && !e.altKey && e.key.toLowerCase() === 'k';
      if (!isSlash && !isCmdK) return;
      e.preventDefault();
      openSearch();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, openSearch]);

  const restoreFocus = useCallback(() => {
    const prev = returnFocusRef.current;
    returnFocusRef.current = null;
    // Gone (the phone menu closed around it) → fall back to the header trigger.
    if (prev && prev.isConnected) {
      prev.focus();
      return;
    }
    // The visible header trigger: the top-bar one on phones, the boxed one on desktop.
    const triggers = document.querySelectorAll<HTMLElement>('[data-search-trigger="header"]');
    for (const el of triggers) {
      if (el.getClientRects().length > 0) {
        el.focus();
        return;
      }
    }
  }, []);

  const value = useMemo(() => ({ open, openSearch, closeSearch }), [open, openSearch, closeSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      <SearchDialog
        open={open}
        onOpenChange={setOpen}
        initialQuery={initialQuery}
        onCloseAutoFocus={restoreFocus}
      />
    </SearchContext.Provider>
  );
}
