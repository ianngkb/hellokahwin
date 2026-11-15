'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { EmptyState } from '@/components/ui/empty-state';
import { ConsoleTable } from '@/components/ui/console-table';
import { Panel, PanelFailed } from '@/components/admin/analytics-panels';
import { ArticleStatusChip } from '@/components/admin/article-status-chip';
import { CATEGORICAL_SERIES_COLORS } from '@/lib/constants/chart-colors';
import { SCROLL_TRACKING_SINCE } from '@/lib/analytics/scroll-tracking';
import { OTHER_SOURCES_NAME, SOURCES_PER_ARTICLE } from '@/lib/analytics/compare-limits';
// House date format, read in Asia/Kuala_Lumpur — never slice an ISO instant to
// its UTC day (an article published 00:30 KL would show the day before).
import { formatDate } from '@/lib/utils/format-date';
import type {
  ArticleCompareTotals,
  DropOffBand,
  DropOffBandValue,
} from '@/lib/analytics/article-compare';
import type { ArticleDimensionRow, ScrollDepthRow } from '@/lib/analytics/article-views';

/** One picked article, in selection (= column and colour) order. */
export interface CompareArticle {
  id: string;
  slug: string;
  title: string;
  status: string;
  /** ISO instant, or null when never published. */
  publishedAt: string | null;
}

/**
 * The comparison read, keyed by slug, in a shape that crosses the server →
 * client boundary. A field is `null` when that metric's read FAILED (timeout or
 * transient error) — rendered "This panel couldn't load", never as no data.
 */
export interface ComparePanelsData {
  totals: Record<string, ArticleCompareTotals> | null;
  scroll: Record<string, ScrollDepthRow[]> | null;
  dropOff: Record<string, DropOffBand[]> | null;
  sources: Record<string, ArticleDimensionRow[]> | null;
  devices: Record<string, ArticleDimensionRow[]> | null;
}

/** The R12 drop-off caption (sections differ per article; the full report has them). */
export const DROP_OFF_CAPTION =
  "Sections differ from article to article, so this view compares the four page milestones. Open an article's full report for its section-by-section drop-off.";

/** Plain-language milestone labels, technical number as the hint (D4). */
const SCROLL_LABELS: Record<number, string> = {
  25: 'A quarter of the page (25%)',
  50: 'Halfway (50%)',
  75: 'Three-quarters (75%)',
  100: 'Bottom of the page (100%)',
};

const DROP_OFF_LABELS: Record<DropOffBandValue, { label: string; hint?: string }> = {
  0: { label: 'Left before scrolling' },
  25: { label: 'Stopped after a quarter (25%)' },
  50: { label: 'Stopped around halfway (50%)' },
  75: { label: 'Stopped at three-quarters (75%)' },
  100: { label: 'Reached the bottom of the page', hint: 'Includes the footer (100%)' },
};

function fmtPct(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%';
  const pct = share * 100;
  return pct < 1 ? '<1%' : `${Math.round(pct)}%`;
}

/** Average read depth (% of the page), the per-article page's telescoping formula. */
export function avgReadDepth(scroll: readonly ScrollDepthRow[]): number | null {
  const reached25 = scroll.find((s) => s.percent === 25)?.visitors ?? 0;
  if (reached25 <= 0) return null;
  const sum = scroll.reduce((acc, s) => acc + s.visitors, 0);
  return Math.round((25 * sum) / reached25);
}

/**
 * Console dark mode is `[data-theme="dark"]` on an ancestor (not a media
 * query), and the series colours are re-stepped per mode, so read it off the
 * DOM and watch for the toggle — same approach as the lead trend chart.
 */
function useConsoleDark(ref: React.RefObject<HTMLElement | null>): boolean {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const themed = ref.current?.closest('[data-theme]');
    const read = () => setDark(themed?.getAttribute('data-theme') === 'dark');
    read();
    if (!themed || typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(read);
    observer.observe(themed, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, [ref]);
  return dark;
}

/** Article i's colour — the same in every panel (colour follows the article). */
function articleColor(i: number, dark: boolean): string {
  const pair = CATEGORICAL_SERIES_COLORS[i % CATEGORICAL_SERIES_COLORS.length];
  return dark ? pair.dark : pair.light;
}

function reportHref(id: string): string {
  return `/admin/inspire/${id}/analytics`;
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2.5 shrink-0 rounded-full"
      style={{ background: color }}
    />
  );
}

/** Title linking to the article's full report: truncated, full title on hover. */
function ArticleLink({ article, color }: { article: CompareArticle; color: string }) {
  return (
    <Link
      href={reportHref(article.id)}
      prefetch={false}
      title={article.title}
      className="hover:text-primary flex max-w-full min-w-0 items-center gap-1.5 font-semibold"
      data-article-link={article.id}
    >
      <Dot color={color} />
      <span className="min-w-0 truncate">{article.title}</span>
    </Link>
  );
}

