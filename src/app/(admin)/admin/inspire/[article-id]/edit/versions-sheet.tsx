'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import {
  ArchiveIcon,
  ArrowLeftIcon,
  CheckIcon,
  PencilIcon,
  TerminalIcon,
  UserIcon,
  XIcon,
} from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
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
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/utils/format-date';
import { VERSION_LABEL_MAX } from '@/lib/articles/version-snapshot';
import {
  getVersionDetailAction,
  renameVersionAction,
  restoreVersionAction,
  type VersionDetail,
  type VersionListEntry,
} from './version-actions';

/**
 * The version history panel (ported from The Wedding Notebook's versions
 * sheet). Lists versions newest first; each can be previewed, compared with
 * the article as it stands now, renamed, or restored.
 *
 * Restoring is a SAVE: it goes through the editor's normal save action, so
 * every save rule applies, and it is recorded as a new version — undoable from
 * this same list. It never changes the URL, category, status or author.
 *
 * Mounted by `versions-button.tsx`, which owns the list fetch; this component
 * is presentation plus the three actions, so a test can render it with a
 * fixture list and no database.
 */

const ACTOR_META: Record<
  VersionListEntry['actorType'],
  { label: string; icon: typeof UserIcon; variant: 'outline' | 'solid' }
> = {
  human: { label: 'Editor', icon: UserIcon, variant: 'outline' },
  machine: { label: 'System', icon: TerminalIcon, variant: 'solid' },
  import: { label: 'Original', icon: ArchiveIcon, variant: 'solid' },
};

