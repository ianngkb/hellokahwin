'use client';

import { useCallback, useSyncExternalStore } from 'react';

const FAVOURITES_KEY = 'admin-nav-favourites';
// Same-tab broadcast so the desktop sidebar and the separately-mounted mobile
// sheet stay in sync when one of them mutates state. The native `storage` event
// only fires cross-tab, so we dispatch our own for same-tab consumers.
const SYNC_EVENT = 'admin:nav-state-change';

const EMPTY: readonly string[] = [];

// Per-key snapshot cache. `useSyncExternalStore` requires a STABLE reference
// when the underlying value is unchanged, otherwise it re-renders forever. We
// key the cache on the raw stored string and only re-parse when that changes.
const snapshotCache = new Map<string, { raw: string | null; value: string[] }>();

function parseList(raw: string | null): string[] {
  if (!raw) return EMPTY as string[];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : (EMPTY as string[]);
  } catch {
    return EMPTY as string[];
  }
}

function getSnapshot(key: string): string[] {
  if (typeof window === 'undefined') return EMPTY as string[];
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    // Private mode / storage disabled — degrade to "no favourites", never throw.
    return EMPTY as string[];
  }
  const cached = snapshotCache.get(key);
  if (cached && cached.raw === raw) return cached.value;
  const value = parseList(raw);
  snapshotCache.set(key, { raw, value });
  return value;
}

function subscribe(callback: () => void): () => void {
  window.addEventListener(SYNC_EVENT, callback);
  window.addEventListener('storage', callback);
  return () => {
    window.removeEventListener(SYNC_EVENT, callback);
    window.removeEventListener('storage', callback);
  };
}

function writeList(key: string, value: string[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded / private mode — nothing persists, but still notify so
    // live consumers re-read and converge on whatever did stick.
  }
  window.dispatchEvent(new CustomEvent(SYNC_EVENT, { detail: { key } }));
}

/** A `localStorage`-backed string list, SSR-safe and synced across mounts. */
function usePersistedList(key: string): [string[], (next: string[]) => void] {
  const value = useSyncExternalStore(
    subscribe,
    () => getSnapshot(key),
    () => EMPTY as string[],
  );
  const update = useCallback((next: string[]) => writeList(key, next), [key]);
  return [value, update];
}

/** Pinned nav destinations, shared by the sidebar and the mobile sheet. */
export function useFavourites() {
  const [favourites, setFavourites] = usePersistedList(FAVOURITES_KEY);

  const isFavourite = useCallback((href: string) => favourites.includes(href), [favourites]);

  const toggleFavourite = useCallback(
    (href: string) => {
      setFavourites(
        favourites.includes(href) ? favourites.filter((h) => h !== href) : [...favourites, href],
      );
    },
    [favourites, setFavourites],
  );

  return { favourites, isFavourite, toggleFavourite };
}