function PanelHeader({ title, caption }: { title: string; caption?: React.ReactNode }) {
  return (
    <div className="border-hairline border-b px-4 py-3">
      <p className="text-sm font-semibold">{title}</p>
      {caption && <p className="text-muted-foreground text-xs">{caption}</p>}
    </div>
  );
}

/** A count with an optional share and a thin bar in the article's colour. */
function BarCell({ value, share, color }: { value: number; share: number; color: string }) {
  const width = Math.max(0, Math.min(100, Math.round(share * 100)));
  return (
    <div className="flex flex-col items-end gap-1">
      <span className="tabular-nums">
        {value.toLocaleString()}{' '}
        <span className="text-muted-foreground text-[11px]">· {fmtPct(share)}</span>
      </span>
      <span className="bg-muted block h-1.5 w-full max-w-[120px] overflow-hidden rounded">
        <span className="block h-full rounded" style={{ width: `${width}%`, background: color }} />
      </span>
    </div>
  );
}

// Fixed-width header so a long title truncates (title= has it in full) instead
// of spilling over its neighbours — `.console-table th.num` is `nowrap`.
const ARTICLE_COL = 'w-[176px] min-w-[176px] max-w-[176px] text-right';

/**
 * One metric with the articles as columns. `rows` are the metric's own rows
 * (milestones, bands, sources, devices); `cell` renders one article's value
 * for one row, or null for "no data for this article" (shown as —). A column
 * whose article has no data at all for this metric says so in its header.
 */
