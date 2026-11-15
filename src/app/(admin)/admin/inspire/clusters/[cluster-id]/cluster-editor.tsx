'use client';

import { useId, useOptimistic, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowDownIcon, ArrowUpIcon, XIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { FormField } from '@/components/ui/form-field';
import { EmptyState } from '@/components/ui/empty-state';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  CLUSTER_DESCRIPTION_MAX,
  CLUSTER_EYEBROW_MAX,
  CLUSTER_SLUG_MAX,
  MAX_CLUSTER_MEMBERS,
  SERIES_BOX_ON_SITE,
  URL_SLUG_MESSAGE,
  clusterNameLength,
} from '@/lib/validations/article-cluster';
import {
  addClusterMembersAction,
  deleteClusterAction,
  removeClusterMemberAction,
  renameClusterAction,
  reorderClusterMembersAction,
  updateClusterSeriesAction,
} from '../actions';
import { ArticleStatusChip, Panel } from '../cluster-ui';
import { ClusterArticlePicker, type PickerArticle } from './cluster-article-picker';
import { moveMember } from './move-member';

export interface EditorMember {
  articleId: string;
  title: string;
  /** Display status (a scheduled draft reads "scheduled"). */
  status: string;
  /** True when a reader really sees THIS cluster's series box on this article. */
  showsThisSeries: boolean;
  /**
   * The OTHER series a reader meets on this article (R2/R14): an article can
   * sit in several clusters but shows at most one box — the first one it
   * joined. Null when that one is this cluster, or when it is in no other
   * switched-on cluster. `rendersBox` is false when even that other series has
   * nothing to list there, so a reader sees no box at all.
   */
  otherSeries: { name: string; rendersBox: boolean } | null;
}

/** The one name a member goes by everywhere: text, tooltips, aria-labels, toasts. */
export function memberDisplayTitle(title: string): string {
  return title.trim() || 'Untitled article';
}

export interface EditorCluster {
  id: string;
  name: string;
  /** The reader-facing settings as they are SAVED (the Series box panel). */
  description: string | null;
  eyebrow: string | null;
  slug: string | null;
  seriesEnabled: boolean;
  /** In saved order. */
  members: EditorMember[];
}

/**
 * The cluster editor (R15): rename, the member list in saved order with
 * move up / move down / remove, the searchable picker to add articles, and
 * delete-with-confirmation. Every change is saved straight away; the server
 * re-renders the page with the saved state. The optimistic member list falls
 * back to the new props on its own, the name field resets through its `key`,
 * and staged picks survive the re-render (so a pick that could not be added
 * stays staged for a retry) while any that are now members drop out.
 */
