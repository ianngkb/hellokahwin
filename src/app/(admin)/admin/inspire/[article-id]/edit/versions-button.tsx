'use client';

import { useCallback, useEffect, useState } from 'react';
import { HistoryIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { VersionsSheet } from './versions-sheet';
import { listVersionsAction, type VersionListEntry } from './version-actions';

/**
 * The `Versions · 7` button in the editor's action bar (ported from The
 * Wedding Notebook).
 *
 * Owns its own list. It reloads on mount, whenever the editor bumps
 * `refreshToken` (after every explicit save, so the count stays right), and
 * whenever the sheet opens (catching another admin's save). The fetch runs
 * after hydration, so it adds nothing to the editor page's server render, and
 * the list never carries article bodies.
 */
export function VersionsButton({
  articleId,
  refreshToken = 0,
  editorIsDirty = false,
  disabled = false,
  onRestored,
}: {
  articleId: string;
  refreshToken?: number;
  editorIsDirty?: boolean;
  disabled?: boolean;
  onRestored?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [versions, setVersions] = useState<VersionListEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // No synchronous state change before the await: a refresh keeps showing the
  // current list until the new one arrives (the sheet only says "Loading" while
  // it has nothing to show), and the effect below triggers no cascading render.
  const load = useCallback(async () => {
    try {
      const result = await listVersionsAction(articleId);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError(null);
      setVersions(result.versions);
    } catch (err) {
      console.error('[versions] failed to load history:', err);
      setError('Could not load the version history.');
    } finally {
      setLoading(false);
    }
  }, [articleId]);

  useEffect(() => {
    void load();
    // `refreshToken` is a dependency on purpose: the editor bumps it after a save.
  }, [load, refreshToken]);

  const handleOpenChange = useCallback(
    (next: boolean) => {
      setOpen(next);
      if (next) void load();
    },
    [load],
  );

  return (
    <>
      <Button
        variant="quiet"
        size="sm"
        onClick={() => handleOpenChange(true)}
        disabled={disabled}
        data-testid="versions-button"
        aria-label={
          loading || error
            ? 'Versions'
            : `Versions, ${versions.length} ${versions.length === 1 ? 'version' : 'versions'}`
        }
      >
        <HistoryIcon className="mr-1 size-3.5" />
        Versions
        {!loading && !error && versions.length > 0 && ` · ${versions.length}`}
      </Button>

      <VersionsSheet
        articleId={articleId}
        open={open}
        onOpenChange={handleOpenChange}
        versions={versions}
        loading={loading}
        error={error}
        onRefresh={() => void load()}
        editorIsDirty={editorIsDirty}
        onRestored={onRestored}
      />
    </>
  );
}
