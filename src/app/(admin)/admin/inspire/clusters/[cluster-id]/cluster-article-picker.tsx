'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { SearchIcon } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { searchClusterArticlesAction, type ClusterPickerArticle } from '../actions';
import { ArticleStatusChip } from '../cluster-ui';

export type PickerArticle = ClusterPickerArticle;

/** The search box's cap, the same one the server applies. */
const PICKER_MAX_TERM_CHARS = 120;

function capQuery(value: string): string {
  return Array.from(value).slice(0, PICKER_MAX_TERM_CHARS).join('');
}

/**
 * Search-and-pick several Inspire articles for a cluster — a trimmed port of
 * TWN's `ArticleMultiPicker`. Typing 2+ characters searches titles (250 ms
 * debounce); picking a result adds it as a removable chip; picking past `max`
 * is refused with a message instead of silently dropping one. `disabledIds`
 * (already members) are shown but cannot be picked.
 *
 * Results are keyed by the term they answer, so an out-of-order response can
 * never show the previous term's rows under a newer one. A FAILED search is
 * its own state ("couldn't search"), never "No articles match", which would
 * tell the admin the article does not exist.
 */
export function ClusterArticlePicker({
  value,
  onChange,
  max,
  disabledIds = [],
  disabled = false,
  hint,
  overCapMessage,
}: {
  value: PickerArticle[];
  onChange: (next: PickerArticle[]) => void;
  max: number;
  disabledIds?: readonly string[];
  disabled?: boolean;
  hint?: string;
  overCapMessage: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{
    term: string;
    articles: PickerArticle[];
    error: string | null;
  } | null>(null);
  const [refused, setRefused] = useState(false);
  const [pending, startSearch] = useTransition();
  const seq = useRef(0);
  // The selection as of the last emitted change, so two quick picks never
  // both start from the same stale `value`.
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);

  const term = query.trim();
  const searching = !disabled && Array.from(term).length >= 2;
  const current = searching && result?.term === term ? result : null;
  const matches = current?.articles ?? [];
  const searchError = current?.error ?? null;
  const stillLooking = searching && (pending || result?.term !== term);

  useEffect(() => {
    if (!searching) return;
    const requests = seq;
    const mine = ++requests.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          const res = await searchClusterArticlesAction(term);
          if (mine !== requests.current) return;
          if ('articles' in res) setResult({ term, articles: res.articles, error: null });
          else setResult({ term, articles: [], error: res.error });
        } catch {
          if (mine !== requests.current) return;
          setResult({ term, articles: [], error: 'Could not search articles — please try again.' });
        }
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      // Invalidate this request: the term changed, searching stopped, or the
      // picker unmounted.
      requests.current++;
    };
  }, [term, searching]);

  const picked = new Set(value.map((a) => a.id));
  const blocked = new Set(disabledIds);

  function emit(next: PickerArticle[]) {
    latest.current = next;
    onChange(next);
  }

  function pick(article: PickerArticle) {
    const base = latest.current;
    if (base.some((a) => a.id === article.id) || blocked.has(article.id)) return;
    if (base.length >= max) {
      setRefused(true);
      return;
    }
    setRefused(false);
    emit([...base, article]);
  }

  function remove(id: string) {
    setRefused(false);
    emit(latest.current.filter((a) => a.id !== id));
  }

  return (
    <FormField label="Search articles by title" htmlFor={inputId} hint={hint}>
      {value.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Picked articles">
          {value.map((a) => (
            <li key={a.id} className="max-w-full min-w-0">
              <Chip
                variant="solid"
                onRemove={disabled ? undefined : () => remove(a.id)}
                removeLabel={`Remove ${a.title}`}
                className="text-foreground max-w-full"
              >
                <span className="max-w-[16rem] truncate sm:max-w-[22rem]" title={a.title}>
                  {a.title}
                </span>
              </Chip>
            </li>
          ))}
        </ul>
      )}
      <div className="relative">
        <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
        <Input
          id={inputId}
          value={query}
          onChange={(e) => setQuery(capQuery(e.target.value))}
          placeholder="Search articles by title…"
          className="pl-8"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      {refused && (
        <p className="text-error text-[12px]" role="alert">
          {overCapMessage}
        </p>
      )}
      {matches.length > 0 && (
        <ul
          className="border-hairline max-h-64 overflow-y-auto rounded-[6px] border"
          aria-label="Matching articles"
        >
          {matches.map((article) => {
            const already = picked.has(article.id);
            const off = blocked.has(article.id);
            return (
              <li key={article.id}>
                <button
                  type="button"
                  onClick={() => pick(article)}
                  disabled={already || off}
                  className="hover:bg-surface-raised flex w-full min-w-0 items-center gap-2 px-3 py-2 text-left text-[13px] disabled:cursor-default disabled:opacity-60"
                >
                  <span className="min-w-0 flex-1 truncate" title={article.title}>
                    {article.title}
                  </span>
                  {(already || off) && (
                    <span className="text-muted-foreground shrink-0 text-[11px]">
                      {already ? 'Picked' : 'Already added'}
                    </span>
                  )}
                  <ArticleStatusChip status={article.status} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {stillLooking && <p className="text-muted-foreground text-[11.5px]">Searching…</p>}
      {searching && !stillLooking && searchError && (
        <p className="text-error text-[12px]" role="alert">
          {searchError.startsWith('Could not')
            ? searchError
            : `Couldn’t search articles: ${searchError}`}
        </p>
      )}
      {searching && !stillLooking && !searchError && matches.length === 0 && (
        <p className="text-muted-foreground text-[11.5px]">
          No articles match &ldquo;{term}&rdquo;.
        </p>
      )}
    </FormField>
  );
}
