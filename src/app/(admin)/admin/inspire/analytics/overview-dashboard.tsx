import Link from 'next/link';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { StatHint } from '@/components/ui/stat-hint';
import { ConsoleTable } from '@/components/ui/console-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Panel, PanelFailed } from '@/components/admin/analytics-panels';
import { ArticleStatusChip } from '@/components/admin/article-status-chip';
import { formatDate } from '@/lib/utils/format-date';
import { pctChange, type AttentionItem, type LeaderRow } from '@/lib/analytics/article-leaderboard';
import { formatDay, type ArticlePeriod } from '@/lib/analytics/article-period';
import { SCROLL_TRACKING_SINCE } from '@/lib/analytics/scroll-tracking';
import { PAGE_SIZE, type OverviewData, type OverviewFilters } from './overview-data';
import { overviewHref } from './overview-params';
import { ViewsChart } from './views-chart';

const fmtInt = (n: number) => n.toLocaleString('en-MY');

function reportHref(id: string): string {
  return `/admin/inspire/${id}/analytics`;
}

/** "▲ 12%" / "▼ 8%" / "No change" / null when there is nothing to compare. */
function changeText(
  cur: number,
  prev: number,
): { text: string; trend: 'up' | 'down' | 'neutral' } | null {
  const pct = pctChange(cur, prev);
  if (pct === null) return prev === 0 && cur > 0 ? { text: 'New this period', trend: 'up' } : null;
  if (Math.abs(pct) < 0.5) return { text: 'No change', trend: 'neutral' };
  return {
    text: `${pct > 0 ? '▲' : '▼'} ${Math.abs(pct) >= 10 ? Math.round(Math.abs(pct)) : Math.abs(pct).toFixed(1)}%`,
    trend: pct > 0 ? 'up' : 'down',
  };
}

function Tile({
  label,
  hint,
  value,
  cur,
  prev,
  comparisonLabel,
  note,
}: {
  label: string;
  hint: string;
  value: string;
  cur?: number;
  prev?: number;
  comparisonLabel: string | null;
  note?: string;
}) {
  const change =
    comparisonLabel && cur !== undefined && prev !== undefined ? changeText(cur, prev) : null;
  return (
    <StatCard
      label={<StatHint label={label} hint={hint} />}
      value={value}
      trend={change?.trend ?? 'neutral'}
      delta={
        change || note ? (
          <span className="flex flex-col gap-0.5">
            {change && (
              <span>
                {change.text}{' '}
                <span className="text-muted-foreground font-normal">{comparisonLabel}</span>
              </span>
            )}
            {note && <span className="text-muted-foreground font-normal">{note}</span>}
          </span>
        ) : undefined
      }
    />
  );
}

function FailedTile({ label }: { label: string }) {
  return <StatCard label={label} value="—" delta="Couldn't load. Refresh to try again." />;
}

