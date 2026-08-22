'use client';

import { useCallback, useSyncExternalStore } from 'react';

/**
 * One localStorage key PER pinned href, not one key holding the whole list.
 *
 * The list form is a read-modify-write over a shared cell, and localStorage
 * gives us no way to make that atomic across tabs: two consoles open, each
 * holding the snapshot it read at mount, and whichever pins second writes its
 * own stale array back over the other's pin. The pin does not fail — it
 * silently disappears on the next read, which is the worst version of the bug.
 *
 * Key-per-href removes the shared cell entirely. Pinning /admin/inspire/tags
 * touches exactly that key and nothing else, so two tabs pinning two different
 * destinations both win, in any interleaving. The stored VALUE is the pin
 * timestamp, which is what preserves the "newest pin goes last" order the list
 * form got for free from array append.
 */
const FAVOURITE_PREFIX = 'admin-nav-favourite:';
// Same-tab broadcast so the desktop sidebar and the separately-mounted mobile
// sheet stay in sync when one of them mutates state. The native `storage` event
// only fires cross-tab, so we dispatch our own for same-tab consumers.
const SYNC_EVENT = 'admin:nav-state-change';

const EMPTY: readonly string[] = [];

// `useSyncExternalStore` requires a STABLE reference when the underlying value
// is unchanged, or it re-renders forever. There is no single stored string to
// key a cache on any more, so we compare the freshly-scanned list against the
// last one we returned and hand back the old array when they match. The list is
// a dozen entries at most, so the scan is cheaper than the re-render it avoids.
let cachedFavourites: string[] = EMPTY as string[];

function readFavourites(): string[] {
  if (typeof window === 'undefined') return EMPTY as string[];
  const entries: Array<[href: string, pinnedAt: number]> = [];
  try {
    const store = window.localStorage;
    for (let i = 0; i < store.length; i += 1) {
      const key = store.key(i);
      if (key == null || !key.startsWith(FAVOURITE_PREFIX)) continue;
      const href = key.slice(FAVOURITE_PREFIX.length);
      if (!href) continue;
      const at = Number(store.getItem(key));
      entries.push([href, Number.isFinite(at) ? at : 0]);
    }
  } catch {
    // Private mode / storage disabled — degrade to "no favourites", never throw.
    return EMPTY as string[];
  }
  // Oldest pin first, so the row a user pinned first stays at the top of the
  // Favourites block. Href breaks a same-millisecond tie so the order is total
  // and therefore stable between reads.
  entries.sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  return entries.map(([href]) => href);
}

function getSnapshot(): string[] {
  const next = readFavourites();
  const prev = cachedFavourites;
  if (prev.length === next.length && prev.every((href, i) => href === next[i])) return prev;
  cachedFavourites = next;
  return next;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(SYNC_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SYNC_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function writeFavourite(href: string, pinned: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    if (pinned) window.localStorage.setItem(`${FAVOURITE_PREFIX}${href}`, String(Date.now()));
    else window.localStorage.removeItem(`${FAVOURITE_PREFIX}${href}`);
  } catch {
    // Quota exceeded / private mode — nothing persists, but still notify so
    // live consumers re-read and converge on whatever did stick.
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { href } }));
}

/** Pinned nav destinations, shared by the sidebar and the mobile sheet. */
export function useFavourites() {
  const favourites = useSyncExternalStore(subscribe, getSnapshot, () => EMPTY as string[]);

  const isFavourite = useCallback((href: string) => favourites.includes(href), [favourites]);

  const toggleFavourite = useCallback((href: string) => {
    // Reads the CURRENT stored state rather than the rendered snapshot: the
    // snapshot may be a frame stale, and a pin must never be decided from a
    // stale view of the very key it is about to write.
    writeFavourite(href, !readFavourites().includes(href));
  }, []);

  return { favourites, isFavourite, toggleFavourite };
}
