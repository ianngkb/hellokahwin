/**
 * One search session id, shared by every search surface.
 *
 * Was previously duplicated as a private helper in `search-modal.tsx` while
 * `inspire-article-search.tsx` minted a fresh `crypto.randomUUID()` on EVERY
 * click — so each click looked like its own session and any
 * `COUNT(DISTINCT session_id)` in /admin/search-analytics was meaningless.
 *
 * Backed by `sessionStorage`, so it survives navigation within a tab but not a
 * new tab — which is the intended grain for "one search session".
 */
const STORAGE_KEY = 'search_session_id';

export function getSearchSessionId(): string {
  if (typeof window === 'undefined') return '';
  try {
    let id = sessionStorage.getItem(STORAGE_KEY);
    if (!id) {
      id = crypto.randomUUID();
      sessionStorage.setItem(STORAGE_KEY, id);
    }
    return id;
  } catch {
    // Private mode / storage disabled — telemetry must never break search.
    return '';
  }
}
