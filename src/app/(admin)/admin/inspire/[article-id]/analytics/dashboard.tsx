'use client';

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/ui/empty-state';
import { ConsoleTable } from '@/components/ui/console-table';
import { CHART_ACCENT } from '@/lib/constants/chart-colors';
import { Panel, PanelFailed, StatTile } from '@/components/admin/analytics-panels';
import { SCROLL_TRACKING_SINCE } from '@/lib/analytics/scroll-tracking';
import { SECTION_TRACKING_SINCE } from '@/lib/analytics/section-tracking';
import type { SectionDropOff, SectionDropOffRow } from '@/lib/analytics/article-sections';
import type {
  ArticleDailyPoint,
  ArticleTotals,
  ArticleEventRow,
  ScrollDepthRow,
  ArticleDimensionRow,
} from '@/lib/analytics/article-views';

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-MY', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Human-friendly labels for the custom events the article pages emit, so the
 * breakdown reads in plain English. Unknown event names fall through to their
 * raw value rather than rendering blank.
 */
const EVENT_LABELS: Record<string, string> = {
  scroll_depth: 'Scroll milestone',
  section_reached: 'Reached a section',
  article_link_click: 'Clicked a link in the article',
  'Photo Gallery Opened': 'Opened the photo gallery',
  // The Series box (T5 / R20): the same two events the cluster page counts, in
  // the words this per-article report uses for everything else.
  'Series Box Viewed': 'Saw the series box',
  'Series Link Clicked': 'Clicked a series link',
};

function eventLabel(name: string): string {
  return EVENT_LABELS[name] ?? name;
}