function MetricTable<R>({
  articles,
  colors,
  rowHeading,
  rows,
  rowKey,
  rowLabel,
  cell,
  hasData,
}: {
  articles: CompareArticle[];
  colors: string[];
  rowHeading: string;
  rows: R[];
  rowKey: (row: R) => string;
  rowLabel: (row: R) => React.ReactNode;
  cell: (row: R, article: CompareArticle, color: string) => React.ReactNode | null;
  hasData: (article: CompareArticle) => boolean;
}) {
  return (
    <ConsoleTable>
      <thead>
        <tr>
          <th className="min-w-[150px]">{rowHeading}</th>
          {articles.map((a, i) => (
            <th key={a.id} className={ARTICLE_COL} data-compare-column={a.id}>
              <div className="flex w-full min-w-0 flex-col items-end gap-0.5 font-sans tracking-normal normal-case">
                <ArticleLink article={a} color={colors[i]} />
                {!hasData(a) && (
                  <span className="text-muted-foreground text-[11px] font-normal">No data yet</span>
                )}
              </div>
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={rowKey(row)}>
            <td className="max-w-[220px]">{rowLabel(row)}</td>
            {articles.map((a, i) => (
              <td key={a.id} className="num">
                {hasData(a) ? (
                  (cell(row, a, colors[i]) ?? <span className="text-muted-foreground">—</span>)
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </ConsoleTable>
  );
}

function SummaryPanel({
  articles,
  colors,
  totals,
  scroll,
}: {
  articles: CompareArticle[];
  colors: string[];
  totals: ComparePanelsData['totals'];
  scroll: ComparePanelsData['scroll'];
}) {
  return (
    <Panel className="min-w-0 p-0">
      <PanelHeader
        title="At a glance"
        caption="Last 12 months, bot traffic excluded. Click an article for its full report, including where readers stop section by section."
      />
      {(totals === null || scroll === null) && (
        <p
          className="text-muted-foreground border-hairline border-b px-4 py-2 text-xs"
          role="status"
        >
          {totals === null && "Views and visitors couldn't load. "}
          {scroll === null && "Read depth couldn't load. "}
          Refresh the page to try again.
        </p>
      )}
      <ConsoleTable>
        <thead>
          <tr>
            <th className="min-w-[200px]">Article</th>
            <th>Status</th>
            <th>Published</th>
            <th className="num">Views</th>
            <th className="num" title="A visitor is counted once per day">
              Unique visitors
            </th>
            <th className="num">Reached the end</th>
            <th className="num">Avg. read depth</th>
          </tr>
        </thead>
        <tbody>
          {articles.map((a, i) => {
            const t = totals?.[a.slug];
            const s = scroll?.[a.slug];
            const depth = s ? avgReadDepth(s) : null;
            const reachedEnd = s?.find((r) => r.percent === 100)?.visitors ?? 0;
            return (
              <tr key={a.id} data-summary-row={a.id}>
                <td className="max-w-[280px]">
                  <ArticleLink article={a} color={colors[i]} />
                </td>
                <td>
                  <ArticleStatusChip status={a.status} />
                </td>
                <td className="whitespace-nowrap">
                  {a.publishedAt ? formatDate(a.publishedAt) : 'Not published'}
                </td>
                <td className="num tabular-nums">{t ? t.views.toLocaleString() : '—'}</td>
                <td className="num tabular-nums">{t ? t.uniqueVisitors.toLocaleString() : '—'}</td>
                <td className="num tabular-nums">{s ? reachedEnd.toLocaleString() : '—'}</td>
                <td className="num tabular-nums">{depth !== null ? `${depth}%` : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </ConsoleTable>
      <p className="text-muted-foreground px-4 py-2 text-[11px]">
        Unique visitors are counted once per day (daily-unique). Read depth is recorded from{' '}
        {formatDate(SCROLL_TRACKING_SINCE)}.
      </p>
    </Panel>
  );
}

/** Union of row names across articles, biggest total first; `last` (if present) at the end. */
function unionRows(
  map: Record<string, ArticleDimensionRow[]>,
  articles: CompareArticle[],
  last?: string,
) {
  const totals = new Map<string, number>();
  for (const a of articles) {
    for (const r of map[a.slug] ?? []) totals.set(r.name, (totals.get(r.name) ?? 0) + r.visitors);
  }
  return [...totals.entries()]
    .sort(
      (x, y) =>
        Number(x[0] === last) - Number(y[0] === last) || y[1] - x[1] || x[0].localeCompare(y[0]),
    )
    .map(([name]) => name);
}

/**
 * An article's share of one row. The denominator is the sum of ALL that
 * article's rows — for sources that includes the OTHER_SOURCES_NAME row the
 * getter adds past the top eight, so it is the true total, not the eight shown.
 */
export function dimensionShare(rows: readonly ArticleDimensionRow[], name: string): number {
  const total = rows.reduce((acc, r) => acc + r.visitors, 0);
  const v = rows.find((r) => r.name === name)?.visitors ?? 0;
  return total > 0 ? v / total : 0;
}

function DimensionPanel({
  title,
  caption,
  rowHeading,
  emptyTitle,
  data,
  articles,
  colors,
  missingMeans,
  absentIsZero = false,
  lastRow,
}: {
  title: string;
  caption: string;
  rowHeading: string;
  emptyTitle: string;
  data: Record<string, ArticleDimensionRow[]> | null;
  articles: CompareArticle[];
  colors: string[];
  /** What a — means for a row an article does not have. */
  missingMeans?: string;
  /**
   * The dimension is exhaustive (devices: every visitor is in exactly one
   * bucket), so a bucket an article lacks is a real zero — shown as 0, not —.
   */
  absentIsZero?: boolean;
  /** A row name always sorted last (sources: the "Other sources" sum). */
  lastRow?: string;
}) {
  const names = data ? unionRows(data, articles, lastRow) : [];
  return (
    <Panel className="min-w-0 p-0">
      <PanelHeader title={title} caption={caption} />
      {data === null ? (
        <PanelFailed />
      ) : names.length === 0 ? (
        <div className="p-4">
          <EmptyState title={emptyTitle} />
        </div>
      ) : (
        <>
          <MetricTable
            articles={articles}
            colors={colors}
            rowHeading={rowHeading}
            rows={names}
            rowKey={(n) => n}
            rowLabel={(n) => (
              <span className="block truncate" title={n}>
                {n}
              </span>
            )}
            hasData={(a) => (data[a.slug] ?? []).length > 0}
            cell={(n, a, color) => {
              const rows = data[a.slug] ?? [];
              const row = rows.find((r) => r.name === n);
              if (!row && !absentIsZero) return null;
              return (
                <BarCell value={row?.visitors ?? 0} share={dimensionShare(rows, n)} color={color} />
              );
            }}
          />
          {missingMeans && (
            <p className="text-muted-foreground px-4 py-2 text-[11px]">{missingMeans}</p>
          )}
        </>
      )}
    </Panel>
  );
}

/**
 * Side-by-side analytics for the picked articles: a summary table, then one
 * panel per metric with the articles as columns, each article in the same
 * colour everywhere. Each panel is independently "couldn't load" (`null`) or
 * empty, so one failed metric never blanks the page.
 */
export function CompareDashboard({
  articles,
  panels,
}: {
  articles: CompareArticle[];
  panels: ComparePanelsData;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const dark = useConsoleDark(rootRef);
  const colors = articles.map((_, i) => articleColor(i, dark));
  const { scroll, dropOff } = panels;

  const scrollHasData = (a: CompareArticle) =>
    (scroll?.[a.slug]?.find((s) => s.percent === 25)?.visitors ?? 0) > 0;
  const dropOffHasData = (a: CompareArticle) =>
    (dropOff?.[a.slug] ?? []).some((b) => b.visitors > 0);

  return (
    <div ref={rootRef} className="flex min-w-0 flex-col gap-6">
      <SummaryPanel articles={articles} colors={colors} totals={panels.totals} scroll={scroll} />

      <Panel className="min-w-0 p-0">
        <PanelHeader
          title="How far people read"
          caption={`Distinct visitors who scrolled past each point of the page, and their share of everyone who scrolled. Recorded from ${formatDate(SCROLL_TRACKING_SINCE)}.`}
        />
        {scroll === null ? (
          <PanelFailed />
        ) : !articles.some(scrollHasData) ? (
          <div className="p-4">
            <EmptyState
              title="No scroll data yet"
              description="Read-depth is captured as visitors scroll new article views."
            />
          </div>
        ) : (
          <MetricTable
            articles={articles}
            colors={colors}
            rowHeading="Scrolled past"
            rows={[25, 50, 75, 100]}
            rowKey={(p) => String(p)}
            rowLabel={(p) => SCROLL_LABELS[p]}
            hasData={scrollHasData}
            cell={(p, a, color) => {
              const rows = scroll[a.slug] ?? [];
              const base = rows.find((s) => s.percent === 25)?.visitors ?? 0;
              const v = rows.find((s) => s.percent === p)?.visitors ?? 0;
              return <BarCell value={v} share={base > 0 ? v / base : 0} color={color} />;
            }}
          />
        )}
      </Panel>

      <Panel className="min-w-0 p-0">
        <PanelHeader title="Where readers stopped scrolling" caption={DROP_OFF_CAPTION} />
        {dropOff === null ? (
          <PanelFailed />
        ) : !articles.some(dropOffHasData) ? (
          <div className="p-4">
            <EmptyState
              title="No drop-off data yet"
              description="This fills in as visitors open and scroll these articles."
            />
          </div>
        ) : (
          <MetricTable
            articles={articles}
            colors={colors}
            rowHeading="Furthest point reached"
            rows={[0, 25, 50, 75, 100] as DropOffBandValue[]}
            rowKey={(b) => String(b)}
            rowLabel={(b) => (
              <span className="flex flex-col">
                <span>{DROP_OFF_LABELS[b].label}</span>
                {DROP_OFF_LABELS[b].hint && (
                  <span className="text-muted-foreground text-[11px]">
                    {DROP_OFF_LABELS[b].hint}
                  </span>
                )}
              </span>
            )}
            hasData={dropOffHasData}
            cell={(b, a, color) => {
              const band = (dropOff[a.slug] ?? []).find((x) => x.band === b);
              return band ? (
                <BarCell value={band.visitors} share={band.share} color={color} />
              ) : null;
            }}
          />
        )}
        <div className="border-hairline flex flex-col gap-1 border-t px-4 py-3 text-xs">
          <p className="text-muted-foreground text-xs">
            Section-by-section drop-off for each article:
          </p>
          <ul className="flex flex-col gap-1">
            {articles.map((a, i) => (
              <li key={a.id} className="min-w-0">
                <Link
                  href={`${reportHref(a.id)}#where-readers-stop`}
                  prefetch={false}
                  title={a.title}
                  className="hover:text-primary flex min-w-0 items-center gap-1.5 text-xs underline-offset-2 hover:underline"
                  data-sections-link={a.id}
                >
                  <Dot color={colors[i]} />
                  <span className="truncate">Where readers stop in {a.title}</span>
                  <span aria-hidden>→</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Panel>

      <div className="grid min-w-0 grid-cols-1 gap-6 xl:grid-cols-2">
        <DimensionPanel
          title="Where readers came from"
          caption={`Top ${SOURCES_PER_ARTICLE} sources per article by distinct visitors (last 12 months); the rest are grouped as ${OTHER_SOURCES_NAME}. Shares are of all the article's source visitors.`}
          rowHeading="Source"
          emptyTitle="No source data yet"
          data={panels.sources}
          articles={articles}
          colors={colors}
          missingMeans={`— means the source is not in that article's top ${SOURCES_PER_ARTICLE} (it is counted in ${OTHER_SOURCES_NAME}).`}
          lastRow={OTHER_SOURCES_NAME}
        />
        <DimensionPanel
          title="Devices"
          caption="Distinct visitors by screen size (last 12 months)."
          rowHeading="Device"
          emptyTitle="No device data yet"
          data={panels.devices}
          articles={articles}
          colors={colors}
          absentIsZero
        />
      </div>
    </div>
  );
}