export function ClusterEditor({ cluster }: { cluster: EditorCluster }) {
  const [busy, startTransition] = useTransition();
  const [members, setOptimisticMembers] = useOptimistic(cluster.members);

  function move(index: number, step: -1 | 1) {
    const next = moveMember(members, index, step);
    startTransition(async () => {
      setOptimisticMembers(next);
      const result = await reorderClusterMembersAction({
        clusterId: cluster.id,
        orderedArticleIds: next.map((m) => m.articleId),
      });
      if ('error' in result) toast.error(result.error);
    });
  }

  function remove(member: EditorMember) {
    startTransition(async () => {
      setOptimisticMembers(members.filter((m) => m.articleId !== member.articleId));
      const result = await removeClusterMemberAction({
        clusterId: cluster.id,
        articleId: member.articleId,
      });
      if ('error' in result) toast.error(result.error);
      else toast.success(`Removed “${memberDisplayTitle(member.title)}” from the cluster`);
    });
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <RenameForm key={cluster.name} clusterId={cluster.id} savedName={cluster.name} />

      <SeriesSettings
        key={`${cluster.seriesEnabled}|${cluster.description ?? ''}|${cluster.eyebrow ?? ''}|${cluster.slug ?? ''}`}
        clusterId={cluster.id}
        saved={{
          description: cluster.description,
          eyebrow: cluster.eyebrow,
          slug: cluster.slug,
          seriesEnabled: cluster.seriesEnabled,
        }}
        memberCount={cluster.members.length}
        shownCount={cluster.members.filter((m) => m.showsThisSeries).length}
      />

      <Panel className="flex min-w-0 flex-col">
        <div className="border-hairline border-b px-4 py-3">
          <h2 className="text-sm font-semibold">Articles in this cluster</h2>
          <p className="text-muted-foreground text-xs">
            {members.length === 1 ? '1 article' : `${members.length} articles`}, listed in this
            order in the series and on the cluster&rsquo;s analytics page.
          </p>
        </div>
        {members.length === 0 ? (
          <EmptyState
            title="No articles in this cluster yet"
            description="Search for articles by title below to add them."
          />
        ) : (
          <ol className="divide-hairline divide-y" aria-label="Articles in this cluster">
            {members.map((m, i) => {
              const title = memberDisplayTitle(m.title);
              return (
                <li key={m.articleId} className="flex min-w-0 items-center gap-2 px-4 py-2.5">
                  <span className="text-muted-foreground w-6 shrink-0 font-mono text-xs tabular-nums">
                    {i + 1}.
                  </span>
                  <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1">
                    <Link
                      href={`/admin/inspire/${m.articleId}/edit`}
                      className="line-clamp-2 min-w-0 text-sm break-words hover:underline"
                      title={title}
                    >
                      {title}
                    </Link>
                    <ArticleStatusChip status={m.status} />
                    {/* R14: an article shows at most one series — the first one
                      it joined. Say so on the row rather than letting an admin
                      wonder why this cluster's box is not on it. */}
                    {m.otherSeries ? (
                      <span className="text-muted-foreground w-full text-[11.5px]">
                        {m.otherSeries.rendersBox
                          ? SERIES_BOX_ON_SITE
                            ? `Readers see “${m.otherSeries.name}” on this article`
                            : `This article joined “${m.otherSeries.name}” first, so that series shows here instead`
                          : `This article joined “${m.otherSeries.name}” first, so no series box shows here`}
                      </span>
                    ) : null}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => move(i, -1)}
                      disabled={busy || i === 0}
                      aria-label={`Move “${title}” up`}
                      title="Move up"
                    >
                      <ArrowUpIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => move(i, 1)}
                      disabled={busy || i === members.length - 1}
                      aria-label={`Move “${title}” down`}
                      title="Move down"
                    >
                      <ArrowDownIcon className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive size-8"
                      onClick={() => remove(m)}
                      disabled={busy}
                      aria-label={`Remove “${title}” from this cluster`}
                      title="Remove from cluster"
                    >
                      <XIcon className="size-3.5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        {busy && (
          <p className="text-muted-foreground px-4 pb-3 text-[11.5px]" role="status">
            Saving…
          </p>
        )}
      </Panel>

      <AddArticles
        clusterId={cluster.id}
        memberIds={cluster.members.map((m) => m.articleId)}
        memberCount={cluster.members.length}
      />

      <DeleteCluster clusterId={cluster.id} name={cluster.name} />
    </div>
  );
}

function RenameForm({ clusterId, savedName }: { clusterId: string; savedName: string }) {
  const inputId = useId();
  const [name, setName] = useState(savedName);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const changed = name.trim() !== savedName;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !changed) return;
    startTransition(async () => {
      const result = await renameClusterAction({ id: clusterId, name });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      toast.success('Cluster renamed');
    });
  }

  return (
    <Panel className="p-4">
      <form onSubmit={submit} className="flex min-w-0 flex-col gap-3" noValidate>
        {/* R13: the name IS the series heading — there is no second title
            field — so the field that sets it has to say so. */}
        <FormField
          label="Cluster name"
          htmlFor={inputId}
          error={error}
          hint="When the series box is on, readers see this name as its heading."
        >
          <div className="flex min-w-0 flex-wrap gap-2">
            <Input
              id={inputId}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError(null);
              }}
              aria-invalid={error ? true : undefined}
              autoComplete="off"
              className="min-w-0 flex-1 basis-56"
            />
            <Button type="submit" size="sm" disabled={pending || !changed} className="h-auto">
              {pending ? 'Saving…' : 'Save name'}
            </Button>
          </div>
        </FormField>
      </form>
    </Panel>
  );
}

/** "1 article" / "3 articles" — never a bare number (D3). */
function articleCount(n: number): string {
  return n === 1 ? '1 article' : `${n} articles`;
}