function Tiles({ data, period }: { data: OverviewData; period: ArticlePeriod }) {
  const t = data.tiles;
  const cmp = period.comparisonLabel;
  const read = t.readThrough;
  const readShare = read?.cur && read.cur.readers > 0 ? read.cur.finished / read.cur.readers : null;
  const prevShare =
    read?.prev && read.prev.readers > 0 ? read.prev.finished / read.prev.readers : null;
  const googleNote =
    t.google?.dailyThrough && t.google.dailyThrough < period.range.to
      ? `Google reports 2–3 days late: up to ${formatDay(t.google.dailyThrough)}`
      : undefined;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {t.views ? (
        <Tile
          label="Article views"
          hint="Every time an article page was opened, including repeat visits."
          value={fmtInt(t.views.cur)}
          cur={t.views.cur}
          prev={t.views.prev}
          comparisonLabel={cmp}
        />
      ) : (
        <FailedTile label="Article views" />
      )}
      {t.readers ? (
        <Tile
          label="Readers"
          hint="People who opened at least one article. Approximate: someone who comes back on three different days counts three times."
          value={fmtInt(t.readers.cur)}
          cur={t.readers.cur}
          prev={t.readers.prev}
          comparisonLabel={cmp}
        />
      ) : (
        <FailedTile label="Readers" />
      )}
      {t.google ? (
        <Tile
          label="Google clicks"
          hint={
            period.key === 'lifetime'
              ? 'Clicks from Google search results to our articles, over all the Google history we have stored.'
              : 'Clicks from Google search results to our articles.'
          }
          value={fmtInt(t.google.cur)}
          cur={t.google.cur}
          prev={t.google.prev}
          comparisonLabel={cmp}
          note={googleNote}
        />
      ) : (
        <FailedTile label="Google clicks" />
      )}
      {read ? (
        <Tile
          label="Read to the end"
          hint="Of the people who opened an article, the share who scrolled at least three-quarters of the way down."
          value={readShare === null ? 'Not tracked yet' : `${Math.round(readShare * 100)}%`}
          cur={readShare !== null && prevShare !== null ? readShare : undefined}
          prev={prevShare ?? undefined}
          comparisonLabel={prevShare !== null ? cmp : null}
          note={
            read.range && read.range.from > period.range.from
              ? `Tracked since ${formatDay(SCROLL_TRACKING_SINCE)}`
              : undefined
          }
        />
      ) : (
        <FailedTile label="Read to the end" />
      )}
    </div>
  );
}

function SectionHead({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-hairline border-b px-4 py-3">
      <h2 className="text-sm font-semibold">{title}</h2>
      {description && <p className="text-muted-foreground mt-0.5 text-xs">{description}</p>}
    </div>
  );
}

function ArticleCell({ row }: { row: Pick<LeaderRow, 'id' | 'title' | 'status' | 'publishedAt'> }) {
  return (
    <div className="flex max-w-[260px] min-w-0 flex-col sm:max-w-[360px]">
      <Link
        href={reportHref(row.id)}
        prefetch={false}
        title={row.title}
        className="truncate font-semibold underline-offset-4 hover:underline"
      >
        {row.title}
      </Link>
      <span className="text-muted-foreground flex items-center gap-2 text-xs">
        {row.publishedAt ? `Published ${formatDate(row.publishedAt)}` : 'Not published'}
        {row.status !== 'published' && <ArticleStatusChip status={row.status} />}
      </span>
    </div>
  );
}

function Change({ cur, prev, show }: { cur: number; prev: number; show: boolean }) {
  if (!show) return null;
  const c = changeText(cur, prev);
  if (!c) return null;
  return (
    <span
      className={
        c.trend === 'up'
          ? 'text-success block text-[11px]'
          : c.trend === 'down'
            ? 'text-error block text-[11px]'
            : 'text-muted-foreground block text-[11px]'
      }
    >
      {c.text}
    </span>
  );
}

function SortHeader({
  label,
  sortKey,
  filters,
  params,
}: {
  label: string;
  sortKey: OverviewFilters['sort'];
  filters: OverviewFilters;
  params: Record<string, string>;
}) {
  const active = filters.sort === sortKey;
  return (
    <th className="num" aria-sort={active ? 'descending' : 'none'}>
      <Link
        href={overviewHref(params, { sort: sortKey })}
        prefetch={false}
        className={
          active ? 'text-foreground underline underline-offset-4' : 'hover:text-foreground'
        }
      >
        {label}
        {active ? ' ↓' : ''}
      </Link>
    </th>
  );
}