export function VersionsSheet({
  articleId,
  open,
  onOpenChange,
  versions,
  loading,
  error,
  onRefresh,
  editorIsDirty = false,
  onRestored,
}: {
  articleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: VersionListEntry[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
  /** Whether the editor behind this panel has unsaved changes. */
  editorIsDirty?: boolean;
  /** Called after a successful restore so the editor can reload itself. */
  onRestored?: () => void;
}) {
  const [confirming, setConfirming] = useState<VersionListEntry | null>(null);
  // Restoring replaces the article and reloads the editor, so unsaved work is
  // lost. The admin acknowledges that BEFORE anything is written, never via a
  // browser "leave site?" prompt after the restore has already committed.
  const [discardAcknowledged, setDiscardAcknowledged] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [selected, setSelected] = useState<VersionListEntry | null>(null);
  const [detail, setDetail] = useState<VersionDetail | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoadingDetail, startDetailTransition] = useTransition();

  const newestId = versions[0]?.id ?? null;

  function openDetail(version: VersionListEntry) {
    setSelected(version);
    setDetail(null);
    setDetailError(null);
    startDetailTransition(async () => {
      try {
        const result = await getVersionDetailAction(articleId, version.id);
        if ('error' in result) setDetailError(result.error);
        else setDetail(result.detail);
      } catch {
        setDetailError('Could not load that version.');
      }
    });
  }

  function closeConfirm() {
    setConfirming(null);
    setDiscardAcknowledged(false);
  }

  function handleRestore(version: VersionListEntry) {
    startTransition(async () => {
      try {
        const result = await restoreVersionAction(articleId, version.id);
        if ('error' in result) {
          toast.error(result.error, { duration: 10000 });
          return;
        }
        toast.success(`Restored v${result.versionNumber}.`, {
          description:
            result.skippedTagCount > 0
              ? `${result.skippedTagCount} ${result.skippedTagCount === 1 ? 'tag no longer exists and was' : 'tags no longer exist and were'} left out.`
              : undefined,
        });
        closeConfirm();
        setSelected(null);
        // The editor's fields are client state; a router refresh would keep
        // the pre-restore body on screen. Reload it.
        if (onRestored) onRestored();
        else window.location.reload();
      } catch {
        toast.error('Could not restore that version. Nothing was changed.');
      }
    });
  }

  function handleRename(version: VersionListEntry) {
    startTransition(async () => {
      try {
        const result = await renameVersionAction(articleId, version.id, renameValue);
        if ('error' in result) {
          toast.error(result.error);
          return;
        }
        setRenaming(null);
        onRefresh();
      } catch {
        toast.error('Could not rename that version.');
      }
    });
  }

  return (
    <>
      <Sheet
        open={open}
        onOpenChange={(next) => {
          if (!next) setSelected(null);
          onOpenChange(next);
        }}
      >
        <SheetContent side="right" className="w-full sm:max-w-lg" data-testid="versions-sheet">
          <SheetHeader>
            <SheetTitle>
              Version history{versions.length > 0 ? ` · ${versions.length}` : ''}
            </SheetTitle>
            <SheetDescription>
              Every editing session is kept as a version. Restoring one brings back its title, text,
              cover, SEO fields and tags. The web address, category, status and author do not
              change.
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto px-6 py-4">
            {selected ? (
              <VersionDetailView
                version={selected}
                detail={detail}
                error={detailError}
                loading={isLoadingDetail}
                isNewest={selected.id === newestId}
                isPending={isPending}
                onBack={() => setSelected(null)}
                onRestore={() => setConfirming(selected)}
              />
            ) : (
              <>
                {loading && versions.length === 0 && (
                  <p className="text-muted-foreground text-sm">Loading version history…</p>
                )}

                {!loading && error && (
                  <div className="text-sm">
                    <p className="text-error">{error}</p>
                    <Button variant="quiet" size="sm" className="mt-3" onClick={onRefresh}>
                      Try again
                    </Button>
                  </div>
                )}

                {!loading && !error && versions.length === 0 && (
                  <p className="text-muted-foreground text-sm">
                    No versions yet. The next save records the first one.
                  </p>
                )}

                <ul className="space-y-3">
                  {versions.map((version) => {
                    const actor = ACTOR_META[version.actorType];
                    const ActorIcon = actor.icon;
                    const isNewest = version.id === newestId;
                    return (
                      <li
                        key={version.id}
                        data-testid="version-row"
                        className={`rounded-md border p-3 ${
                          isNewest ? 'border-success bg-success-subtle/30' : 'border-border/60'
                        }`}
                      >
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-foreground text-sm font-semibold">
                            v{version.versionNumber}
                          </span>
                          {isNewest && (
                            <Chip variant="success" size="sm">
                              <CheckIcon />
                              Latest
                            </Chip>
                          )}
                          <Chip variant={actor.variant} size="sm">
                            <ActorIcon />
                            {actor.label}
                          </Chip>
                        </div>

                        {renaming === version.id ? (
                          <div className="mt-2 flex items-center gap-1.5">
                            <Input
                              value={renameValue}
                              maxLength={VERSION_LABEL_MAX}
                              autoFocus
                              aria-label="Version name"
                              placeholder="Name this version"
                              className="h-8 text-xs"
                              onChange={(e) => setRenameValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleRename(version);
                                }
                                if (e.key === 'Escape') setRenaming(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Save name"
                              disabled={isPending}
                              onClick={() => handleRename(version)}
                            >
                              <CheckIcon className="size-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Cancel"
                              onClick={() => setRenaming(null)}
                            >
                              <XIcon className="size-3.5" />
                            </Button>
                          </div>
                        ) : (
                          version.label && (
                            <p className="text-foreground mt-1.5 text-sm font-medium">
                              {version.label}
                            </p>
                          )
                        )}

                        <p
                          className="text-muted-foreground mt-1 truncate text-xs"
                          title={version.title}
                        >
                          {version.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 text-xs">
                          {version.createdByLabel ??
                            (version.actorType === 'human' ? 'Admin' : actor.label)}{' '}
                          · {formatDateTime(version.updatedAt)}
                        </p>

                        <div className="mt-2.5 flex flex-wrap items-center gap-3">
                          <button
                            type="button"
                            className="text-muted-foreground hover:text-foreground text-xs underline-offset-2 hover:underline"
                            onClick={() => openDetail(version)}
                          >
                            Preview &amp; compare
                          </button>
                          {renaming !== version.id && (
                            <button
                              type="button"
                              className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
                              onClick={() => {
                                setRenaming(version.id);
                                setRenameValue(version.label ?? '');
                              }}
                            >
                              <PencilIcon className="size-3" />
                              {version.label ? 'Rename' : 'Name it'}
                            </button>
                          )}
                          {!isNewest && (
                            <Button
                              variant="quiet"
                              size="xs"
                              className="ml-auto"
                              disabled={isPending}
                              onClick={() => setConfirming(version)}
                            >
                              Restore
                            </Button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={confirming !== null}
        onOpenChange={(next) => {
          if (!next) closeConfirm();
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore v{confirming?.versionNumber}?</AlertDialogTitle>
            <AlertDialogDescription>
              The article&apos;s title, text, cover image, SEO fields and tags go back to how they
              were in v{confirming?.versionNumber}. If the article is published, readers see the
              change straight away. The web address, category, status and author stay as they are.
              The current state stays in the history, so you can undo this by restoring it.
            </AlertDialogDescription>
          </AlertDialogHeader>

          {editorIsDirty && (
            <label
              className="border-warning-subtle bg-warning-subtle/40 text-warning-strong flex items-start gap-2 rounded-md border p-3 text-sm"
              data-testid="restore-discard-ack"
            >
              <input
                type="checkbox"
                className="mt-0.5"
                checked={discardAcknowledged}
                onChange={(e) => setDiscardAcknowledged(e.target.checked)}
                disabled={isPending}
              />
              <span>
                You have <strong>unsaved changes</strong> in the editor. Restoring reloads the
                editor and those changes will be lost. Cancel and save them first if you want to
                keep them.
              </span>
            </label>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (confirming) handleRestore(confirming);
              }}
              disabled={isPending || (editorIsDirty && !discardAcknowledged)}
            >
              {isPending ? 'Restoring…' : `Restore v${confirming?.versionNumber}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function VersionDetailView({
  version,
  detail,
  error,
  loading,
  isNewest,
  isPending,
  onBack,
  onRestore,
}: {
  version: VersionListEntry;
  detail: VersionDetail | null;
  error: string | null;
  loading: boolean;
  isNewest: boolean;
  isPending: boolean;
  onBack: () => void;
  onRestore: () => void;
}) {
  return (
    <div data-testid="version-detail">
      <div className="mb-3 flex items-center gap-2">
        <Button variant="ghost" size="xs" onClick={onBack}>
          <ArrowLeftIcon />
          All versions
        </Button>
        {!isNewest && (
          <Button
            variant="quiet"
            size="xs"
            className="ml-auto"
            disabled={isPending || !detail}
            onClick={onRestore}
          >
            Restore v{version.versionNumber}
          </Button>
        )}
      </div>

      <p className="text-foreground text-sm font-semibold">
        v{version.versionNumber}
        {version.label ? ` · ${version.label}` : ''}
      </p>
      <p className="text-muted-foreground mb-3 text-xs">{formatDateTime(version.updatedAt)}</p>

      {loading && <p className="text-muted-foreground text-sm">Loading…</p>}
      {!loading && error && <p className="text-error text-sm">{error}</p>}

      {detail && (
        <Tabs defaultValue="compare">
          <TabsList>
            <TabsTrigger value="compare">Compare with now</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>

          <TabsContent value="compare" className="space-y-4 pt-3">
            {detail.changes.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                This version is the same as the article now.
              </p>
            ) : (
              <dl className="space-y-3" data-testid="version-changes">
                {detail.changes.map((c) => (
                  <div key={c.field} className="text-xs">
                    <dt className="text-foreground font-medium">{c.label}</dt>
                    <dd className="text-muted-foreground mt-0.5 break-words">
                      <span className="text-foreground">This version:</span> {c.version}
                    </dd>
                    <dd className="text-muted-foreground break-words">
                      <span className="text-foreground">Now:</span> {c.current}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {(detail.onlyInVersion.length > 0 || detail.onlyInCurrent.length > 0) && (
              <div className="space-y-3 text-xs">
                {detail.onlyInVersion.length > 0 && (
                  <div>
                    <p className="text-foreground font-medium">
                      Text that restoring would bring back
                    </p>
                    <ul className="mt-1 space-y-1">
                      {detail.onlyInVersion.map((b, i) => (
                        <li key={i} className="bg-success-subtle/40 rounded px-2 py-1">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {detail.onlyInCurrent.length > 0 && (
                  <div>
                    <p className="text-foreground font-medium">Text that restoring would remove</p>
                    <ul className="mt-1 space-y-1">
                      {detail.onlyInCurrent.map((b, i) => (
                        <li key={i} className="bg-error-subtle/40 rounded px-2 py-1 line-through">
                          {b}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="preview" className="space-y-3 pt-3">
            {detail.coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element -- admin preview of a stored URL
              <img
                src={detail.coverImageUrl}
                alt=""
                className="aspect-[16/9] w-full rounded-md object-cover"
              />
            )}
            <h3 className="text-foreground text-lg font-semibold">{detail.title}</h3>
            {detail.excerpt && <p className="text-muted-foreground text-sm">{detail.excerpt}</p>}
            {detail.tagNames.length > 0 && (
              <p className="text-muted-foreground text-xs">Tags: {detail.tagNames.join(', ')}</p>
            )}
            <p className="text-muted-foreground text-xs">
              {detail.wordCount.toLocaleString('en')} words
            </p>
            <div className="space-y-2 text-sm">
              {detail.blocks.map((b, i) => (
                <p key={i}>{b}</p>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
