'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';
import { SearchIcon } from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { FormField } from '@/components/ui/form-field';
import { Input } from '@/components/ui/input';
import { ArticleStatusChip } from '@/components/admin/article-status-chip';
import { searchArticlesForPickerAction } from '@/app/(admin)/admin/inspire/analytics/actions';
import { capMessage } from '@/lib/analytics/compare-limits';
import {
  capPickerQuery,
  isSearchableTerm,
  pickerTerm,
  pickerTermLength,
  PICKER_MAX_TERM_CHARS,
} from '@/app/(admin)/admin/inspire/analytics/picker-term';

/** One article as the picker shows it. */
export interface PickerArticle {
  id: string;
  title: string;
  status: string;
}

/**
 * Search-and-pick several Inspire articles. Typing 2+ characters searches
 * titles (250 ms debounce); picking a result adds it as a removable chip;
 * picking past `max` is refused with a message instead of silently dropping
 * the oldest. `disabledIds` are shown but cannot be picked (e.g. already in
 * the cluster). The parent owns `value` — on the comparison page that is the
 * URL, so `onChange` navigates.
 *
 * Results are keyed by the term they answer, so the previous term's rows are
 * never shown (or clickable) under a newer one, and an out-of-order response
 * cannot overwrite a newer one (the popups tag picker's lesson). A response
 * that lands after the term changed, the box was cleared, or the picker
 * unmounted is dropped — no stale rows, no unrelated error toast.
 *
 * A FAILED search (not authorised, database error, network) is its own state
 * with a persistent "couldn't search" message — never the "No articles match"
 * line, which would tell the admin the article does not exist (I-F15). The
 * box holds at most PICKER_MAX_TERM_CHARS characters, the same cap the server
 * applies, so what is on screen is exactly what was searched (I-F14).
 *
 * Each pick or removal builds on the LATEST selection this picker emitted, not
 * on the `value` prop alone: on the comparison page `value` comes from the URL
 * and lags until navigation commits, so two quick picks would otherwise each
 * start from the same stale list and the second would drop the first.
 */
export function ArticleMultiPicker({
  value,
  onChange,
  max,
  disabledIds = [],
  disabled = false,
  label = 'Search articles by title',
  hint,
  overCapMessage,
}: {
  value: PickerArticle[];
  onChange: (next: PickerArticle[]) => void;
  max: number;
  disabledIds?: readonly string[];
  disabled?: boolean;
  label?: string;
  /** Replaces the default "N of max picked." line under the box. */
  hint?: string;
  /**
   * Shown when a pick would pass `max`. Defaults to the comparison page's
   * "Compare up to N articles at a time. Remove one to add another."
   */
  overCapMessage?: string;
}) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<{
    term: string;
    articles: PickerArticle[];
    /** Set when the search failed — shown instead of "No articles match". */
    error: string | null;
  } | null>(null);
  const [refused, setRefused] = useState(false);
  const [pending, startSearch] = useTransition();
  const seq = useRef(0);
  // The selection as of the last emitted change (or the last new `value`).
  const latest = useRef(value);
  useLayoutEffect(() => {
    latest.current = value;
  }, [value]);

  const term = pickerTerm(query);
  const searching = !disabled && isSearchableTerm(query);
  const current = searching && result?.term === term ? result : null;
  const visibleMatches = current?.articles ?? [];
  const searchError = current?.error ?? null;
  const stillLooking = searching && (pending || result?.term !== term);
  const atCap = pickerTermLength(query) >= PICKER_MAX_TERM_CHARS;
  const full = value.length >= max;

  useEffect(() => {
    if (!searching) return;
    const requests = seq; // a counter, not a DOM ref: the cleanup MUST see its latest value
    const mine = ++requests.current;
    const timer = setTimeout(() => {
      startSearch(async () => {
        try {
          const res = await searchArticlesForPickerAction(query);
          if (mine !== requests.current) return;
          if ('articles' in res) {
            setResult({ term: query.trim(), articles: res.articles, error: null });
            return;
          }
          setResult({ term: query.trim(), articles: [], error: res.error });
          toast.error(res.error);
        } catch {
          if (mine !== requests.current) return;
          const error = 'Could not search articles — please try again.';
          setResult({ term: query.trim(), articles: [], error });
          toast.error(error);
        }
      });
    }, 250);
    return () => {
      clearTimeout(timer);
      // Invalidate this request: the term changed, searching stopped (box
      // cleared / picker disabled), or the picker unmounted.
      requests.current++;
    };
  }, [query, searching]);

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
    <FormField
      label={label}
      htmlFor={inputId}
      hint={
        hint ??
        (full
          ? `${value.length} of ${max} picked — remove one to add another.`
          : `${value.length} of ${max} picked.`)
      }
    >
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
          onChange={(e) => setQuery(capPickerQuery(e.target.value))}
          placeholder="Search articles by title…"
          className="pl-8"
          disabled={disabled}
          autoComplete="off"
        />
      </div>
      {refused && (
        <p className="text-error text-[12px]" role="alert">
          {overCapMessage ?? `${capMessage(max)}. Remove one to add another.`}
        </p>
      )}
      {visibleMatches.length > 0 && (
        <ul
          className="border-hairline max-h-64 overflow-y-auto rounded-[6px] border"
          aria-label="Matching articles"
        >
          {visibleMatches.map((article) => {
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
      {atCap && (
        <p className="text-muted-foreground text-[11.5px]">
          Searches use up to {PICKER_MAX_TERM_CHARS} characters.
        </p>
      )}
      {stillLooking && <p className="text-muted-foreground text-[11.5px]">Searching…</p>}
      {searching && !stillLooking && searchError && (
        <p className="text-error text-[12px]" role="alert">
          {searchError.startsWith('Could not')
            ? searchError
            : `Couldn’t search articles: ${searchError}`}
        </p>
      )}
      {searching && !stillLooking && !searchError && visibleMatches.length === 0 && (
        <p className="text-muted-foreground text-[11.5px]">
          No articles match &ldquo;{term}&rdquo;.
        </p>
      )}
    </FormField>
  );
}
