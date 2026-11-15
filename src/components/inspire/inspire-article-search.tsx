'use client';

import { useEffect } from 'react';
import { SearchTrigger } from '@/components/search/search-trigger';
import { useSearch } from '@/components/search/search-provider';

/**
 * The search box on /artikel (inside the page's `id="cari"` wrapper).
 *
 * It used to be a second, separate search with its own dropdown. It is now a
 * door into the same search screen the header opens (components/search), so
 * the site has one search with one behaviour. Without JavaScript it is a link
 * to /cari, the server-rendered results page with a real form (DES-06 F3).
 *
 * `/artikel#cari` was the masthead's search link for months and is still in
 * bookmarks and shared links. Arriving on it opens the search screen, which is
 * what that link was for.
 */
export function InspireArticleSearch() {
  const search = useSearch();
  const openSearch = search?.openSearch;

  useEffect(() => {
    if (!openSearch || window.location.hash !== '#cari') return;
    const id = requestAnimationFrame(() => openSearch());
    return () => cancelAnimationFrame(id);
  }, [openSearch]);

  return <SearchTrigger variant="page" />;
}
