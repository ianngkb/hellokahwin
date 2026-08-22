'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CornerDownLeftIcon, SearchIcon } from 'lucide-react';

import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { flattenAdminNav, resolveAdminGroups, searchAdminNav } from './admin-nav-sections';

/**
 * ⌘K / Ctrl-K jump-to-page palette.
 *
 * Built on the Dialog primitive already in the repo rather than pulling in
 * `cmdk`: the whole widget is a filtered list over a static registry of a dozen
 * destinations, which does not justify a dependency. Results come from the same
 * `searchAdminNav` the sidebar filter uses, so the two can never disagree about
 * what matches or in what order.
 */
export function AdminCommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  // The selection is tracked by HREF, not by row index. An index is a pointer
  // into a list that changes under it: type one more character, the list
  // re-ranks and shrinks, and index 2 silently comes to mean a different
  // destination — so Enter navigates somewhere the highlight was never on. An
  // href identifies the row itself, so narrowing the results either keeps the
  // same destination highlighted or, when it drops out, falls back to the first
  // row. Nothing in between.
  const [activeHref, setActiveHref] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flat = useMemo(() => flattenAdminNav(resolveAdminGroups()), []);
  const results = useMemo(() => searchAdminNav(flat, query), [flat, query]);

  // Derived, never stored: no effect, no stale-clamp window between the results
  // changing and the index being corrected.
  const activeIndex = useMemo(() => {
    const i = results.findIndex((r) => r.href === activeHref);
    return i >= 0 ? i : 0;
  }, [results, activeHref]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // `e.repeat` guard: holding ⌘K fires this handler at the OS key-repeat
      // rate, and a toggle would flap the dialog open/closed dozens of times a
      // second. Opening is also idempotent now — ⌘K means "open the palette",
      // and Escape (owned by Dialog) means close — so a repeat that slips
      // through can only re-open something already open.
      if (e.repeat) return;
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const go = useCallback(
    (href: string) => {
      setOpen(false);
      setQuery('');
      setActiveHref(null);
      router.push(href);
    },
    [router],
  );

  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveHref(results[(activeIndex + 1) % results.length].href);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveHref(results[(activeIndex - 1 + results.length) % results.length].href);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = results[activeIndex];
      if (target) go(target.href);
    }
  }

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="border-hairline bg-muted/40 text-muted-foreground hover:border-border-strong hover:text-foreground flex h-9 w-full max-w-xs items-center gap-2 rounded-[8px] border px-3 text-[13px] transition-colors"
        aria-label="Search admin pages"
      >
        <SearchIcon className="size-4 shrink-0" />
        <span className="truncate">Search…</span>
        <kbd className="border-hairline text-muted-foreground ml-auto hidden rounded border px-1.5 py-0.5 font-sans text-[10px] font-medium sm:inline">
          ⌘K
        </kbd>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton={false}
          className="top-[15%] max-w-xl translate-y-0 gap-0 overflow-hidden p-0"
        >
          <DialogTitle className="sr-only">Search admin pages</DialogTitle>
          <div className="border-hairline flex items-center gap-3 border-b px-4">
            <SearchIcon className="text-muted-foreground size-4 shrink-0" />
            {/* autoFocus is correct here: a command palette that does not
                focus its own input on open is broken, and it is only ever
                opened by an explicit user gesture (⌘K or the button). */}
            <input
              autoFocus
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onInputKeyDown}
              placeholder="Jump to a page…"
              aria-label="Jump to a page"
              className="placeholder:text-muted-foreground h-12 w-full bg-transparent text-sm outline-none"
            />
          </div>
          <div ref={listRef} className="max-h-[320px] overflow-y-auto p-2">
            {results.length === 0 ? (
              <p className="text-muted-foreground px-3 py-6 text-center text-[13px]">
                No pages found
              </p>
            ) : (
              results.map((item, i) => {
                const Icon = item.icon;
                const active = i === activeIndex;
                return (
                  <button
                    key={item.href}
                    type="button"
                    data-active={active}
                    onMouseEnter={() => setActiveHref(item.href)}
                    onClick={() => go(item.href)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-[8px] px-3 py-2 text-left text-[13.5px] transition-colors',
                      active ? 'bg-accent text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {Icon ? <Icon className="size-4 shrink-0" /> : null}
                    <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {item.context}
                    </span>
                    {active ? (
                      <CornerDownLeftIcon className="text-muted-foreground size-3.5 shrink-0" />
                    ) : null}
                  </button>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