/** The four fields the Series box panel can put an error on. */
type SeriesField = 'description' | 'eyebrow' | 'slug' | null;

/**
 * Where a refusal belongs, and in whose words.
 *
 * The server's messages come from the shared validators, and two of them name
 * the storage ("Slug may contain only…", "Cluster slug must be…"). D1 keeps
 * that word off the screen, so those two are re-stated here in the panel's own
 * language. Anything unrecognised (a permission refusal, a database hiccup) is
 * shown verbatim above the Save button — never swallowed.
 */
function placeSeriesError(message: string): { field: SeriesField; text: string } {
  if (message === URL_SLUG_MESSAGE) {
    return {
      field: 'slug',
      text: 'Use lowercase letters, numbers and single dashes — for example idea-pelamin.',
    };
  }
  if (message.toLowerCase().includes('slug')) {
    return {
      field: 'slug',
      text: `The web address name must be ${CLUSTER_SLUG_MAX} characters or fewer.`,
    };
  }
  // "Another cluster already uses that web address name" — already the panel's
  // own words, so it is shown as it stands, on the field it is about.
  if (message.toLowerCase().includes('web address name')) return { field: 'slug', text: message };
  if (message.startsWith('Intro text') || message.startsWith('Add the intro text')) {
    return { field: 'description', text: message };
  }
  if (message.startsWith('Small label')) return { field: 'eyebrow', text: message };
  return { field: null, text: message };
}

/**
 * The reader-facing Series box settings (R13, R14).
 *
 * Saved as ONE form by one action, so the switch and the intro it depends on
 * can never be half-saved: turning the box on while the intro is blank is
 * refused and nothing is written.
 *
 * Remounted by its `key` in `ClusterEditor` whenever the saved values change,
 * which is how the fields pick up a save (the server re-renders this page with
 * the saved state) without a second source of truth in state.
 *
 * Every word here is the information, not the column (D1): no "slug",
 * "eyebrow", "description" or "series_enabled" appears on screen.
 */