/** A UTC instant as a KL calendar date, like `8 Nov 2026`. */
function fmtInstantKL(iso: string): string {
  return new Date(iso).toLocaleDateString('en-MY', {
    timeZone: 'Asia/Kuala_Lumpur',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** "Introduction", "1. <heading>", …, "End of article" — the article's own words (D7). */
function sectionLabel(row: SectionDropOffRow, total: number): string {
  if (row.index === 0) return 'Introduction';
  if (row.index > total) return 'End of article';
  return `${row.index}. ${row.heading || '(untitled section)'}`;
}

/**
 * Where readers stop: one row per section with a bar for the share of visitors
 * (who opened the article) that got at least this far, and how many stopped
 * there. `null` = the read failed; nothing recorded yet = an honest
 * "collecting since" empty state, never a row of zeros.
 */
function SectionsPanel({ sections }: { sections: SectionDropOff | null }) {
  const since = fmtInstantKL(SECTION_TRACKING_SINCE);
  const noData =
    sections !== null && sections.openedVisitors === 0 && sections.firstSeenAt === null;
  return (
    <Panel className="p-0">
      <div className="border-hairline border-b px-4 py-3">
        <p className="text-sm font-semibold">Where readers stop</p>
        <p className="text-muted-foreground text-xs">
          Visitors who reached each section of the article, and where they stopped. Bars show the
          share of visitors who opened the article that got at least this far. Collecting since{' '}
          {since}.
          {sections?.headingsChanged &&
            " The article's headings were edited after tracking began, so older visits may sit under a neighbouring section."}
          {sections?.firstSeenAt && ` First recorded visit: ${fmtInstantKL(sections.firstSeenAt)}.`}
        </p>
      </div>
      {sections === null ? (
        <PanelFailed />
      ) : noData ? (
        <div className="p-4">
          <EmptyState
            title="No section data yet"
            description={`We started collecting this on ${since} — check back as visits come in.`}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-2 p-4">
          <div className="text-muted-foreground grid grid-cols-[minmax(0,1fr)_minmax(96px,35%)_88px] gap-3 text-[11px] font-semibold tracking-wide uppercase">
            <span>Section</span>
            <span>Reached</span>
            <span className="text-right">Stopped here</span>
          </div>
          {sections.rows.map((row) => {
            const label = sectionLabel(row, sections.sectionTotal);
            const pct = Math.round(row.reachedShare * 100);
            return (
              <div
                key={row.index}
                className="grid grid-cols-[minmax(0,1fr)_minmax(96px,35%)_88px] items-center gap-3"
                data-section-row={row.index}
              >
                <span className="line-clamp-2 text-xs break-words" title={label}>
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  <div className="bg-muted relative h-4 flex-1 overflow-hidden rounded">
                    <div
                      className="h-full rounded"
                      style={{ width: `${Math.min(pct, 100)}%`, background: CHART_ACCENT }}
                    />
                  </div>
                  <span className="w-9 shrink-0 text-right text-xs tabular-nums">{pct}%</span>
                </div>
                <span className="text-right text-xs font-medium tabular-nums">
                  {row.stoppedHere.toLocaleString()}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Panel>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  const point = payload[0].payload as ArticleDailyPoint;
  return (
    <div className="bg-card border-hairline rounded-md border px-3 py-2 text-xs shadow-sm">
      <p className="mb-1 font-semibold">{fmtDate(label)}</p>
      <p className="text-muted-foreground tabular-nums">
        {point.views.toLocaleString()} views · {point.visitors.toLocaleString()} visitors
      </p>
    </div>
  );
}

export function ArticleAnalyticsDashboard({
  daily,
  totals,
  events,
  scroll,
  sources,
  devices,
  sections,
  publishedAt,
}: {
  daily: ArticleDailyPoint[];
  totals: ArticleTotals;
  /** `null` = the panel's read failed (timeout / transient error), NOT "no data". */
  events: ArticleEventRow[] | null;
  scroll: ScrollDepthRow[] | null;
  sources: ArticleDimensionRow[] | null;
  devices: ArticleDimensionRow[] | null;
  /** Section drop-off; `null` = couldn't load. */
  sections: SectionDropOff | null;
  publishedAt: string | null;
}) {
  // Average read depth, as a % of the page. The buckets are a funnel
  // (everyone at 100 is also counted at 25/50/75), so the visitors who STOPPED
  // in each band telescope to: avg% = 25·(r25 + r50 + r75 + r100) / r25, where
  // r25 is everyone who scrolled at all. A rough but honest "how far do people
  // get on average?" figure.
  const scrollRows = scroll ?? [];
  const reached25 = scrollRows.find((s) => s.percent === 25)?.visitors ?? 0;
  const scrollSum = scrollRows.reduce((sum, s) => sum + s.visitors, 0);
  const avgReadDepth = reached25 > 0 ? Math.round((25 * scrollSum) / reached25) : 0;
  const reachedEnd = scrollRows.find((s) => s.percent === 100)?.visitors ?? 0;

  const maxScroll = Math.max(1, ...scrollRows.map((s) => s.visitors));

  return (
    <div className="flex flex-col gap-6">
      {/* Headline numbers */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile label="Total views" value={totals.totalViews.toLocaleString()} />
        <StatTile label="Unique visitors" value={totals.uniqueVisitors.toLocaleString()} />
        {/* A failed read-depth panel shows "—", never a confident 0. */}
        <StatTile
          label="Reached the end"
          value={scroll === null ? '—' : reachedEnd.toLocaleString()}
        />
        <StatTile label="Avg. read depth" value={avgReadDepth > 0 ? `${avgReadDepth}%` : '—'} />
      </div>

      {publishedAt && (
        <p className="text-muted-foreground -mt-3 text-xs">
          Published {fmtDate(publishedAt.slice(0, 10))}. Traffic is shown from the earliest recorded
          visit to today (bot traffic excluded).
        </p>
      )}

      {/* Views over time */}
      <Panel className="p-0">
        <div className="border-hairline flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Views over time</p>
          <span className="text-muted-foreground flex items-center gap-1.5 text-xs">
            <span className="size-2 shrink-0 rounded-full" style={{ background: CHART_ACCENT }} />
            Daily views
          </span>
        </div>
        <div className="h-[260px] w-full px-2 py-4">
          {daily.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState
                title="No views recorded yet"
                description="This article has no analytics data in the pipeline yet."
              />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={daily} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="articleViewsGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CHART_ACCENT} stopOpacity={0.25} />
                    <stop offset="95%" stopColor={CHART_ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  interval="preserveStartEnd"
                  tickFormatter={(v) =>
                    new Date(`${v}T00:00:00Z`).toLocaleDateString('en-MY', {
                      day: 'numeric',
                      month: 'short',
                    })
                  }
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  allowDecimals={false}
                  tickFormatter={(v) => fmtNumber(Number(v))}
                />
                <Tooltip
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  content={ChartTooltip as any}
                  cursor={{ stroke: CHART_ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey="views"
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  fill="url(#articleViewsGradient)"
                  dot={false}
                  activeDot={{ r: 4, fill: CHART_ACCENT, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      {/* Read depth + Devices */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-0">
          <div className="border-hairline border-b px-4 py-3">
            <p className="text-sm font-semibold">How far people read</p>
            <p className="text-muted-foreground text-xs">
              Distinct visitors who scrolled past each point of the page. Read depth is recorded
              from {fmtDate(SCROLL_TRACKING_SINCE)}, so it covers fewer visits than the view counts
              above.
            </p>
          </div>
          <div className="flex flex-col gap-3 p-4">
            {scroll === null ? (
              <PanelFailed className="p-0" />
            ) : reached25 === 0 ? (
              <EmptyState
                title="No scroll data yet"
                description="Read-depth is captured as visitors scroll new article views."
              />
            ) : (
              scrollRows.map((s) => (
                <div key={s.percent} className="flex items-center gap-3">
                  <span className="text-muted-foreground w-10 shrink-0 text-right text-xs tabular-nums">
                    {s.percent}%
                  </span>
                  <div className="bg-muted relative h-4 flex-1 overflow-hidden rounded">
                    <div
                      className="h-full rounded"
                      style={{
                        width: `${Math.round((s.visitors / maxScroll) * 100)}%`,
                        background: CHART_ACCENT,
                      }}
                    />
                  </div>
                  <span className="w-12 shrink-0 text-right text-xs font-medium tabular-nums">
                    {s.visitors.toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel className="p-0">
          <div className="border-hairline border-b px-4 py-3">
            <p className="text-sm font-semibold">Devices</p>
            <p className="text-muted-foreground text-xs">Last 12 months.</p>
          </div>
          {devices === null ? (
            <PanelFailed />
          ) : devices.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No device data yet" />
            </div>
          ) : (
            <ConsoleTable>
              <thead>
                <tr>
                  <th>Device</th>
                  <th className="num">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {devices.map((d) => (
                  <tr key={d.name}>
                    <td>{d.name}</td>
                    <td className="num tabular-nums">{d.visitors.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </ConsoleTable>
          )}
        </Panel>
      </div>

      {/* Section-by-section drop-off, full width under "How far people read".
          The anchor is the comparison page's "Where readers stop in …" target. */}
      <div id="where-readers-stop" className="scroll-mt-20">
        <SectionsPanel sections={sections} />
      </div>

      {/* Sources + Event breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Panel className="p-0">
          <div className="border-hairline border-b px-4 py-3">
            <p className="text-sm font-semibold">Where readers came from</p>
            <p className="text-muted-foreground text-xs">Last 12 months.</p>
          </div>
          {sources === null ? (
            <PanelFailed />
          ) : sources.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No source data yet" />
            </div>
          ) : (
            <ConsoleTable>
              <thead>
                <tr>
                  <th>Source</th>
                  <th className="num">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {sources.map((s) => (
                  <tr key={s.name}>
                    <td className="max-w-[240px] truncate" title={s.name}>
                      {s.name}
                    </td>
                    <td className="num tabular-nums">{s.visitors.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </ConsoleTable>
          )}
        </Panel>

        <Panel className="p-0">
          <div className="border-hairline border-b px-4 py-3">
            <p className="text-sm font-semibold">What people did on the page</p>
            <p className="text-muted-foreground text-xs">
              Every tracked interaction on this article, scroll milestones included (last 12
              months).
            </p>
          </div>
          {events === null ? (
            <PanelFailed />
          ) : events.length === 0 ? (
            <div className="p-4">
              <EmptyState title="No interactions recorded yet" />
            </div>
          ) : (
            <ConsoleTable>
              <thead>
                <tr>
                  <th>Interaction</th>
                  <th className="num">Total</th>
                  <th className="num">Visitors</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.eventName}>
                    <td className="max-w-[240px] truncate" title={e.eventName}>
                      {eventLabel(e.eventName)}
                    </td>
                    <td className="num tabular-nums">{e.total.toLocaleString()}</td>
                    <td className="num tabular-nums">{e.visitors.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </ConsoleTable>
          )}
        </Panel>
      </div>
    </div>
  );
}
