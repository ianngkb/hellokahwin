'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  MoreHorizontalIcon,
  CopyIcon,
  TrashIcon,
  RefreshCwIcon,
  CalendarClockIcon,
  BadgeCheckIcon,
  ExternalLinkIcon,
} from 'lucide-react';
import { Chip } from '@/components/ui/chip';
import { StatusChip } from '@/lib/ui/status-chip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConsoleTable } from '@/components/ui/console-table';
import { FilterPills } from '@/components/ui/filter-pills';
import { EmptyState } from '@/components/ui/empty-state';
import { formatDate, formatDateTime } from '@/lib/utils/format-date';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  deleteArticleAction,
  duplicateArticleAction,
  toggleArticleStatusAction,
  toggleHumanReviewedAction,
  bulkDeleteArticlesAction,
  bulkStatusChangeArticlesAction,
  bulkRegenerateImagesAction,
  bulkReassignAuthorAction,
} from './actions';
import type { ArticleStatus } from '@/lib/constants';
import { toast } from 'sonner';

interface ArticleRow {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string | null;
  hasVariants: boolean;
  status: ArticleStatus;
  isAiGenerated: boolean;
  humanReviewedAt: string | null;
  categoryName: string | null;
  categorySlug: string | null;
  secondaryCategories: string[];
  authorName: string | null;
  publishedAt: string | null;
  scheduledPublishAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface CategoryOption {
  id: string;
  name: string;
}

/** Admin-only tags (is_hidden = true) — the "Hidden tag" filter's options. */
interface HiddenTagOption {
  id: string;
  name: string;
}

/** A target for the bulk "Change author" control. */
interface AuthorOption {
  id: string;
  name: string;
  isHouseAccount: boolean;
}

/** Debounce before a keystroke turns into a navigation. */
const SEARCH_DEBOUNCE_MS = 350;

const STATUS_VARIANTS: Record<ArticleStatus, 'outline' | 'success' | 'error'> = {
  draft: 'outline',
  published: 'success',
  deleted: 'error',
};

/**
 * The status filter's options, in bar order. `''` is "no filter" — the same
 * value `handleFilter` used to send for the select's `all` sentinel, which
 * `buildHref` drops from the query string entirely.
 */
const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: 'All', value: '' },
  { label: 'Draft', value: 'draft' },
  { label: 'Scheduled', value: 'scheduled' },
  { label: 'Published', value: 'published' },
];