function SeriesSettings({
  clusterId,
  saved,
  memberCount,
  shownCount,
}: {
  clusterId: string;
  saved: {
    description: string | null;
    eyebrow: string | null;
    slug: string | null;
    seriesEnabled: boolean;
  };
  /** Members the editor is showing (the same set the list above counts). */
  memberCount: number;
  /** Members a reader really sees THIS cluster's box on (R14) — not a guess. */
  shownCount: number;
}) {
  const switchId = useId();
  const introId = useId();
  const labelId = useId();
  const slugId = useId();

  const [enabled, setEnabled] = useState(saved.seriesEnabled);
  const [intro, setIntro] = useState(saved.description ?? '');
  const [smallLabel, setSmallLabel] = useState(saved.eyebrow ?? '');
  const [slug, setSlug] = useState(saved.slug ?? '');
  const [error, setError] = useState<{ field: SeriesField; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  // Counted the way the server counts it (by grapheme, after NFC), so the
  // number an admin reads is the number that is checked.
  const introLength = clusterNameLength(intro);
  const introOver = introLength > CLUSTER_DESCRIPTION_MAX;

  const changed =
    enabled !== saved.seriesEnabled ||
    intro.trim() !== (saved.description ?? '') ||
    smallLabel.trim() !== (saved.eyebrow ?? '') ||
    slug.trim() !== (saved.slug ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pending || !changed) return;
    startTransition(async () => {
      const result = await updateClusterSeriesAction({
        id: clusterId,
        description: intro,
        eyebrow: smallLabel,
        slug,
        seriesEnabled: enabled,
      });
      if ('error' in result) {
        setError(placeSeriesError(result.error));
        return;
      }
      toast.success(enabled ? 'Series box saved and switched on' : 'Series box settings saved');
    });
  }

  /** What readers get right now — from the SAVED state, not the form. */
  const status = !SERIES_BOX_ON_SITE
    ? saved.seriesEnabled
      ? `Saved as on. The series box is not on the public site yet, so readers see nothing for now; once it launches it will show on ${articleCount(shownCount)} here.`
      : 'The series box is not on the public site yet. You can set it up now; nothing shows to readers until it launches.'
    : !saved.seriesEnabled
      ? 'The series box is off, so readers see nothing on these articles yet.'
      : shownCount > 0
        ? `Readers see this box on ${shownCount} of the ${articleCount(memberCount)} in this cluster.`
        : 'No one sees this box yet. A series box needs at least two published articles here — and an article that joined another switched-on series first shows that one instead.';

  return (
    <Panel className="flex min-w-0 flex-col gap-4 p-4">
      <div>
        <h2 className="text-sm font-semibold">Series box for readers</h2>
        <p className="text-muted-foreground text-xs">
          A box at the top of every article in this cluster: the cluster name as its heading, your
          intro, and links to the other articles in it.
        </p>
      </div>

      <form onSubmit={submit} className="flex min-w-0 flex-col gap-4" noValidate>
        <div className="border-hairline rounded-card border p-3">
          <label htmlFor={switchId} className="flex items-start gap-2.5">
            <Checkbox
              id={switchId}
              name="seriesEnabled"
              checked={enabled}
              onCheckedChange={(v) => {
                setEnabled(v === true);
                setError(null);
              }}
              disabled={pending}
              className="mt-0.5"
            />
            <span className="text-sm">
              <span className="font-medium">Show the series box on these articles</span>
              <span className="text-muted-foreground block text-xs">
                Write the intro text below first — the box cannot be switched on without it.
              </span>
            </span>
          </label>
          <p className="text-muted-foreground mt-2 text-[11.5px]" role="status">
            {status}
          </p>
        </div>

        <FormField
          label="Intro text"
          htmlFor={introId}
          error={error?.field === 'description' ? error.text : null}
          hint={
            introOver
              ? `${introLength} of ${CLUSTER_DESCRIPTION_MAX} characters — ${introLength - CLUSTER_DESCRIPTION_MAX} too many`
              : `${introLength} of ${CLUSTER_DESCRIPTION_MAX} characters`
          }
        >
          <Textarea
            id={introId}
            value={intro}
            onChange={(e) => {
              setIntro(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.field === 'description' || introOver ? true : undefined}
            placeholder="For example: Everything you need to choose your pelamin."
            rows={4}
          />
        </FormField>

        <FormField
          label="Small label above the title"
          htmlFor={labelId}
          error={error?.field === 'eyebrow' ? error.text : null}
          hint="Optional. Left out of the box entirely when it is empty."
        >
          <Input
            id={labelId}
            value={smallLabel}
            onChange={(e) => {
              setSmallLabel(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.field === 'eyebrow' ? true : undefined}
            maxLength={CLUSTER_EYEBROW_MAX * 4}
            placeholder="For example: Pelamin"
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Web address name"
          htmlFor={slugId}
          error={error?.field === 'slug' ? error.text : null}
          hint="Optional, and no two clusters may share one. Not shown to readers — it is reserved for a series page of its own later."
        >
          <Input
            id={slugId}
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setError(null);
            }}
            aria-invalid={error?.field === 'slug' ? true : undefined}
            maxLength={CLUSTER_SLUG_MAX}
            placeholder="For example: idea-pelamin"
            autoComplete="off"
          />
        </FormField>

        {error && error.field === null ? (
          <p className="text-error text-[11.5px]" role="alert">
            {error.text}
          </p>
        ) : null}

        <div>
          <Button type="submit" size="sm" disabled={pending || !changed}>
            {pending ? 'Saving…' : 'Save series box'}
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function roomHint(room: number, stagedCount: number): string {
  const left = Math.max(0, room - stagedCount);
  const articlesWord = (n: number) => (n === 1 ? '1 more article' : `${n} more articles`);
  if (stagedCount === 0) return `There is room for ${articlesWord(room)} in this cluster.`;
  if (left === 0) return 'Adding these fills the cluster.';
  return `There is room for ${articlesWord(left)} after these.`;
}

/** “A”, “B” and 3 more */
function namesList(titles: string[]): string {
  const quoted = titles.map((t) => `“${memberDisplayTitle(t)}”`);
  if (quoted.length <= 3) return quoted.join(', ');
  return `${quoted.slice(0, 3).join(', ')} and ${quoted.length - 3} more`;
}

function AddArticles({
  clusterId,
  memberIds,
  memberCount,
}: {
  clusterId: string;
  memberIds: string[];
  /** The server's count of VISIBLE members — the same set its 50-article cap counts. */
  memberCount: number;
}) {
  const [picks, setStaged] = useState<PickerArticle[]>([]);
  const [pending, startTransition] = useTransition();
  const room = Math.max(0, MAX_CLUSTER_MEMBERS - memberCount);
  // A pick that has since become a member (added here, or in another tab) is
  // no longer staged.
  const members = new Set(memberIds);
  const staged = picks.filter((a) => !members.has(a.id));

  function addAll() {
    if (pending || staged.length === 0) return;
    const batch = staged;
    startTransition(async () => {
      // ONE call: the server adds them in this order in one transaction and
      // revalidates once.
      const result = await addClusterMembersAction({
        clusterId,
        articleIds: batch.map((a) => a.id),
      });
      if ('error' in result) {
        // Nothing was added; keep every pick for a retry.
        toast.error(result.error);
        return;
      }
      const added = result.added.length;
      if (added > 0) toast.success(added === 1 ? 'Added 1 article' : `Added ${added} articles`);

      // Group the refusals by reason: one toast per reason, not per article.
      const byReason = new Map<string, string[]>();
      const titleOf = new Map(batch.map((a) => [a.id, a.title]));
      for (const f of result.failed) {
        byReason.set(f.error, [...(byReason.get(f.error) ?? []), titleOf.get(f.articleId) ?? '']);
      }
      for (const [reason, titles] of byReason) toast.error(`${namesList(titles)}: ${reason}`);

      // Keep only what could not be added, so the admin can see and retry it.
      // An "already in" pick is dropped: there is nothing left to do for it.
      const retry = new Set(
        result.failed.filter((f) => f.error !== 'Already in this cluster').map((f) => f.articleId),
      );
      setStaged(batch.filter((a) => retry.has(a.id)));
    });
  }

  return (
    <Panel className="flex min-w-0 flex-col gap-3 p-4">
      <div>
        <h2 className="text-sm font-semibold">Add articles</h2>
        <p className="text-muted-foreground text-xs">
          Pick one or more, then add them. New articles go to the end of the list.
        </p>
      </div>
      {room === 0 ? (
        <p className="text-muted-foreground text-[12.5px]" role="status">
          This cluster is full ({MAX_CLUSTER_MEMBERS} articles). Remove one to add another.
        </p>
      ) : (
        <>
          <ClusterArticlePicker
            value={staged}
            onChange={setStaged}
            max={room}
            disabledIds={memberIds}
            disabled={pending}
            hint={roomHint(room, staged.length)}
            overCapMessage={`This cluster only has room for ${
              room === 1 ? '1 more article' : `${room} more articles`
            }. Remove a pick to choose another.`}
          />
          <div>
            <Button size="sm" onClick={addAll} disabled={pending || staged.length === 0}>
              {pending
                ? 'Adding…'
                : staged.length <= 1
                  ? 'Add to cluster'
                  : `Add ${staged.length} articles to cluster`}
            </Button>
          </div>
        </>
      )}
    </Panel>
  );
}

function DeleteCluster({ clusterId, name }: { clusterId: string; name: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function confirmDelete() {
    startTransition(async () => {
      const result = await deleteClusterAction(clusterId);
      if ('error' in result) {
        toast.error(result.error);
        return;
      }
      toast.success('Cluster deleted');
      setOpen(false);
      router.push('/admin/inspire/clusters');
    });
  }

  return (
    <Panel className="flex min-w-0 flex-wrap items-center justify-between gap-3 p-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold">Delete this cluster</h2>
        <p className="text-muted-foreground text-xs">
          Removes the group only. The articles in it stay exactly as they are.
        </p>
      </div>
      <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
        <AlertDialogTrigger asChild>
          <Button variant="destructive" size="sm" disabled={pending}>
            Delete cluster
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="break-words">Delete cluster “{name}”?</AlertDialogTitle>
            <AlertDialogDescription>Its articles are not affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                confirmDelete();
              }}
              disabled={pending}
            >
              {pending ? 'Deleting…' : 'Delete cluster'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Panel>
  );
}