function Filters({
  data,
  filters,
  params,
}: {
  data: OverviewData;
  filters: OverviewFilters;
  params: Record<string, string>;
}) {
  // A plain GET form: works without JavaScript, and the result is a shareable URL.
  return (
    <form
      method="get"
      action="/admin/inspire/analytics"
      className="flex flex-wrap items-end gap-3 px-4 py-3"
      role="search"
    >
      {params.period && <input type="hidden" name="period" value={params.period} />}
      {params.month && <input type="hidden" name="month" value={params.month} />}
      {params.sort && <input type="hidden" name="sort" value={params.sort} />}
      <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-xs font-semibold">
        Search articles
        <input
          type="search"
          name="q"
          defaultValue={filters.q}
          placeholder="Article title"
          className="border-hairline bg-background h-9 rounded-md border px-3 text-sm font-normal"
        />
      </label>
      <label className="flex flex-col gap-1 text-xs font-semibold">
        Category
        <select
          name="category"
          defaultValue={filters.category}
          className="border-hairline bg-background h-9 rounded-md border px-2 text-sm font-normal"
        >
          <option value="">All categories</option>
          {data.categories.map((c) => (
            <option key={c.slug} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex h-9 items-center gap-2 text-sm">
        <input type="checkbox" name="fresh" value="1" defaultChecked={filters.fresh} />
        Only articles published in this period
      </label>
      <button
        type="submit"
        className="bg-primary text-primary-foreground h-9 rounded-md px-4 text-sm font-semibold"
      >
        Apply
      </button>
      {(filters.q || filters.category || filters.fresh) && (
        <Link
          href={overviewHref(params, { q: null, category: null, fresh: null })}
          prefetch={false}
          className="text-muted-foreground hover:text-foreground h-9 content-center text-sm underline-offset-4 hover:underline"
        >
          Clear filters
        </Link>
      )}
    </form>
  );
}

function Leaderboard({
  data,
  period,
  filters,
  params,
}: {
  data: OverviewData;
  period: ArticlePeriod;
  filters: OverviewFilters;
  params: Record<string, string>;
}) {
  const lb = data.leaderboard;
  const showChange = Boolean(period.prevRange);
  const dash = <span className="text-muted-foreground">—</span>;
  const start = (lb.page - 1) * PAGE_SIZE;
  return (
    <Panel>
      <SectionHead
        title={`Top articles · ${period.label}`}
        description="Ranked by views. Click Readers or Google clicks to rank by those instead, or click an article for its full report."
      />
      <Filters data={data} filters={filters} params={params} />
      {data.failed.articles ? (
        <PanelFailed />
      ) : lb.rows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title="No articles match"
            description="Try a different search, category or period."
          />
        </div>
      ) : (
        <ConsoleTable>
          <thead>
            <tr>
              <th className="num">#</th>
              <th>Article</th>
              <SortHeader label="Views" sortKey="views" filters={filters} params={params} />
              <SortHeader label="Readers" sortKey="readers" filters={filters} params={params} />
              <SortHeader
                label="Google clicks"
                sortKey="google"
                filters={filters}
                params={params}
              />
              <th className="num" title="Average position in Google results (1 = top)">
                Google rank
              </th>
              <th
                className="num"
                title="Share of readers who scrolled three-quarters of the way down"
              >
                Read to end
              </th>
            </tr>
          </thead>
          <tbody>
            {lb.rows.map((r, i) => {
              const rt = lb.readThrough?.[r.slug];
              return (
                <tr key={r.id}>
                  <td className="num text-muted-foreground">{start + i + 1}</td>
                  <td>
                    <ArticleCell row={r} />
                  </td>
                  <td className="num">
                    {data.failed.views ? dash : fmtInt(r.views)}
                    <Change
                      cur={r.views}
                      prev={r.prevViews}
                      show={showChange && !data.failed.views}
                    />
                  </td>
                  <td className="num">{data.failed.views ? dash : fmtInt(r.readers)}</td>
                  <td className="num">
                    {data.failed.google ? dash : fmtInt(r.googleClicks)}
                    <Change
                      cur={r.googleClicks}
                      prev={r.prevGoogleClicks}
                      show={showChange && !data.failed.google}
                    />
                  </td>
                  <td className="num">
                    {data.failed.google || r.position === null ? dash : r.position.toFixed(1)}
                  </td>
                  <td className="num">
                    {rt && rt.readers > 0
                      ? `${Math.round((rt.finished / rt.readers) * 100)}%`
                      : dash}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </ConsoleTable>
      )}
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
        <span>
          {fmtInt(lb.total)} articles
          {lb.total > 0 && ` · showing ${start + 1}–${start + lb.rows.length}`}
        </span>
        {lb.pageCount > 1 && (
          <span className="flex items-center gap-3">
            {lb.page > 1 && (
              <Link
                href={overviewHref(params, { page: String(lb.page - 1) })}
                prefetch={false}
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                ← Previous
              </Link>
            )}
            <span>
              Page {lb.page} of {lb.pageCount}
            </span>
            {lb.page < lb.pageCount && (
              <Link
                href={overviewHref(params, { page: String(lb.page + 1) })}
                prefetch={false}
                className="hover:text-foreground underline-offset-4 hover:underline"
              >
                Next →
              </Link>
            )}
          </span>
        )}
      </div>
      <p className="text-muted-foreground border-hairline border-t px-4 py-3 text-[11px] leading-relaxed">
        Readers are approximate: someone who comes back on three different days counts three times.
        Read to end is tracked since {formatDay(SCROLL_TRACKING_SINCE)}.
      </p>
    </Panel>
  );
}

function MoverList({
  title,
  rows,
  direction,
}: {
  title: string;
  rows: LeaderRow[];
  direction: 'up' | 'down';
}) {
  const Icon = direction === 'up' ? ArrowUpIcon : ArrowDownIcon;
  return (
    <Panel>
      <SectionHead title={title} />
      {rows.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">
          {direction === 'up' ? 'No article grew noticeably.' : 'No article dropped noticeably.'}
        </p>
      ) : (
        <ul className="divide-hairline divide-y">
          {rows.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <ArticleCell row={r} />
              <span
                className={`flex shrink-0 items-center gap-1 text-sm font-semibold tabular-nums ${
                  direction === 'up' ? 'text-success' : 'text-error'
                }`}
              >
                <Icon className="size-3.5" aria-hidden />
                {fmtInt(Math.abs(r.views - r.prevViews))}
                <span className="text-muted-foreground text-xs font-normal">
                  {' '}
                  ({fmtInt(r.prevViews)} → {fmtInt(r.views)})
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Movers({ data, period }: { data: OverviewData; period: ArticlePeriod }) {
  if (!period.prevRange) {
    return (
      <Panel className="p-4">
        <p className="text-sm font-semibold">Biggest movers</p>
        <p className="text-muted-foreground mt-1 text-sm">
          Lifetime has nothing earlier to compare against. Pick a shorter period to see which
          articles are rising or falling.
        </p>
      </Panel>
    );
  }
  if (!data.movers) {
    return (
      <Panel>
        <SectionHead title="Biggest movers" />
        <PanelFailed />
      </Panel>
    );
  }
  return (
    <section className="flex flex-col gap-2" aria-label="Biggest movers">
      <div>
        <h2 className="text-sm font-semibold">Biggest movers</h2>
        <p className="text-muted-foreground text-xs">
          Change in views {period.comparisonLabel}. Articles published since then are under New
          article launches instead.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <MoverList title="Rising" rows={data.movers.risers} direction="up" />
        <MoverList title="Falling" rows={data.movers.fallers} direction="down" />
      </div>
    </section>
  );
}

function Launches({ data, period }: { data: OverviewData; period: ArticlePeriod }) {
  return (
    <Panel>
      <SectionHead
        title="New article launches"
        description={`Articles that went live in this period (${period.label.toLowerCase()}), and how many views they got in their first week and first month.`}
      />
      {data.launches === null ? (
        <PanelFailed />
      ) : data.launches.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">No articles went live in this period.</p>
      ) : (
        <ConsoleTable>
          <thead>
            <tr>
              <th>Article</th>
              <th className="num">First 7 days</th>
              <th className="num">First 30 days</th>
            </tr>
          </thead>
          <tbody>
            {data.launches.map((l) => (
              <tr key={l.slug}>
                <td>
                  <ArticleCell
                    row={{
                      id: l.id,
                      title: l.title,
                      status: 'published',
                      publishedAt: `${l.publishedOn}T00:00:00+08:00`,
                    }}
                  />
                </td>
                <td className="num">
                  {fmtInt(l.first7)}
                  {l.daysLive < 7 && (
                    <span className="text-muted-foreground block text-[11px]">
                      so far ({l.daysLive}d)
                    </span>
                  )}
                </td>
                <td className="num">
                  {fmtInt(l.first30)}
                  {l.daysLive < 30 && (
                    <span className="text-muted-foreground block text-[11px]">
                      so far ({l.daysLive}d)
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </ConsoleTable>
      )}
    </Panel>
  );
}

function AttentionList({
  title,
  why,
  items,
  empty,
  titleTest = false,
}: {
  title: string;
  why: string;
  items: AttentionItem[];
  empty: string;
  /** Offer "Start a title test" on each item (the rarely-clicked list). */
  titleTest?: boolean;
}) {
  return (
    <Panel>
      <SectionHead title={title} description={why} />
      {items.length === 0 ? (
        <p className="text-muted-foreground p-4 text-sm">{empty}</p>
      ) : (
        <ul className="divide-hairline divide-y">
          {items.map((it) => (
            <li key={it.row.id} className="flex flex-col gap-1 px-4 py-3">
              <ArticleCell row={it.row} />
              <p className="text-sm">{it.finding}.</p>
              <p className="text-muted-foreground text-xs">
                <span className="text-foreground font-semibold">Suggested fix: </span>
                {it.action}
              </p>
              {titleTest && (
                <Link
                  href={`/admin/inspire/analytics?view=title-tests&start=${it.row.id}`}
                  prefetch={false}
                  className="text-primary w-fit text-xs font-semibold underline-offset-4 hover:underline"
                >
                  Start a title test
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Attention({ data, period }: { data: OverviewData; period: ArticlePeriod }) {
  if (!data.attention) {
    return (
      <Panel>
        <SectionHead title="Needs attention" />
        <PanelFailed />
      </Panel>
    );
  }
  const a = data.attention;
  return (
    <section className="flex flex-col gap-2" aria-label="Needs attention">
      <div>
        <h2 className="text-sm font-semibold">Needs attention</h2>
        <p className="text-muted-foreground text-xs">
          Articles with a fixable problem in this period, biggest opportunity first.
        </p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <AttentionList
          title="Seen on Google, rarely clicked"
          why="People see these in search results, but far fewer click than usual for that position."
          items={a.lowCtr}
          titleTest
          empty="Nothing stands out: articles get about the clicks their Google position usually earns."
        />
        <AttentionList
          title="Slipping on Google"
          why={`Average Google position dropped by 3 places or more ${period.comparisonLabel ?? ''}.`}
          items={a.slipping}
          empty={
            period.prevRange
              ? 'No article lost noticeable ground on Google.'
              : 'Lifetime has nothing earlier to compare against.'
          }
        />
        <AttentionList
          title="Opened, but not read"
          why="Plenty of readers, but most leave before three-quarters of the way down."
          items={a.unread}
          empty="No widely read article is being abandoned early."
        />
      </div>
    </section>
  );
}

export function OverviewDashboard({
  data,
  period,
  filters,
  params,
}: {
  data: OverviewData;
  period: ArticlePeriod;
  filters: OverviewFilters;
  params: Record<string, string>;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <Tiles data={data} period={period} />

      <Panel>
        <SectionHead title="Article views per day" description={`All articles · ${period.label}`} />
        <div className="h-[260px] w-full px-2 py-4">
          {data.daily === null ? <PanelFailed /> : <ViewsChart daily={data.daily} />}
        </div>
      </Panel>

      <Leaderboard data={data} period={period} filters={filters} params={params} />
      <Movers data={data} period={period} />
      <Launches data={data} period={period} />
      <Attention data={data} period={period} />
    </div>
  );
}