export function ArticlesTable({
  articles,
  categories,
  hiddenTags,
  selectableAuthors,
  searchParams,
  currentPage,
  totalPages,
  total,
  pageSize,
}: {
  articles: ArticleRow[];
  categories: CategoryOption[];
  hiddenTags: HiddenTagOption[];
  selectableAuthors: AuthorOption[];
  searchParams: {
    search?: string;
    status?: string;
    categoryId?: string;
    source?: string;
    hiddenTagId?: string;
    page?: string;
  };
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  // Navigation gets its own transition so a pending filter/search request does
  // not disable the bulk-action buttons (and vice versa).
  const [isNavigating, startNavigation] = useTransition();
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allSelected = articles.length > 0 && selected.size === articles.length;

  // Destructured to primitives on purpose: `searchParams` is a fresh object on
  // every server render, so keying `buildHref` on it would change its identity
  // each pass and re-arm the debounce effect below in a loop.
  const {
    search: pSearch,
    status: pStatus,
    categoryId: pCategoryId,
    source: pSource,
    hiddenTagId: pHiddenTagId,
  } = searchParams;

  /**
   * Build the next URL from the *current* params plus overrides. An override of
   * `''` drops the key. Any filter change resets to page 1 — keeping the old
   * page number would land on an out-of-range offset and show nothing.
   */
  const buildHref = useCallback(
    (
      overrides: Partial<
        Record<'search' | 'status' | 'categoryId' | 'source' | 'hiddenTagId' | 'page', string>
      >,
    ) => {
      const merged = {
        search: pSearch,
        status: pStatus,
        categoryId: pCategoryId,
        source: pSource,
        hiddenTagId: pHiddenTagId,
        ...overrides,
      };
      const next = new URLSearchParams();
      for (const key of ['search', 'status', 'categoryId', 'source', 'hiddenTagId'] as const) {
        if (merged[key]) next.set(key, merged[key]);
      }
      const page = overrides.page ?? '1';
      if (page !== '1') next.set('page', page);
      const qs = next.toString();
      return qs ? `/admin/inspire?${qs}` : '/admin/inspire';
    },
    [pSearch, pStatus, pCategoryId, pSource, pHiddenTagId],
  );

  /**
   * Navigate inside a transition. This is what keeps the filter bar usable:
   * `/admin/inspire` sits under `admin/loading.tsx`, so a bare `router.push`
   * swaps the whole page for that skeleton on every keystroke, remounting the
   * search input and stealing focus after 2 characters. A transition keeps the
   * current UI on screen while the new params render.
   */
  const navigate = useCallback(
    (href: string) => {
      startNavigation(() => router.push(href));
    },
    [router],
  );

  // Search is debounced and locally controlled so typing stays responsive and
  // the caret never jumps; the URL trails the input by `SEARCH_DEBOUNCE_MS`.
  const urlSearch = pSearch ?? '';
  const [searchInput, setSearchInput] = useState(urlSearch);
  const [syncedSearch, setSyncedSearch] = useState(urlSearch);

  // Adopt out-of-band URL changes (back/forward, "Clear filters") during render
  // rather than in an effect — the pattern React recommends for deriving state
  // from a changed prop, and it avoids a cascading second render.
  if (urlSearch !== syncedSearch) {
    setSyncedSearch(urlSearch);
    setSearchInput(urlSearch);
  }

  useEffect(() => {
    if (searchInput === urlSearch) return;
    const timer = setTimeout(
      () => navigate(buildHref({ search: searchInput })),
      SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(timer);
  }, [searchInput, urlSearch, navigate, buildHref]);

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(articles.map((a) => a.id)));
  }

  function toggleOne(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handleFilter(key: 'status' | 'categoryId' | 'source' | 'hiddenTagId', value: string) {
    navigate(buildHref({ [key]: value }));
  }

  const offset = (currentPage - 1) * pageSize;

  const hasActiveFilters = Boolean(
    searchInput || pStatus || pCategoryId || pSource || pHiddenTagId,
  );

  function handleDelete(articleId: string) {
    if (!confirm('Delete this article?')) return;
    startTransition(async () => {
      const result = await deleteArticleAction(articleId);
      if (result.error) toast.error(result.error);
      else toast.success('Article deleted');
    });
  }

  function handleDuplicate(articleId: string) {
    startTransition(async () => {
      const result = await duplicateArticleAction(articleId);
      if (result.error) toast.error(result.error);
      else toast.success('Article duplicated');
    });
  }

  function handleToggleStatus(articleId: string) {
    startTransition(async () => {
      const result = await toggleArticleStatusAction(articleId);
      if (result.error) toast.error(result.error);
      else toast.success('Status updated');
    });
  }

  function handleToggleHumanReviewed(articleId: string) {
    startTransition(async () => {
      const result = await toggleHumanReviewedAction(articleId);
      if (result.error) toast.error(result.error);
      else
        toast.success(
          result.humanReviewed ? 'Marked as human reviewed' : 'Human-review mark removed',
        );
    });
  }

  function handleBulkDelete() {
    if (!confirm(`Delete ${selected.size} article(s)?`)) return;
    startTransition(async () => {
      const result = await bulkDeleteArticlesAction(Array.from(selected));
      if (result.error) toast.error(result.error);
      else {
        toast.success('Articles deleted');
        setSelected(new Set());
      }
    });
  }

  function handleBulkStatus(status: ArticleStatus) {
    startTransition(async () => {
      const result = await bulkStatusChangeArticlesAction(Array.from(selected), status);
      if (result.error) toast.error(result.error);
      else {
        toast.success('Status updated');
        setSelected(new Set());
      }
    });
  }

  function handleBulkReassignAuthor(authorId: string) {
    const author = selectableAuthors.find((a) => a.id === authorId);
    // Re-attribution rewrites the visible byline on up to 500 live pages and
    // has no undo, so it confirms — unlike Publish/Unpublish, which are one
    // click to reverse.
    if (!confirm(`Credit ${selected.size} article(s) to ${author?.name ?? 'this author'}?`)) return;
    startTransition(async () => {
      const result = await bulkReassignAuthorAction(Array.from(selected), authorId);
      if (result.error) toast.error(result.error);
      else {
        toast.success(`${result.moved} article(s) re-credited`);
        setSelected(new Set());
      }
    });
  }

  function handleBulkRegenerate() {
    if (!confirm(`Regenerate images for ${selected.size} article(s)? This may take a while.`))
      return;
    startTransition(async () => {
      const result = await bulkRegenerateImagesAction(Array.from(selected));
      if (result.error) toast.error(result.error);
      else {
        toast.success(`Regenerated: ${result.processed} processed, ${result.failed} failed`);
        setSelected(new Set());
      }
    });
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div
        className={`flex flex-wrap items-center gap-2 sm:gap-3 ${isNavigating ? 'opacity-70' : ''}`}
      >
        <Input
          placeholder="Search articles..."
          value={searchInput}
          className="w-full sm:w-56 lg:w-72"
          aria-label="Search articles by title"
          onChange={(e) => setSearchInput(e.target.value)}
        />
        {/* Status is the filter that gets used on nearly every visit, and it
            has four fixed values — the exact case the design system reserves
            pills for (§5 "Filter pills"): every option visible and one click
            away, instead of two clicks through a menu that hides the choices
            until you open it. The other three filters stay as selects because
            their option lists are unbounded (categories, hidden tags) or long
            enough to wrap the bar (source).

            The URL mechanics are unchanged: the pill hrefs come from the same
            `buildHref` the select's `handleFilter` calls, so they carry the
            same params and the same page-1 reset. Real links, so a filtered
            view is now also copyable and middle-clickable. */}
        <FilterPills
          label="Status"
          options={STATUS_FILTERS.map((option) => ({
            label: option.label,
            href: buildHref({ status: option.value }),
            active: (pStatus ?? '') === option.value,
          }))}
        />
        <Select
          value={searchParams.categoryId ?? 'all'}
          onValueChange={(v) => handleFilter('categoryId', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[180px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.source ?? 'all'}
          onValueChange={(v) => handleFilter('source', v === 'all' ? '' : v)}
        >
          <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[150px]">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            <SelectItem value="ai">AI generated</SelectItem>
            <SelectItem value="ai-unreviewed">AI · needs review</SelectItem>
            <SelectItem value="ai-reviewed">AI · human reviewed</SelectItem>
            <SelectItem value="human">Human written</SelectItem>
          </SelectContent>
        </Select>
        {hiddenTags.length > 0 && (
          <Select
            value={searchParams.hiddenTagId ?? 'all'}
            onValueChange={(v) => handleFilter('hiddenTagId', v === 'all' ? '' : v)}
          >
            <SelectTrigger className="w-[calc(50%-0.25rem)] sm:w-[170px]">
              <SelectValue placeholder="All hidden tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All hidden tags</SelectItem>
              {hiddenTags.map((t) => (
                <SelectItem key={t.id} value={t.id}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        {hasActiveFilters && (
          <Button
            variant="quiet"
            size="sm"
            onClick={() => {
              setSearchInput('');
              navigate('/admin/inspire');
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* Bulk actions */}
      {selected.size > 0 && (
        <div className="bg-muted rounded-card border-hairline flex flex-wrap items-center gap-2 border px-4 py-2 text-sm">
          <span className="font-mono font-medium tabular-nums">{selected.size} selected</span>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => handleBulkStatus('published')}
            disabled={isPending}
          >
            Publish
          </Button>
          <Button
            size="sm"
            variant="quiet"
            onClick={() => handleBulkStatus('draft')}
            disabled={isPending}
          >
            Unpublish
          </Button>
          {selectableAuthors.length > 0 && (
            <Select
              // `value=""` keeps this a pure command menu rather than a state
              // control: it always reads "Change author", never the last person
              // picked, so it can't be mistaken for the current attribution of
              // a mixed selection.
              value=""
              onValueChange={handleBulkReassignAuthor}
              disabled={isPending}
            >
              <SelectTrigger size="sm" className="w-[170px]" aria-label="Change author">
                <SelectValue placeholder="Change author" />
              </SelectTrigger>
              <SelectContent>
                {selectableAuthors.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                    {a.isHouseAccount ? ' (house)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="sm" variant="quiet" onClick={handleBulkRegenerate} disabled={isPending}>
            <RefreshCwIcon className="mr-1 size-3.5" />
            Regenerate Images
          </Button>
          <Button size="sm" variant="destructive" onClick={handleBulkDelete} disabled={isPending}>
            Delete
          </Button>
        </div>
      )}

      {/* Table */}
      {articles.length === 0 ? (
        <div className="bg-card rounded-card border-hairline border">
          <EmptyState
            title="No articles found"
            description="Create your first article to get started."
            action={
              <Button asChild size="sm">
                <Link href="/admin/inspire/create">New Article</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="bg-card rounded-card border-hairline @container overflow-hidden border">
          <ConsoleTable>
            <thead>
              <tr>
                <th className="hidden w-10 @md:table-cell">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="border-hairline rounded"
                    aria-label="Select all articles"
                  />
                </th>
                <th>Article</th>
                <th className="hidden @2xl:table-cell">Category</th>
                <th>Status</th>
                <th className="hidden @6xl:table-cell">Author</th>
                <th className="num hidden @2xl:table-cell">Published</th>
                <th className="num hidden @4xl:table-cell">Updated</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                // Live article URL. Deliberately the same rule as the editor's
                // "View Live" button (canViewLive) so the two never disagree:
                // published + a primary category. Note the public route matches
                // on slug alone and only uses the category segment to
                // canonicalise, so an uncategorised published article IS
                // reachable — it just has no canonical URL for us to link to,
                // and gets no icon rather than a guessed one. (0 such rows on
                // dev at time of writing.) The empty-slug guard is cheap
                // insurance: `/artikel/{cat}/` is a real route that renders the
                // category listing, so a blank slug would silently link to the
                // wrong page instead of 404ing.
                const liveUrl =
                  article.status === 'published' && article.categorySlug && article.slug
                    ? `/artikel/${article.categorySlug}/${article.slug}`
                    : null;
                return (
                  <tr key={article.id}>
                    <td className="hidden @md:table-cell">
                      <input
                        type="checkbox"
                        checked={selected.has(article.id)}
                        onChange={() => toggleOne(article.id)}
                        className="border-hairline rounded"
                        aria-label={`Select ${article.title}`}
                      />
                    </td>
                    <td>
                      {/* The edit link is an absolutely-positioned overlay
                        rather than a wrapper around the whole cell, so the
                        "open live article" anchor can sit inline after the
                        title. An <a> nested inside another <a> is invalid HTML:
                        the parser splits it back out, which desyncs the server
                        markup from React's tree and throws a hydration error.

                        `isolate` is load-bearing, not decoration. globals.css
                        pins `.console-table thead th` at z-index 2 inside the
                        scroller's own isolate context, and warns there that any
                        positioned row element carrying a z-index utility paints
                        OVER the sticky header. Without a stacking context here,
                        the z-30 icon and z-20 dot below would float above the
                        header row while you scroll. Isolating keeps the whole
                        ladder local, so the row still sits under the header.

                        Local ladder: overlay 1 (over the in-flow title text and
                        the positioned thumbnail, so the whole cell still opens
                        the editor) < dot 20 (needs hover for its tooltip) <
                        live-article icon 30. The overlay is FIRST in the DOM so
                        keyboard focus reaches Edit — the primary action — before
                        the live-article shortcut. */}
                      <div className="group/media relative isolate flex items-center gap-3">
                        {/* prefetch={false}: with 25 rows on screen, the default
                          viewport prefetch fires 25 `?_rsc=` requests that each
                          server-render a whole article editor (its own batch of
                          DB queries) against the 5-connection pool — for pages
                          nobody asked for. Opening an editor is a deliberate
                          click, so prefetching buys nothing and it is the same
                          fan-out that starved the pool on /admin/leads. */}
                        <Link
                          href={`/admin/inspire/${article.id}/edit`}
                          prefetch={false}
                          className="absolute inset-0 z-[1]"
                          title={article.title}
                        >
                          {/* The overlay has no visible text of its own, so give
                            screen readers the destination the title used to
                            carry. */}
                          <span className="sr-only">Edit {article.title}</span>
                        </Link>
                        <span className="bg-muted border-hairline relative hidden size-10 shrink-0 overflow-hidden rounded-[8px] border @md:block">
                          {article.coverImageUrl ? (
                            <Image
                              src={article.coverImageUrl}
                              alt=""
                              width={40}
                              height={40}
                              className="size-10 object-cover"
                            />
                          ) : null}
                          {article.coverImageUrl && (
                            <span
                              // Above the edit overlay, otherwise the overlay
                              // swallows its hover and the "Variants generated"
                              // tooltip never appears. Costs this dot its
                              // click-through to the editor — a few px, clipped
                              // smaller still by the thumbnail's overflow-hidden
                              // — an acceptable trade for the tooltip it exists
                              // for.
                              className={`border-card absolute -top-0.5 -right-0.5 z-20 size-2 rounded-full border ${
                                article.hasVariants ? 'bg-success' : 'bg-warning'
                              }`}
                              title={article.hasVariants ? 'Variants generated' : 'No variants'}
                            />
                          )}
                        </span>
                        {/* Capped so a long headline truncates instead of
                          widening the whole table — `auto` table-layout will
                          not truncate an unbounded cell. */}
                        <span className="max-w-[138px] min-w-0 @md:max-w-[150px] @2xl:max-w-[185px] @4xl:max-w-[300px] @6xl:max-w-[420px]">
                          <span className="flex min-w-0 items-center gap-1">
                            {/* The underline advertises "this opens the
                              editor", so suppress it while the pointer is on
                              the live-article icon — that goes somewhere else
                              entirely. `:has()` outranks `:hover` on
                              specificity, so the two rules resolve
                              deterministically rather than by source order.
                              Matched on `data-live-link`, not `[target=_blank]`:
                              Tailwind reads `_` in an arbitrary value as a
                              space, so that variant silently compiled to
                              `a[target=blank]` and matched nothing. */}
                            <span className="truncate font-semibold group-hover/media:underline group-has-[[data-live-link]:hover]/media:no-underline">
                              {article.title}
                            </span>
                            {liveUrl && (
                              // `p-[5px] -m-[5px]` grows the hit box to exactly
                              // 24×24 — the WCAG 2.5.8 (AA) minimum — while the
                              // negative margin cancels the padding, so neither
                              // the glyph nor the flex footprint moves. The bare
                              // 14px icon misses that bar, and every near-miss
                              // lands on the edit overlay underneath: a
                              // fat-finger tap on a tablet would open the editor
                              // instead of the live article, the two most
                              // different outcomes on this row.
                              // No `title`: `aria-label` already wins as the
                              // accessible name, and carrying both makes some
                              // screen readers announce the label twice.
                              <a
                                href={liveUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-live-link=""
                                aria-label={`Open live article: ${article.title}`}
                                className="text-muted-foreground hover:text-foreground relative z-30 -m-[5px] shrink-0 p-[5px] transition-colors"
                              >
                                <ExternalLinkIcon className="size-3.5" />
                              </a>
                            )}
                          </span>
                          {/* Carries the Category and Published columns while
                            they are hidden below `md`. */}
                          <span className="text-muted-foreground block truncate text-xs @2xl:hidden">
                            {[
                              article.categoryName,
                              article.scheduledPublishAt
                                ? `Scheduled ${new Date(article.scheduledPublishAt).toLocaleDateString()}`
                                : article.publishedAt
                                  ? new Date(article.publishedAt).toLocaleDateString()
                                  : new Date(article.createdAt).toLocaleDateString(),
                            ]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                          {article.isAiGenerated ? (
                            // Lifted above the edit overlay for the same reason
                            // as the variants dot: these Chips are unpositioned,
                            // so the overlay would otherwise intercept their
                            // hover and show the article title instead of their
                            // own tooltip. The "Reviewed" chip's tooltip is the
                            // ONLY place this table surfaces the human-review
                            // date, so a wrong tooltip there is a real loss. The
                            // cost is that this strip no longer click-throughs
                            // to the editor — the title line above still does.
                            <span className="relative z-20 mt-1 flex flex-wrap items-center gap-1">
                              <Chip variant="outline" size="sm" title="AI-generated article">
                                AI
                              </Chip>
                              {article.humanReviewedAt ? (
                                <Chip
                                  variant="success"
                                  size="sm"
                                  title={`Human reviewed ${formatDate(article.humanReviewedAt)}`}
                                >
                                  <BadgeCheckIcon className="size-3" />
                                  Reviewed
                                </Chip>
                              ) : (
                                <Chip
                                  variant="warning"
                                  size="sm"
                                  title="AI-generated article awaiting human review"
                                >
                                  Needs review
                                </Chip>
                              )}
                            </span>
                          ) : null}
                          {article.secondaryCategories.length > 0 ? (
                            <span className="text-muted-foreground block truncate text-xs">
                              {article.secondaryCategories.join(' · ')}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    </td>
                    <td className="text-muted-foreground hidden @2xl:table-cell">
                      {article.categoryName ?? '—'}
                    </td>
                    <td>
                      {article.status === 'draft' && article.scheduledPublishAt ? (
                        <Chip variant="warning" size="sm">
                          <CalendarClockIcon className="size-3" />
                          Scheduled
                        </Chip>
                      ) : (
                        <StatusChip
                          status={article.status}
                          variant={STATUS_VARIANTS[article.status]}
                          label={article.status}
                          className="capitalize"
                        />
                      )}
                    </td>
                    <td className="text-muted-foreground hidden @6xl:table-cell">
                      {article.authorName ?? '—'}
                    </td>
                    <td className="num text-muted-foreground hidden whitespace-nowrap @2xl:table-cell">
                      {article.scheduledPublishAt
                        ? formatDateTime(article.scheduledPublishAt)
                        : article.publishedAt
                          ? formatDate(article.publishedAt)
                          : formatDate(article.createdAt)}
                    </td>
                    <td className="num text-muted-foreground hidden whitespace-nowrap @4xl:table-cell">
                      {formatDate(article.updatedAt)}
                    </td>
                    <td className="actions">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-8">
                            <MoreHorizontalIcon className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/admin/inspire/${article.id}/edit`} prefetch={false}>
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDuplicate(article.id)}
                            disabled={isPending}
                          >
                            <CopyIcon className="mr-2 size-4" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleToggleStatus(article.id)}
                            disabled={isPending}
                          >
                            {article.status === 'draft' ? 'Publish' : 'Unpublish'}
                          </DropdownMenuItem>
                          {article.isAiGenerated && (
                            <DropdownMenuItem
                              onClick={() => handleToggleHumanReviewed(article.id)}
                              disabled={isPending}
                            >
                              <BadgeCheckIcon className="mr-2 size-4" />
                              {article.humanReviewedAt
                                ? 'Unmark human reviewed'
                                : 'Mark as human reviewed'}
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(article.id)}
                            disabled={isPending}
                            className="text-destructive"
                          >
                            <TrashIcon className="mr-2 size-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ConsoleTable>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <span className="text-muted-foreground font-mono tabular-nums">
            {offset + 1}–{offset + articles.length} of {total} · page {currentPage}/{totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="quiet"
              size="sm"
              disabled={currentPage <= 1 || isNavigating}
              onClick={() => navigate(buildHref({ page: String(currentPage - 1) }))}
            >
              Previous
            </Button>
            <Button
              variant="quiet"
              size="sm"
              disabled={currentPage >= totalPages || isNavigating}
              onClick={() => navigate(buildHref({ page: String(currentPage + 1) }))}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
