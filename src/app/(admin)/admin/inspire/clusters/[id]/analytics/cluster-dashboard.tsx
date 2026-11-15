import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { ConsoleTable } from '@/components/ui/console-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Panel, PanelFailed, StatTile } from '@/components/admin/analytics-panels';
import { cn } from '@/lib/utils';
import {
  CLUSTER_WINDOW_LABELS,
  CLUSTER_WINDOWS,
  LINK_CLICKS_SINCE,
  SERIES_BOX_SINCE,
  type ClusterWindow,
} from '@/lib/analytics/cluster-window';
import type {
  ClusterLinkClick,
  ClusterOverview,
  ClusterSeriesBox,
  ClusterTransition,
} from '@/lib/analytics/cluster-analytics';

/**
 * Cluster analytics (R16–R21): headline tiles, the member table, "where
 * readers went next" and the link-click matrix. Server-component safe (no
 * hooks): the window chooser is plain links, so every view is a URL.
 *
 * Each read is independently `null` = "couldn't load" (its safePanel failed)
 * or empty, so one failed read never blanks the page and a failure never
 * passes for "no data" (D5).
 */

/** A KL calendar day (`yyyy-MM-dd`) as `9 Aug 2026` (D2). */
function fmtDay(day: string): string {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const FLOW_EXPECTATION =
  'Single digits is normal. Across all our articles, about 4 in 100 visits read two or more articles (measured over 90 days in November 2026).';

export const CLICKS_CAPTION = `Counts in-body article links only — not related-article cards, menus or search. A reader who clicks twice counts twice. Recorded from ${fmtDay(LINK_CLICKS_SINCE)}. The visits above catch every route from one article to another; this shows which links did the moving.`;

export const JOURNEY_CAPTION =
  'How often readers went straight from the article on the left to the numbered article. Every move counts: a reader who goes back and forth twice counts twice. Reloading the same article is not a move.';

/**
 * The Series box panel's caption (R18): how it counts, and from when. It says
 * the two things an admin would otherwise get wrong — that a reader who sees
 * the box on three articles counts three times (so the click rate is per view,
 * not per reader), and that only the articles showing THIS series are counted,
 * which is also why removing an article from the cluster drops its history out
 * of the table.
 */
export const SERIES_CAPTION = `One view each time the box appears on screen for a reader, counted on the articles that show this series — an article in two switched-on series counts on the first one it joined. A reader who reads three articles of the series sees the box three times, so the click rate is clicks per view, not per reader. Bot traffic excluded. Numbers follow the cluster's articles as they are now: remove an article and its views stop counting here. Recorded from ${fmtDay(SERIES_BOX_SINCE)}.`;

export interface ClusterDashboardMember {
  articleId: string;
  slug: string;
  title: string;
}

export interface ClusterDashboardProps {
  clusterId: string;
  members: ClusterDashboardMember[];
  window: ClusterWindow;
  /** null = the read failed ("couldn't load"). */
  overview: ClusterOverview | null;
  journey: ClusterTransition[] | null;
  clicks: ClusterLinkClick[] | null;
  /** The Series box panel (R18); null = its read failed. */
  series: ClusterSeriesBox | null;
  /** Whether the cluster's box is switched on — the "switched off" state. */
  seriesEnabled: boolean;
}

function fmtPct(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%';
  const pct = share * 100;
  if (pct < 1) return '<1%';
  // One decimal under 10 % — "4.2%" is the number this page is about.
  return pct < 10 ? `${pct.toFixed(1).replace(/\.0$/, '')}%` : `${Math.round(pct)}%`;
}

function reportHref(articleId: string): string {
  return `/admin/inspire/${articleId}/analytics`;
}

function PanelHeader({ title, caption }: { title: string; caption?: React.ReactNode }) {
  return (
    <div className="border-hairline border-b px-4 py-3">
      <p className="text-sm font-semibold" data-panel-title>
        {title}
      </p>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  );
}

/** Last 30 days / Last 90 days / Last 12 months, as links (D2). */
function WindowChooser({ clusterId, window }: { clusterId: string; window: ClusterWindow }) {
  return (
    <nav aria-label="Time window" className="flex flex-wrap items-center gap-2">
      <span className="text-muted-foreground text-xs font-semibold">Showing</span>
      {CLUSTER_WINDOWS.map((w) => (
        <Chip key={w} asChild selected={w === window} size="sm">
          <Link
            href={`/admin/inspire/clusters/${clusterId}/analytics?window=${w}`}
            aria-current={w === window ? 'page' : undefined}
            data-window={w}
          >
            {CLUSTER_WINDOW_LABELS[w]}
          </Link>
        </Chip>
      ))}
    </nav>
  );
}

/** Member n's short column label and its full title. */
function memberLabel(i: number): string {
  return String(i + 1);
}

/**
 * An N×N from→to table. Rows are "from", columns "to", numbered like the
 * member table; the diagonal (an article to itself) is never a move and shows
 * —; zero cells are muted so the real moves stand out.
 */
function FromToMatrix({
  members,
  value,
  kind,
}: {
  members: ClusterDashboardMember[];
  value: (from: ClusterDashboardMember, to: ClusterDashboardMember) => number;
  kind: string;
}) {
  return (
    <ConsoleTable>
      <thead>
        <tr>
          <th className="min-w-[160px] sm:min-w-[200px]">From ↓ · to →</th>
          {members.map((m, i) => (
            <th key={m.articleId} className="num w-12 min-w-12" title={m.title}>
              {memberLabel(i)}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {members.map((from, i) => (
          <tr key={from.articleId} data-matrix-row={from.slug}>
            <td className="max-w-[180px] sm:max-w-[240px]">
              <span className="block truncate" title={from.title}>
                {memberLabel(i)}. {from.title}
              </span>
            </td>
            {members.map((to) => {
              if (to.articleId === from.articleId) {
                return (
                  <td
                    key={to.articleId}
                    className="num text-muted-foreground/50"
                    aria-label="Same article"
                  >
                    —
                  </td>
                );
              }
              const n = value(from, to);
              return (
                <td
                  key={to.articleId}
                  className={cn('num tabular-nums', n === 0 && 'text-muted-foreground/50')}
                  data-cell={`${from.slug}>${to.slug}`}
                  title={`${from.title} → ${to.title}: ${n.toLocaleString()} ${kind}`}
                >
                  {n.toLocaleString()}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </ConsoleTable>
  );
}

/** How many rows "Most-clicked series links" shows (R18). */
export const SERIES_LINKS_SHOWN = 10;

/** Clicks ÷ times seen, or "—" when the box has not been seen at all (R18). */
function fmtClickRate(clicks: number, seen: number): string {
  return seen > 0 ? fmtPct(clicks / seen) : '—';
}

/**
 * The "Series box" panel (R18): how often readers saw the box, how often they
 * clicked a row, per member and per from→to pair.
 *
 * Four states, all distinct (D4), chosen in THIS order so the later two can
 * never contradict the numbers:
 *   - the read failed      → "This panel couldn't load" (never a row of zeros);
 *   - anything recorded (`hasHistory`) → the numbers, even if the box has since
 *     been switched off: the history readers made is still true (T5-F1). Every
 *     empty state below is unreachable from here;
 *   - nothing recorded and the box is OFF → it says so, and links to the
 *     switch, because zero views is the expected answer there;
 *   - nothing recorded and the box is ON  → "No one has seen the series box
 *     yet" (it is collecting).
 *
 * T5-F1: `hasHistory` is tested FIRST and the "off" copy is scoped to this
 * window, so the panel can never tell an admin there is "nothing to count"
 * while it is holding views or clicks.
 */
function SeriesPanel({
  clusterId,
  members,
  series,
  seriesEnabled,
  windowLabel,
}: {
  clusterId: string;
  members: ClusterDashboardMember[];
  series: ClusterSeriesBox | null;
  seriesEnabled: boolean;
  windowLabel: string;
}) {
  const byId = new Map(members.map((m) => [m.articleId, m]));
  const rows = (series?.perArticle ?? []).filter((r) => byId.has(r.articleId));
  const links = (series?.links ?? [])
    .filter((l) => byId.has(l.fromArticleId) && byId.has(l.toArticleId))
    .slice(0, SERIES_LINKS_SHOWN);
  // Anything at all recorded in this window — the numbers win over every empty
  // state, switched off or not (T5-F1).
  const hasHistory = series !== null && (series.seen > 0 || series.clicks > 0);

  return (
    <Panel className="min-w-0 p-0">
      <PanelHeader title="Series box" caption={`${windowLabel}. ${SERIES_CAPTION}`} />
      {series === null ? (
        <PanelFailed />
      ) : !hasHistory ? (
        <div className="p-4">
          {seriesEnabled ? (
            <EmptyState
              title="No one has seen the series box yet"
              description="The box is switched on for this cluster. Views and clicks appear here once readers reach it."
            />
          ) : (
            <EmptyState
              title="The series box is switched off for this cluster"
              description="Readers see no series box on these articles, so nothing new is being counted — and no views or clicks were recorded in this window. Switch it on in the cluster's settings."
              action={
                <Button variant="quiet" size="sm" asChild>
                  <Link href={`/admin/inspire/clusters/${clusterId}`}>Open cluster settings</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <StatTile
              label="Times the series box was seen"
              value={series.seen.toLocaleString()}
              hint="One view per page view, on the articles that show this series"
            />
            <StatTile
              label="Clicks on series links"
              value={series.clicks.toLocaleString()}
              hint="Clicks on a row of the box"
            />
            <StatTile
              label="Click rate"
              value={fmtClickRate(series.clicks, series.seen)}
              hint="Clicks ÷ times seen"
            />
          </div>

          <ConsoleTable>
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th className="min-w-[160px] sm:min-w-[220px]">Article</th>
                <th className="num">Seen</th>
                <th className="num">Clicks</th>
                <th className="num">Click rate</th>
              </tr>
            </thead>
            <tbody>
              {members.map((m, i) => {
                const r = rows.find((x) => x.articleId === m.articleId);
                const seen = r?.seen ?? 0;
                const clicked = r?.clicks ?? 0;
                return (
                  <tr key={m.articleId} data-series-row={m.slug}>
                    <td className="text-muted-foreground tabular-nums">{i + 1}</td>
                    <td className="max-w-[180px] sm:max-w-[320px]">
                      <Link
                        href={reportHref(m.articleId)}
                        prefetch={false}
                        title={m.title}
                        className="hover:text-primary block truncate font-semibold"
                      >
                        {m.title}
                      </Link>
                    </td>
                    <td className="num tabular-nums">{seen.toLocaleString()}</td>
                    <td className="num tabular-nums">{clicked.toLocaleString()}</td>
                    <td className="num tabular-nums">{fmtClickRate(clicked, seen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </ConsoleTable>

          <div className="border-hairline border-t px-4 py-3">
            <p className="text-sm font-semibold" data-series-links-title>
              Most-clicked series links
            </p>
            <p className="text-muted-foreground text-xs">
              Which row of the box readers actually use, most clicked first.
            </p>
          </div>
          {links.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No series links clicked yet"
                description="Readers have seen the box but not clicked a row."
              />
            </div>
          ) : (
            <ConsoleTable>
              <thead>
                <tr>
                  <th className="min-w-[140px] sm:min-w-[200px]">From</th>
                  <th className="min-w-[140px] sm:min-w-[200px]">To</th>
                  <th className="num">Clicks</th>
                </tr>
              </thead>
              <tbody>
                {links.map((l) => {
                  const from = byId.get(l.fromArticleId)!;
                  const to = byId.get(l.toArticleId)!;
                  return (
                    <tr
                      key={`${l.fromArticleId}-${l.toArticleId}`}
                      data-series-link={`${from.slug}>${to.slug}`}
                    >
                      <td className="max-w-[160px] sm:max-w-[260px]">
                        <span className="block truncate" title={from.title}>
                          {from.title}
                        </span>
                      </td>
                      <td className="max-w-[160px] sm:max-w-[260px]">
                        <span className="block truncate" title={to.title}>
                          {to.title}
                        </span>
                      </td>
                      <td className="num tabular-nums">{l.clicks.toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </ConsoleTable>
          )}
        </>
      )}
    </Panel>
  );
}

export function ClusterDashboard({
  clusterId,
  members,
  window,
  overview,
  journey,
  clicks,
  series,
  seriesEnabled,
}: ClusterDashboardProps) {
  if (members.length === 0) {
    return (
      <Panel className="p-6">
        <EmptyState
          title="This cluster has no articles yet"
          description="Put articles in this cluster with the article editor's Cluster picker, then come back to see how readers move between them."
          action={
            <Button variant="quiet" size="sm" asChild>
              <Link href={`/admin/inspire/clusters/${clusterId}`}>Open cluster</Link>
            </Button>
          }
        />
      </Panel>
    );
  }

  const windowLabel = CLUSTER_WINDOW_LABELS[window];
  const single = members.length < 2;
  const bySlug = new Map(members.map((m) => [m.slug, m]));

  // Clicks out / in per member, and the from→to lookup.
  const clickCell = new Map<string, number>();
  const clicksOut = new Map<string, number>();
  const clicksIn = new Map<string, number>();
  let totalClicks = 0;
  for (const c of clicks ?? []) {
    const to = bySlug.get(c.toSlug);
    if (!to) continue;
    clickCell.set(`${c.fromArticleId}\n${to.articleId}`, c.clicks);
    clicksOut.set(c.fromArticleId, (clicksOut.get(c.fromArticleId) ?? 0) + c.clicks);
    clicksIn.set(to.articleId, (clicksIn.get(to.articleId) ?? 0) + c.clicks);
    totalClicks += c.clicks;
  }
  const moveCell = new Map((journey ?? []).map((t) => [`${t.from}\n${t.to}`, t.moves]));
  const rowBySlug = new Map((overview?.members ?? []).map((r) => [r.slug, r]));

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <WindowChooser clusterId={clusterId} window={window} />

      <section aria-label="Headline numbers" className="flex flex-col gap-2">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label="Visits that read this cluster"
            value={overview ? overview.visits.toLocaleString() : '—'}
            hint="Visits that opened at least one of these articles"
          />
          <StatTile
            label="Read 2+ cluster articles"
            value={overview ? fmtPct(overview.flowRate) : '—'}
            hint={
              overview
                ? `${overview.flowSessions.toLocaleString()} ${overview.flowSessions === 1 ? 'visit' : 'visits'} · recirculation rate`
                : 'Recirculation rate'
            }
          />
          <StatTile
            label="Articles read per visit"
            value={overview && overview.visits > 0 ? overview.articlesPerVisit.toFixed(2) : '—'}
            hint="Different cluster articles per visit, on average"
          />
          <StatTile
            label="Link clicks between cluster articles"
            value={clicks ? totalClicks.toLocaleString() : '—'}
            hint="In-body links only"
          />
        </div>
        {overview === null ? (
          <Panel>
            <PanelFailed />
          </Panel>
        ) : (
          <p className="text-muted-foreground text-xs" data-flow-expectation>
            {single
              ? 'With one article, every visit reads one article — add a second to see movement.'
              : FLOW_EXPECTATION}
          </p>
        )}
        {clicks === null && overview !== null && (
          <p className="text-muted-foreground text-xs" role="status">
            {"Link clicks couldn't load. Refresh the page to try again."}
          </p>
        )}
      </section>

      <Panel className="min-w-0 p-0">
        <PanelHeader
          title="Articles in this cluster"
          caption={`${windowLabel}, bot traffic excluded. Click an article for its full report.`}
        />
        {overview === null ? (
          <PanelFailed />
        ) : (
          <>
            <ConsoleTable>
              <thead>
                <tr>
                  <th className="w-10">#</th>
                  <th className="min-w-[160px] sm:min-w-[220px]">Article</th>
                  <th className="num">Views</th>
                  <th className="num" title="A visitor is counted once per day">
                    Unique visitors
                  </th>
                  <th
                    className="num"
                    title="Share of cluster visits whose last cluster article was this one"
                  >
                    Last stop
                  </th>
                  <th className="num">Clicks out</th>
                  <th className="num">Clicks in</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m, i) => {
                  const r = rowBySlug.get(m.slug);
                  return (
                    <tr key={m.articleId} data-member-row={m.slug}>
                      <td className="text-muted-foreground tabular-nums">{i + 1}</td>
                      <td className="max-w-[180px] sm:max-w-[320px]">
                        <Link
                          href={reportHref(m.articleId)}
                          prefetch={false}
                          title={m.title}
                          className="hover:text-primary block truncate font-semibold"
                        >
                          {m.title}
                        </Link>
                      </td>
                      <td className="num tabular-nums">{(r?.views ?? 0).toLocaleString()}</td>
                      <td className="num tabular-nums">
                        {(r?.uniqueVisitors ?? 0).toLocaleString()}
                      </td>
                      <td
                        className="num tabular-nums"
                        title={`${(r?.lastStops ?? 0).toLocaleString()} visits ended here`}
                      >
                        {fmtPct(r?.lastStopShare ?? 0)}
                      </td>
                      <td className="num tabular-nums">
                        {clicks ? (clicksOut.get(m.articleId) ?? 0).toLocaleString() : '—'}
                      </td>
                      <td className="num tabular-nums">
                        {clicks ? (clicksIn.get(m.articleId) ?? 0).toLocaleString() : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </ConsoleTable>
            <p className="text-muted-foreground px-4 py-2 text-[11px]">
              Unique visitors are counted once per day (daily-unique). Last stop is the share of
              cluster visits that ended on that article.
            </p>
          </>
        )}
      </Panel>

      <SeriesPanel
        clusterId={clusterId}
        members={members}
        series={series}
        seriesEnabled={seriesEnabled}
        windowLabel={windowLabel}
      />

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel className="min-w-0 p-0">
          <PanelHeader title="Where readers went next" caption={JOURNEY_CAPTION} />
          {single ? (
            <div className="p-4">
              <EmptyState
                title="Add a second article to see movement"
                description="This shows how readers move from one cluster article to another."
              />
            </div>
          ) : journey === null ? (
            <PanelFailed />
          ) : journey.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No moves between these articles yet"
                description="Visits that read one cluster article and then another show up here."
              />
            </div>
          ) : (
            <FromToMatrix
              members={members}
              kind="moves"
              value={(from, to) => moveCell.get(`${from.slug}\n${to.slug}`) ?? 0}
            />
          )}
        </Panel>

        <Panel className="min-w-0 p-0">
          <PanelHeader title="Link clicks between cluster articles" caption={CLICKS_CAPTION} />
          {single ? (
            <div className="p-4">
              <EmptyState
                title="Add a second article to see link clicks"
                description="This counts clicks on in-article links from one cluster article to another."
              />
            </div>
          ) : clicks === null ? (
            <PanelFailed />
          ) : clicks.length === 0 ? (
            <div className="p-4">
              <EmptyState
                title="No link clicks between these articles yet"
                description="Link these articles to each other in their text, or check back as readers click."
              />
            </div>
          ) : (
            <FromToMatrix
              members={members}
              kind="clicks"
              value={(from, to) => clickCell.get(`${from.articleId}\n${to.articleId}`) ?? 0}
            />
          )}
        </Panel>
      </div>
    </div>
  );
}
