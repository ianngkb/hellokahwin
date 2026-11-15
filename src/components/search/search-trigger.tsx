'use client';

import { SearchIcon } from 'lucide-react';
import { SEARCH_PAGE_PATH } from '@/lib/search/contract';
import { cn } from '@/lib/utils';
import { useSearch } from './search-provider';

import { SEARCH_PLACEHOLDER } from './copy';

type Variant =
  /** Top-bar text link "CARI" — TWN's utility-link slot, visible at every width. */
  | 'topbar'
  /** Boxed field in the main nav (desktop). `compact` makes it icon-only. */
  | 'navbar'
  /** Full-width field at the top of the phone menu. */
  | 'navbar-mobile'
  /** The large box on /artikel, with its visible "Cari" label above. */
  | 'page'
  /** 44×44 magnifier beside the phone menu button. */
  | 'icon'
  /** Plain text link, styled by the caller (footer). */
  | 'text';

interface SearchTriggerProps {
  variant: Variant;
  compact?: boolean;
  className?: string;
  /** Marks the trigger focus returns to after a shortcut-opened search. */
  header?: boolean;
  /** Runs before the screen opens (the phone menu closes itself here). */
  onBeforeOpen?: () => void;
  children?: React.ReactNode;
}

/**
 * The one door into search, in every shape the site needs.
 *
 * It is an `<a href="/cari">` that behaves as a button. Without JavaScript, or
 * before hydration — DES-06 F3 measured category pages taking 12–23 s on a cold
 * render — a tap goes to the server-rendered results page, which has a real
 * form. Once hydrated, the click is intercepted and opens the search screen
 * instead. `role="button"` because that is what it does for everyone who can
 * run it, and Space activates it like one.
 */
export function SearchTrigger({
  variant,
  compact = false,
  className,
  header = false,
  onBeforeOpen,
  children,
}: SearchTriggerProps) {
  const search = useSearch();

  const activate = (e: React.SyntheticEvent) => {
    if (!search) return; // no provider: let the link navigate to /cari
    e.preventDefault();
    onBeforeOpen?.();
    // After the phone menu has begun closing, so its own focus return does not
    // land after the search field has taken focus.
    if (onBeforeOpen) {
      setTimeout(() => search.openSearch(), 0);
    } else {
      search.openSearch();
    }
  };

  const common = {
    href: SEARCH_PAGE_PATH,
    role: 'button' as const,
    'aria-haspopup': 'dialog' as const,
    'aria-expanded': search?.open ?? false,
    'data-search-trigger': header ? 'header' : undefined,
    onClick: (e: React.MouseEvent<HTMLAnchorElement>) => {
      // Let modified clicks (new tab) through to /cari.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
      activate(e);
    },
    onKeyDown: (e: React.KeyboardEvent<HTMLAnchorElement>) => {
      if (e.key === ' ') activate(e);
    },
  };

  if (variant === 'topbar') {
    return (
      <a
        {...common}
        aria-label="Cari artikel"
        className={cn(
          // The bar is 40px; the ::after stretches the tap area to 48px.
          'text-foreground relative inline-flex min-h-10 items-center gap-1.5 px-3 after:absolute after:inset-x-0 after:-inset-y-1 after:content-[""] text-[11px] font-medium tracking-[1.1px] uppercase underline underline-offset-2 transition-opacity hover:opacity-60 md:px-[18px]',
          className,
        )}
      >
        <SearchIcon className="size-3.5 shrink-0" aria-hidden="true" />
        Cari
      </a>
    );
  }

  if (variant === 'icon') {
    return (
      <a
        {...common}
        aria-label="Cari artikel"
        className={cn(
          'text-foreground flex size-11 items-center justify-center transition-opacity hover:opacity-60',
          className,
        )}
      >
        <SearchIcon className="size-[22px]" aria-hidden="true" />
      </a>
    );
  }

  if (variant === 'text') {
    return (
      <a {...common} className={className}>
        {children ?? 'Cari'}
      </a>
    );
  }

  if (variant === 'page') {
    return (
      <div className={cn('mx-auto max-w-xl md:mx-0', className)}>
        {/* Visible name, as DES-06 §8 asks of the field this replaces. */}
        <span aria-hidden="true" className="hk-eyebrow mb-2 block">
          Cari
        </span>
        <a
          {...common}
          aria-label="Cari artikel"
          className="hk-search-input bg-background text-muted-foreground hover:text-foreground flex min-h-[2.75rem] w-full items-center gap-2.5 rounded-full border py-2.5 pr-4 pl-3.5 text-base transition-colors"
        >
          <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
          <span className="truncate">{SEARCH_PLACEHOLDER}</span>
        </a>
      </div>
    );
  }

  const isMobile = variant === 'navbar-mobile';
  return (
    <a
      {...common}
      aria-label="Cari artikel"
      aria-keyshortcuts="/ Control+K Meta+K"
      className={cn(
        'border-input bg-background text-muted-foreground hover:border-primary/40 hover:text-foreground focus-visible:ring-primary rounded-control flex items-center gap-2.5 border transition-colors focus-visible:ring-1 focus-visible:outline-none',
        isMobile ? 'h-11 w-full px-4 text-sm' : 'h-9 px-3.5 text-sm',
        className,
      )}
    >
      <SearchIcon className="size-4 shrink-0" aria-hidden="true" />
      <span
        className={cn('truncate text-left', !isMobile && (compact ? 'hidden' : 'hidden xl:inline'))}
      >
        {SEARCH_PLACEHOLDER}
      </span>
      {!isMobile && !compact && (
        <kbd className="border-border text-muted-foreground ml-auto hidden items-center rounded border px-1.5 py-0.5 text-[10px] font-medium xl:inline-flex">
          /
        </kbd>
      )}
    </a>
  );
}
