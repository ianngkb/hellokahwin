'use client';

import { useState, useMemo } from 'react';
import { SectionCard } from '@/components/ui/section-card';
import { Chip } from '@/components/ui/chip';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { executeTagMergeAction } from '../actions';
import type { MergeGroup } from '@/lib/utils/tag-similarity';
import type { TagWithCounts } from '@/lib/utils/tag-similarity';
import { toast } from 'sonner';

interface MergeReviewProps {
  groups: MergeGroup[];
}

function pickWinner(tags: TagWithCounts[]): string {
  let best = tags[0];
  for (let i = 1; i < tags.length; i++) {
    const t = tags[i];
    if (
      t.articleCount > best.articleCount ||
      (t.articleCount === best.articleCount && t.listingCount > best.listingCount)
    ) {
      best = t;
    }
  }
  return best.id;
}

export function MergeReview({ groups }: MergeReviewProps) {
  // Track which tag IDs have been removed (merged or skipped)
  const [removedTagIds, setRemovedTagIds] = useState<Set<string>>(new Set());
  // Per-group: which tags are checked
  const [checked, setChecked] = useState<Record<number, Set<string>>>(() => {
    const initial: Record<number, Set<string>> = {};
    groups.forEach((g, i) => {
      initial[i] = new Set(g.tags.map((t) => t.id));
    });
    return initial;
  });
  // Per-group: override winner (null = auto-pick from checked)
  const [winnerOverrides, setWinnerOverrides] = useState<Record<number, string | null>>({});
  const [executingGroup, setExecutingGroup] = useState<number | null>(null);
  const [confirmIdx, setConfirmIdx] = useState<number | null>(null);

  // Compute visible groups (filter out removed tags, drop groups with < 2 remaining)
  const visibleGroups = useMemo(() => {
    return groups
      .map((group, idx) => ({
        originalIdx: idx,
        tags: group.tags.filter((t) => !removedTagIds.has(t.id)),
      }))
      .filter((g) => g.tags.length >= 2);
  }, [groups, removedTagIds]);

  const totalRemaining = visibleGroups.reduce((sum, g) => sum + g.tags.length, 0);

  function toggleTag(groupIdx: number, tagId: string) {
    setChecked((prev) => {
      const next = new Set(prev[groupIdx]);
      if (next.has(tagId)) {
        next.delete(tagId);
        // If removed tag was the winner override, clear it
        if (winnerOverrides[groupIdx] === tagId) {
          setWinnerOverrides((wo) => ({ ...wo, [groupIdx]: null }));
        }
      } else {
        next.add(tagId);
      }
      return { ...prev, [groupIdx]: next };
    });
  }

  function getWinner(groupIdx: number, visibleTags: TagWithCounts[]): string | null {
    const checkedTags = visibleTags.filter((t) => checked[groupIdx]?.has(t.id));
    if (checkedTags.length < 2) return null;
    const override = winnerOverrides[groupIdx];
    if (override && checkedTags.some((t) => t.id === override)) return override;
    return pickWinner(checkedTags);
  }

  function getCheckedCount(groupIdx: number, visibleTags: TagWithCounts[]): number {
    return visibleTags.filter((t) => checked[groupIdx]?.has(t.id)).length;
  }

  /**
   * Merging into a hidden winner silently de-publishes every public loser: the
   * articles lose their public tag and the loser's archive page starts 404ing.
   * Warn only — the merge stays confirmable (product decision).
   */
  function getHiddenWinnerWarning(
    groupIdx: number,
    visibleTags: TagWithCounts[],
  ): { winner: TagWithCounts; publicLosers: TagWithCounts[] } | null {
    const winnerId = getWinner(groupIdx, visibleTags);
    if (!winnerId) return null;
    const checkedTags = visibleTags.filter((t) => checked[groupIdx]?.has(t.id));
    const winner = checkedTags.find((t) => t.id === winnerId);
    if (!winner?.isHidden) return null;
    const publicLosers = checkedTags.filter((t) => t.id !== winnerId && !t.isHidden);
    return publicLosers.length > 0 ? { winner, publicLosers } : null;
  }

  async function handleMerge(groupIdx: number, visibleTags: TagWithCounts[]) {
    setConfirmIdx(null);
    setExecutingGroup(groupIdx);

    const checkedTags = visibleTags.filter((t) => checked[groupIdx]?.has(t.id));
    const winnerId = getWinner(groupIdx, visibleTags)!;
    const loserIds = checkedTags.filter((t) => t.id !== winnerId).map((t) => t.id);

    const { error, summary } = await executeTagMergeAction([{ winnerId, loserIds }]);

    if (error) {
      toast.error(error);
    } else {
      toast.success(
        `Merged ${checkedTags.length} tags, removed ${summary.tagsRemoved} duplicate${summary.tagsRemoved !== 1 ? 's' : ''}`,
      );
      // Remove all merged tags from view (losers are gone, winner stays but leaves the group)
      setRemovedTagIds((prev) => {
        const next = new Set(prev);
        for (const id of loserIds) next.add(id);
        // Winner is resolved — also remove from merge tool
        next.add(winnerId);
        return next;
      });
    }

    setExecutingGroup(null);
  }

  function handleSkip(groupIdx: number, visibleTags: TagWithCounts[]) {
    const checkedTags = visibleTags.filter((t) => checked[groupIdx]?.has(t.id));
    setRemovedTagIds((prev) => {
      const next = new Set(prev);
      for (const t of checkedTags) next.add(t.id);
      return next;
    });
    toast.success(`Skipped ${checkedTags.length} tag${checkedTags.length !== 1 ? 's' : ''}`);
  }

  if (visibleGroups.length === 0) {
    return (
      <p className="text-muted-foreground">
        All groups have been resolved. No duplicates remaining.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground text-sm">
        <span className="text-foreground font-mono font-medium tabular-nums">
          {visibleGroups.length}
        </span>{' '}
        group{visibleGroups.length !== 1 ? 's' : ''} remaining
        {' \u2014 '}
        <span className="text-foreground font-mono font-medium tabular-nums">
          {totalRemaining}
        </span>{' '}
        tags
      </p>

      {visibleGroups.map(({ originalIdx, tags: visibleTags }) => {
        const isExecuting = executingGroup === originalIdx;
        const checkedCount = getCheckedCount(originalIdx, visibleTags);
        const winnerId = getWinner(originalIdx, visibleTags);

        return (
          <SectionCard
            key={originalIdx}
            title={
              <span className="flex items-center gap-2">
                Group {originalIdx + 1}
                <Chip variant="solid" size="sm">
                  {visibleTags.length} tags
                </Chip>
              </span>
            }
            headerAction={
              <div className="flex items-center gap-2">
                <Button
                  variant="quiet"
                  size="sm"
                  onClick={() => handleSkip(originalIdx, visibleTags)}
                  disabled={isExecuting || checkedCount === 0}
                >
                  Skip{checkedCount > 0 ? ` (${checkedCount})` : ''}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setConfirmIdx(originalIdx)}
                  disabled={isExecuting || checkedCount < 2}
                >
                  {isExecuting ? 'Merging...' : `Merge (${checkedCount})`}
                </Button>
              </div>
            }
            bodyClassName="space-y-2"
          >
            {(() => {
              const warning = getHiddenWinnerWarning(originalIdx, visibleTags);
              if (!warning) return null;
              return (
                <div className="rounded-card border-warning/40 bg-warning-subtle text-warning-strong border px-4 py-3 text-sm">
                  The winner <span className="font-medium">{warning.winner.name}</span> is a hidden
                  tag. Merging will move{' '}
                  {warning.publicLosers.map((t, i) => (
                    <span key={t.id}>
                      {i > 0 ? ', ' : ''}
                      <span className="font-medium">{t.name}</span>
                    </span>
                  ))}{' '}
                  into it, so {warning.publicLosers.length === 1 ? 'its' : 'their'} articles will
                  lose their public tag and {warning.publicLosers.length === 1 ? 'its' : 'their'}{' '}
                  archive page{warning.publicLosers.length === 1 ? '' : 's'} will start returning
                  404. Pick a public winner instead if that is not what you want.
                </div>
              );
            })()}
            {visibleTags.map((tag) => {
              const isChecked = checked[originalIdx]?.has(tag.id) ?? false;
              const isWinner = winnerId === tag.id;

              return (
                <div
                  key={tag.id}
                  className="border-hairline rounded-card flex items-center gap-3 border p-3"
                >
                  <Checkbox
                    id={`tag-${tag.id}`}
                    checked={isChecked}
                    onCheckedChange={() => toggleTag(originalIdx, tag.id)}
                    disabled={isExecuting}
                  />
                  <Label
                    htmlFor={`tag-${tag.id}`}
                    variant="inline"
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium">{tag.name}</span>
                    <span className="text-muted-foreground ml-2 text-xs">/{tag.slug}</span>
                    {tag.isHidden && (
                      <Chip variant="outline" size="sm" className="ml-2">
                        Hidden
                      </Chip>
                    )}
                  </Label>
                  <div className="flex gap-2">
                    <Chip variant="outline" size="sm">
                      {tag.articleCount} article{tag.articleCount !== 1 ? 's' : ''}
                    </Chip>
                    <Chip variant="outline" size="sm">
                      {tag.listingCount} listing{tag.listingCount !== 1 ? 's' : ''}
                    </Chip>
                  </div>
                  {isChecked &&
                    checkedCount >= 2 &&
                    (isWinner ? (
                      <Chip variant="success" size="sm">
                        winner
                      </Chip>
                    ) : (
                      <button
                        type="button"
                        className="text-muted-foreground hover:text-foreground text-xs transition-colors"
                        onClick={() =>
                          setWinnerOverrides((prev) => ({ ...prev, [originalIdx]: tag.id }))
                        }
                        disabled={isExecuting}
                      >
                        set as winner
                      </button>
                    ))}
                </div>
              );
            })}
          </SectionCard>
        );
      })}

      <AlertDialog open={confirmIdx !== null} onOpenChange={(open) => !open && setConfirmIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Merge</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmIdx !== null &&
                (() => {
                  const vis = visibleGroups.find((g) => g.originalIdx === confirmIdx);
                  const count = vis ? getCheckedCount(confirmIdx, vis.tags) : 0;
                  const warning = vis ? getHiddenWinnerWarning(confirmIdx, vis.tags) : null;
                  return (
                    <>
                      This will merge {count} tags into the selected winner, removing {count - 1}{' '}
                      duplicate{count - 1 !== 1 ? 's' : ''}. Article tags will be reassigned,
                      listing tags updated, and content links patched. This action cannot be undone.
                      {warning && (
                        <span className="text-warning-strong mt-3 block font-medium">
                          The winner “{warning.winner.name}” is hidden, so{' '}
                          {warning.publicLosers.length} public tag
                          {warning.publicLosers.length === 1 ? '' : 's'} will disappear from the
                          front end and {warning.publicLosers.length === 1 ? 'its' : 'their'}{' '}
                          archive page
                          {warning.publicLosers.length === 1 ? '' : 's'} will return 404.
                        </span>
                      )}
                    </>
                  );
                })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmIdx === null) return;
                const vis = visibleGroups.find((g) => g.originalIdx === confirmIdx);
                if (vis) handleMerge(confirmIdx, vis.tags);
              }}
            >
              Merge
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
