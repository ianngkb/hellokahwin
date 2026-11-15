'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { SEARCH_API_PATH, type SearchResponse } from '@/lib/search/contract';

/** Results shown in the search screen; the rest are one tap away on /cari. */
export const PANEL_LIMIT = 6;
export const MIN_QUERY_LENGTH = 2;
export const DEBOUNCE_MS = 250;
/** DES-06 Q2: after this long the skeletons give way to "Mencari…". */
export const SLOW_AFTER_MS = 3000;
/** DES-06 F1: a request still pending after this long has failed. */
export const TIMEOUT_MS = 8000;

export type SearchState =
  | { status: 'idle' }
  | { status: 'short' }
  | { status: 'loading'; query: string; slow: boolean }
  | { status: 'success'; query: string; response: SearchResponse }
  | { status: 'error'; query: string };

function isSearchResponse(value: unknown): value is SearchResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return Array.isArray(v.articles) && typeof v.total === 'number' && typeof v.mode === 'string';
}

function subscribeOnline(cb: () => void) {
  window.addEventListener('online', cb);
  window.addEventListener('offline', cb);
  return () => {
    window.removeEventListener('online', cb);
    window.removeEventListener('offline', cb);
  };
}

/** `navigator.onLine`, live. Assumed online on the server. */
export function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/**
 * The search screen's request machinery: debounce, abort of stale requests,
 * an 8-second timeout, and a failure state that is never confused with an
 * empty result (DES-06 F1 — the defect the old field shipped).
 *
 * State changes happen in the callbacks the screen calls from its own event
 * handlers (`search`, `searchNow`, `reset`), never in a render-time effect.
 */
export function useArticleSearch() {
  const [state, setState] = useState<SearchState>({ status: 'idle' });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slowRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const lastQueryRef = useRef('');

  const cancel = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (slowRef.current) clearTimeout(slowRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    debounceRef.current = slowRef.current = timeoutRef.current = null;
    controllerRef.current?.abort();
    controllerRef.current = null;
  }, []);

  useEffect(() => cancel, [cancel]);

  const run = useCallback(
    async (query: string) => {
      cancel();
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        // F2: the screen shows the offline state; the `online` listener re-runs this.
        return;
      }
      const controller = new AbortController();
      controllerRef.current = controller;
      let timedOut = false;

      setState({ status: 'loading', query, slow: false });
      slowRef.current = setTimeout(() => {
        setState((s) => (s.status === 'loading' && s.query === query ? { ...s, slow: true } : s));
      }, SLOW_AFTER_MS);
      timeoutRef.current = setTimeout(() => {
        timedOut = true;
        controller.abort();
      }, TIMEOUT_MS);

      const params = new URLSearchParams({ q: query, limit: String(PANEL_LIMIT) });
      try {
        const res = await fetch(`${SEARCH_API_PATH}?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!res.ok) throw new Error(`search ${res.status}`);
        const json: unknown = await res.json();
        const data = (json as { data?: unknown } | null)?.data;
        if (!isSearchResponse(data)) throw new Error('search: unexpected response');
        if (controllerRef.current !== controller) return; // superseded
        setState({ status: 'success', query, response: data });
      } catch {
        // An abort we caused by superseding the request is not a failure.
        if (controller.signal.aborted && !timedOut) return;
        if (controllerRef.current !== controller) return;
        setState({ status: 'error', query });
      } finally {
        if (controllerRef.current === controller) {
          if (slowRef.current) clearTimeout(slowRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          slowRef.current = timeoutRef.current = null;
          controllerRef.current = null;
        }
      }
    },
    [cancel],
  );

  /** Run `raw` now (chips, retry, a pre-filled open). */
  const searchNow = useCallback(
    (raw: string) => {
      const query = raw.trim();
      lastQueryRef.current = query;
      if (query.length === 0) {
        cancel();
        setState({ status: 'idle' });
      } else if (query.length < MIN_QUERY_LENGTH) {
        cancel();
        setState({ status: 'short' });
      } else {
        void run(query);
      }
    },
    [cancel, run],
  );

  /** Run `raw` after the reader pauses typing. */
  const search = useCallback(
    (raw: string) => {
      const query = raw.trim();
      if (query.length < MIN_QUERY_LENGTH) {
        searchNow(raw);
        return;
      }
      lastQueryRef.current = query;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        debounceRef.current = null;
        void run(query);
      }, DEBOUNCE_MS);
    },
    [run, searchNow],
  );

  const reset = useCallback(() => {
    cancel();
    lastQueryRef.current = '';
    setState({ status: 'idle' });
  }, [cancel]);

  const retry = useCallback(() => searchNow(lastQueryRef.current), [searchNow]);

  // F2 recovery: the connection coming back re-runs the last query, no tap needed.
  useEffect(() => {
    const onOnline = () => {
      if (lastQueryRef.current.length >= MIN_QUERY_LENGTH) void run(lastQueryRef.current);
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, [run]);

  return { state, search, searchNow, reset, retry };
}
