'use client';

import { useOptimistic, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ArticleMultiPicker, type PickerArticle } from '@/components/admin/article-multi-picker';
import { Panel } from '@/components/admin/analytics-panels';
import { MAX_COMPARE_ARTICLES } from '@/lib/analytics/compare-limits';
import { compareHref } from './compare-params';

/**
 * The comparison page's picker. The selection IS the URL (`?ids=`), so a pick
 * or a removal navigates and the server re-renders the comparison — the view
 * is bookmarkable and a reload shows the same articles.
 *
 * The server's `selected` lags until a navigation commits, so while one is
 * pending the picker shows the selection the admin just made (`useOptimistic`),
 * not the stale prop, and the picker builds each change on the latest one it
 * emitted — two quick picks keep both. Once nothing is pending the URL-backed
 * `selected` is the truth again.
 */
export function ComparePicker({ selected }: { selected: PickerArticle[] }) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [value, setOptimistic] = useOptimistic(selected);

  return (
    <Panel className="flex min-w-0 flex-col gap-2 p-4">
      <ArticleMultiPicker
        value={value}
        max={MAX_COMPARE_ARTICLES}
        onChange={(next) =>
          startNavigation(() => {
            setOptimistic(next);
            router.push(compareHref(next.map((a) => a.id)), { scroll: false });
          })
        }
      />
      {navigating && (
        <p className="text-muted-foreground text-[11.5px]" role="status">
          Updating the comparison…
        </p>
      )}
    </Panel>
  );
}
