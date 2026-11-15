'use client';

import { useEffect } from 'react';
import { useSearch } from '@/components/search/search-provider';

/**
 * `/artikel#cari` was the masthead's search link for months and is still in
 * bookmarks and shared links. /artikel no longer carries its own search box
 * (twn has a banner slot there, and search opens from the header on every
 * page), so this renders nothing: arriving on that link just opens the search
 * screen, which is what the link was for.
 */
export function OpenSearchOnCariHash() {
  const search = useSearch();
  const openSearch = search?.openSearch;

  useEffect(() => {
    if (!openSearch || window.location.hash !== '#cari') return;
    const id = requestAnimationFrame(() => openSearch());
    return () => cancelAnimationFrame(id);
  }, [openSearch]);

  return null;
}
