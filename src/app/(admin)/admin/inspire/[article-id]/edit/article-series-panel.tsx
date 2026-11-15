'use client';

import { useCallback, useEffect, useId, useState, useTransition } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Chip } from '@/components/ui/chip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  addClusterMemberAction,
  getArticleSeriesPanelAction,
  removeClusterMemberAction,
  type ArticleSeriesPanelData,
} from '@/app/(admin)/admin/inspire/clusters/actions';
import type { ArticleClusterMembership } from '@/lib/inspire/article-series';
import { SERIES_BOX_ON_SITE } from '@/lib/validations/article-cluster';

/**
 * The editor sidebar's **Series** panel, ported from The Wedding Notebook.
 *
 * ── What it is for ───────────────────────────────────────────────────
 * A cluster is a group of related articles; switched on, it becomes a
 * "series". This panel answers "which series is this article in?" in the
 * article's own editor, and lets the admin add it to one or take it out.
 *
 * ── Why it loads itself ──────────────────────────────────────────────
 * It is given NOTHING but the article id. It is NOT part of the edit page's
 * server render and NOT part of the article save (or autosave) payload: one
 * read on mount through `getArticleSeriesPanelAction`, and every change is
 * written the moment it is made through the cluster actions. So a slow or
 * broken series read never delays or degrades the editor, and the 60-second
 * autosave never rewrites membership.
 *
 * ── Honest about what readers get ────────────────────────────────────
 * An article may sit in several clusters but shows AT MOST ONE series: the
 * first reader-facing cluster it joined. "Switched on" and "readers see it
 * here" are two different facts and the panel states both, from the shared
 * rule in `@/lib/inspire/article-series`. While the public box is not on the
 * site (`SERIES_BOX_ON_SITE`), it says so instead of promising readers a box.
 */

export type SeriesPanelMembership = ArticleClusterMembership;
export type SeriesPanelData = ArticleSeriesPanelData;

/** "1 article" / "3 articles" — never a bare number. */
function articleCount(n: number): string {
  return n === 1 ? '1 article' : `${n} articles`;
}

const LOAD_FAILED = "Couldn't load series — refresh to try again";

export function ArticleSeriesPanel({ articleId }: { articleId: string }) {
  const pickerId = useId();
  const [data, setData] = useState<SeriesPanelData | null>(null);
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState('');
  const [busy, startTransition] = useTransition();

  const refresh = useCallback(
    async (showErrors: boolean) => {
      try {
        const result = await getArticleSeriesPanelAction(articleId);
        if ('error' in result) {
          if (showErrors) toast.error(result.error);
          else setFailed(true);
          return;
        }
        setFailed(false);
        setData(result);
      } catch {
        // A rejected action must look the same as a refused one: a panel that
        // says it could not load, never an empty list that reads as "this
        // article is in no series".
        if (showErrors) toast.error(LOAD_FAILED);
        else setFailed(true);
      } finally {
        setLoading(false);
      }
    },
    [articleId],
  );

  // ONCE on mount. Nothing re-runs this but an add or a remove.
  useEffect(() => {
    void refresh(false);
  }, [refresh]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label variant="inline" className="text-sm font-semibold">
          Series
        </Label>
        <p className="text-muted-foreground text-xs" role="status">
          Loading series…
        </p>
      </div>
    );
  }

  // A failed read must never look like "no data": distinct sentence, and no
  // list or picker that would write to a state we could not read.
  if (failed || !data) {
    return (
      <div className="space-y-2">
        <Label variant="inline" className="text-sm font-semibold">
          Series
        </Label>
        <p className="text-destructive text-xs" role="status">
          {LOAD_FAILED}
        </p>
      </div>
    );
  }

  const joined = new Set(data.memberships.map((m) => m.clusterId));
  const addable = data.clusters.filter((c) => !joined.has(c.id));
  // The series a reader really meets on this article, if any.
  const shown = data.memberships.find((m) => m.isShown);
  // The first reader-facing cluster this article joined. It owns the single
  // box slot even when it has nothing to list (no fall-through to the next).
  const winner = data.memberships.find((m) => m.isFirstEnabled);

  /** The sentence under a switched-on row that nonetheless shows no box. */
  const emptyRowNote = (m: SeriesPanelMembership): string => {
    const holder = shown ?? winner;
    return holder && holder.clusterId !== m.clusterId
      ? SERIES_BOX_ON_SITE
        ? `Readers see “${holder.name}” on this article`
        : `“${holder.name}” is the series this article shows`
      : 'No box shows here yet — this series needs another published article.';
  };

  const handleAdd = () => {
    const clusterId = picked;
    if (!clusterId) return;
    const cluster = data.clusters.find((c) => c.id === clusterId);
    startTransition(async () => {
      const result = await addClusterMemberAction({ clusterId, articleId });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Added to “${cluster?.name ?? 'the cluster'}”`);
      setPicked('');
      await refresh(true);
    });
  };

  const handleRemove = (membership: SeriesPanelMembership) => {
    startTransition(async () => {
      const result = await removeClusterMemberAction({
        clusterId: membership.clusterId,
        articleId,
      });
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success(`Removed from “${membership.name}”`);
      await refresh(true);
    });
  };

  return (
    <div className="space-y-2">
      <Label variant="inline" className="text-sm font-semibold">
        Series
      </Label>

      {!SERIES_BOX_ON_SITE ? (
        <p className="text-muted-foreground text-xs">
          The series box is not on the public site yet — readers see nothing for now.
        </p>
      ) : null}

      {data.memberships.length === 0 ? (
        <p className="text-muted-foreground text-xs">
          This article is not in any cluster yet. Add it to one below, or build a new one in{' '}
          <Link href="/admin/inspire/clusters" className="underline">
            Clusters
          </Link>
          .
        </p>
      ) : (
        <ul className="divide-hairline border-hairline divide-y rounded-md border">
          {data.memberships.map((m) => (
            <li key={m.clusterId} className="space-y-1 p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 space-y-1">
                  <Link
                    href={`/admin/inspire/clusters/${m.clusterId}`}
                    className="block text-sm font-medium break-words underline-offset-2 hover:underline"
                  >
                    {m.name}
                  </Link>
                  <div className="flex flex-wrap gap-1">
                    {m.seriesEnabled ? (
                      <Chip variant="info" size="sm">
                        {SERIES_BOX_ON_SITE ? 'Shown to readers' : 'Series on'}
                      </Chip>
                    ) : null}
                    {m.isShown ? (
                      <Chip variant="success" size="sm">
                        {SERIES_BOX_ON_SITE
                          ? 'Readers see this one here'
                          : 'This article shows this one'}
                      </Chip>
                    ) : null}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={busy}
                  aria-label={`Remove this article from ${m.name}`}
                  onClick={() => handleRemove(m)}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
              {m.seriesEnabled && !m.isShown ? (
                <p className="text-muted-foreground text-xs">{emptyRowNote(m)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {/* Add to a cluster — saved immediately, appended at the end. */}
      <div className="space-y-1 pt-1">
        <Label htmlFor={pickerId} className="text-xs font-semibold">
          Add to a cluster
        </Label>
        {addable.length === 0 ? (
          <p className="text-muted-foreground text-xs">
            {data.clusters.length === 0
              ? 'There are no clusters yet.'
              : 'This article is already in every cluster.'}
          </p>
        ) : (
          <div className="flex gap-2">
            <Select value={picked} onValueChange={setPicked} disabled={busy}>
              <SelectTrigger id={pickerId} className="w-full">
                <SelectValue placeholder="Pick a cluster" />
              </SelectTrigger>
              <SelectContent>
                {addable.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} · {articleCount(c.memberCount)}
                    {c.seriesEnabled ? ' · series on' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="button" size="sm" disabled={busy || !picked} onClick={handleAdd}>
              Add
            </Button>
          </div>
        )}
        <p className="text-muted-foreground text-xs">
          The article goes to the end of the list. To change the reading order, or the intro readers
          see, open the cluster.
        </p>
      </div>
    </div>
  );
}
