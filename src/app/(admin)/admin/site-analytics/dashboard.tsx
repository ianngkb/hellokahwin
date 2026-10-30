'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  type TooltipContentProps,
} from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { GlobeIcon, InfoIcon, SmartphoneIcon, TabletIcon, MonitorIcon, XIcon } from 'lucide-react';
import { isCountryCode } from '@/lib/analytics/sql-filters';
import { EmptyState } from '@/components/ui/empty-state';
import { ChangeBadge } from '@/components/admin/change-badge';
// `import type` only — erased at compile time, so this client component never
// pulls the server-only query module into the browser bundle.
import type { TopStats, ChartDataPoint, TableRow } from './queries';
import { countryHref, clearCountryHref, regionHref, clearRegionHref } from './drill-down';

// The chart's single series colour: the console's primary (midnight plum).
const CHART_ACCENT = 'var(--primary)';

// ─── Formatters ──────────────────────────────────────────────────────────────

function fmtNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
}

function fmtDuration(secs: number): string {
  if (!secs || isNaN(secs)) return '0s';
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

function fmtPercent(n: number): string {
  return `${n}%`;
}

function fmtDecimal(n: number): string {
  return n.toFixed(1);
}

// ─── Countries ───────────────────────────────────────────────────────────────

function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return '';
  return code
    .toUpperCase()
    .replace(/./g, (c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65));
}

let regionNames: Intl.DisplayNames | null | undefined;

/** ISO alpha-2 → English country name via `Intl.DisplayNames`; anything else raw. */
function formatCountryName(name: string): string {
  if (!isCountryCode(name)) return name;
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(name.toUpperCase()) ?? name;
  } catch {
    return name;
  }
}

// ─── Metric Definitions ───────────────────────────────────────────────────────

const METRIC_DEFINITIONS: Record<string, string> = {
  'Unique Visitors':
    'Distinct visitors, identified by a salted hash of IP + browser that rotates every KL day. Nothing identifying is stored.',
  'Total Visits': 'Browsing sessions. A session ends after 30 minutes of inactivity.',
  'Total Pageviews': 'Page loads, including repeat views of the same page.',
  'Views / Visit': 'Average number of pages viewed per session.',
  'Bounce Rate': 'Share of sessions that viewed a single page.',
  'Avg. Visit Duration':
    'Average session length, capped at 30 min. Single-pageview sessions are excluded.',
};

type MetricKey =
  | 'unique_visitors'
  | 'total_visits'
  | 'total_pageviews'
  | 'views_per_visit'
  | 'bounce_rate'
  | 'avg_visit_duration';

interface StatMeta {
  key: MetricKey;
  label: string;
  getValue: (s: TopStats) => number;
  format: (n: number) => string;
  higherIsBetter: boolean;
}

const STATS: StatMeta[] = [
  {
    key: 'unique_visitors',
    label: 'Unique Visitors',
    getValue: (s) => s.uniqueVisitors,
    format: fmtNumber,
    higherIsBetter: true,
  },
  {
    key: 'total_visits',
    label: 'Total Visits',
    getValue: (s) => s.totalVisits,
    format: fmtNumber,
    higherIsBetter: true,
  },
  {
    key: 'total_pageviews',
    label: 'Total Pageviews',
    getValue: (s) => s.totalPageviews,
    format: fmtNumber,
    higherIsBetter: true,
  },
  {
    key: 'views_per_visit',
    label: 'Views / Visit',
    getValue: (s) => s.viewsPerVisit,
    format: fmtDecimal,
    higherIsBetter: true,
  },
  {
    key: 'bounce_rate',
    label: 'Bounce Rate',
    getValue: (s) => s.bounceRate,
    format: fmtPercent,
    higherIsBetter: false,
  },
  {
    key: 'avg_visit_duration',
    label: 'Avg. Visit Duration',
    getValue: (s) => s.avgVisitDuration,
    format: fmtDuration,
    higherIsBetter: true,
  },
];

// ─── Panel frame ─────────────────────────────────────────────────────────────
// A thin bordered surface rather than `SectionCard`: these panels drive their
// own tabbed headers, which SectionCard's titled header row does not support.

function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-card border-hairline rounded-card overflow-hidden border ${className}`}>
      {children}
    </div>
  );
}

function ScreenSizeIcon({ name }: { name: string }) {
  const lc = name.toLowerCase();
  if (lc === 'mobile')
    return <SmartphoneIcon className="text-muted-foreground inline-block size-4 shrink-0" />;
  if (lc === 'tablet')
    return <TabletIcon className="text-muted-foreground inline-block size-4 shrink-0" />;
  if (lc === 'desktop')
    return <MonitorIcon className="text-muted-foreground inline-block size-4 shrink-0" />;
  return null;
}

// ─── Data Table ───────────────────────────────────────────────────────────────

type DataTableVariant = 'default' | 'countries' | 'sources' | 'pages' | 'screenSizes';

function DataTable({
  rows,
  variant = 'default',
  getRowHref,
  formatName,
  pageTitles,
}: {
  rows: TableRow[];
  variant?: DataTableVariant;
  /** When it returns a string for a row, that row becomes a drill-down link. */
  getRowHref?: (row: TableRow) => string | undefined;
  /** Maps the raw row name (e.g. a subdivision code) to a display label, while
   *  `row.name` stays the value used for the href and React key. */
  formatName?: (name: string) => string;
  /** Pathname → resolved title, for the `pages` variant. */
  pageTitles?: Record<string, string>;
}) {
  if (rows.length === 0) {
    return <EmptyState title="No data for this period" />;
  }

  const maxPct = Math.max(...rows.map((r) => r.pct), 1);
  const rowClass = 'group relative flex items-center px-4 py-2.5';

  return (
    <div className="divide-hairline divide-y">
      {rows.map((row) => {
        const href = getRowHref?.(row);
        const title = variant === 'pages' ? pageTitles?.[row.name] : undefined;
        const label = formatName
          ? formatName(row.name)
          : variant === 'countries'
            ? formatCountryName(row.name)
            : row.name;
        const inner = (
          <>
            {/* percentage background bar */}
            <div
              className="bg-muted absolute inset-y-0 left-0 transition-all"
              style={{ width: `${(row.pct / maxPct) * 100}%` }}
            />
            <span className="relative flex min-w-0 flex-1 items-center gap-2 pr-4 text-sm">
              {variant === 'countries' && countryFlag(row.name) && isCountryCode(row.name) ? (
                <span className="shrink-0 text-base leading-none">{countryFlag(row.name)}</span>
              ) : null}
              {variant === 'sources' && row.name === 'Direct / None' ? (
                <GlobeIcon className="text-muted-foreground inline-block size-4 shrink-0" />
              ) : null}
              {variant === 'screenSizes' && <ScreenSizeIcon name={row.name} />}
              {title ? (
                <span className="flex min-w-0 flex-col">
                  <span className="truncate">{title}</span>
                  <span className="text-muted-foreground truncate font-mono text-[11px]">
                    {row.name}
                  </span>
                </span>
              ) : (
                <span className="truncate" title={label}>
                  {label}
                </span>
              )}
            </span>
            <div className="relative flex shrink-0 items-center gap-3">
              <span className="text-muted-foreground font-mono text-xs tabular-nums">
                {fmtPercent(row.pct)}
              </span>
              <span className="w-12 text-right font-mono text-sm font-medium tabular-nums">
                {fmtNumber(row.visitors)}
              </span>
            </div>
          </>
        );

        return href ? (
          <Link
            key={row.name}
            href={href}
            prefetch={false}
            className={`${rowClass} hover:bg-muted/40 cursor-pointer transition-colors`}
          >
            {inner}
          </Link>
        ) : (
          <div key={row.name} className={rowClass}>
            {inner}
          </div>
        );
      })}
    </div>
  );
}

// ─── Tabbed section ───────────────────────────────────────────────────────────

function TabbedPanel({
  tabs,
  initialTab,
  render,
}: {
  tabs: string[];
  initialTab?: string;
  render: (tab: string) => React.ReactNode;
}) {
  const [active, setActive] = useState(initialTab ?? tabs[0]);
  return (
    <Panel>
      <div role="tablist" className="border-hairline flex border-b px-4 pt-3 pb-0">
        {tabs.map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            aria-selected={active === tab}
            onClick={() => setActive(tab)}
            className={`-mb-px border-b-2 px-3 py-2 text-xs font-medium transition-colors ${
              active === tab
                ? 'border-foreground text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>
      <div className="py-2">{render(active)}</div>
    </Panel>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────

function makeChartTooltip(activeStat: StatMeta) {
  return function ChartTooltipInner({
    active,
    payload,
    label,
  }: TooltipContentProps<ValueType, NameType>) {
    if (!active || !payload?.length) return null;
    return (
      <div className="bg-popover border-border rounded-lg border px-3 py-2 text-sm shadow-lg">
        <p className="text-muted-foreground mb-1 text-xs">{String(label ?? '')}</p>
        <p className="font-medium">
          {activeStat.format(Number(payload[0].value ?? 0))} {activeStat.label}
        </p>
      </div>
    );
  };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

interface DashboardProps {
  currentStats: TopStats;
  prevStats: TopStats;
  chartData: ChartDataPoint[];
  sources: TableRow[];
  utmSources: TableRow[];
  utmMediums: TableRow[];
  utmCampaigns: TableRow[];
  topPages: TableRow[];
  entryPages: TableRow[];
  exitPages: TableRow[];
  /** Pathname → title for every pathname in the three page panels. */
  pageTitles: Record<string, string>;
  countries: TableRow[];
  /** State rows for the drilled-down country. `name` is a subdivision code
   *  (e.g. `10`); its display name comes from `regionNames`. */
  states: TableRow[];
  /** Code → display name for the visible states + the selected region. */
  regionNames: Record<string, string>;
  cities: TableRow[];
  browsers: TableRow[];
  operatingSystems: TableRow[];
  screenSizes: TableRow[];
  /** ISO alpha-2 code when the dashboard is drilled down to one country. */
  selectedCountry?: string;
  /** Subdivision code when drilled one level further. Only set with a country. */
  selectedRegion?: string;
}

export function SiteAnalyticsDashboard({
  currentStats,
  prevStats,
  chartData,
  sources,
  utmSources,
  utmMediums,
  utmCampaigns,
  topPages,
  entryPages,
  exitPages,
  pageTitles,
  countries,
  states,
  regionNames: stateNames,
  cities,
  browsers,
  operatingSystems,
  screenSizes,
  selectedCountry,
  selectedRegion,
}: DashboardProps) {
  const [activeMetric, setActiveMetric] = useState<MetricKey>('unique_visitors');
  const activeStat = STATS.find((s) => s.key === activeMetric) ?? STATS[0];

  // Drill-down links keep the current range / traffic / page params and only
  // toggle the geo params (see ./drill-down.ts).
  const pathname = usePathname();
  const search = useSearchParams()?.toString() ?? '';
  const countryRowHref = (row: TableRow) => countryHref(pathname, search, row.name);
  const regionRowHref = (row: TableRow) => regionHref(pathname, search, row.name);
  const clearCountry = clearCountryHref(pathname, search);
  const clearRegion = clearRegionHref(pathname, search);
  const formatRegionName = (code: string) => stateNames[code] ?? code;

  // The Locations panel opens one level down from the current drill-down: a
  // country shows its States, a state shows its Cities. Keyed on the selection
  // so each drill resets the tab, while manual tab switches in between stick.
  const locationTab = selectedRegion ? 'Cities' : selectedCountry ? 'States' : 'Countries';

  return (
    <div className="flex flex-col gap-6">
      {selectedCountry && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground text-sm">Filtered to</span>
          <span className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
            <span className="text-base leading-none">{countryFlag(selectedCountry)}</span>
            {formatCountryName(selectedCountry)}
            <Link
              href={clearCountry}
              prefetch={false}
              aria-label="Clear country filter"
              className="hover:text-foreground -mr-1 ml-0.5 inline-flex"
            >
              <XIcon className="size-3.5" />
            </Link>
          </span>
          {selectedRegion && (
            <>
              <span className="text-muted-foreground text-sm">›</span>
              <span className="bg-muted text-foreground inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium">
                {formatRegionName(selectedRegion)}
                <Link
                  href={clearRegion}
                  prefetch={false}
                  aria-label="Clear state filter"
                  className="hover:text-foreground -mr-1 ml-0.5 inline-flex"
                >
                  <XIcon className="size-3.5" />
                </Link>
              </span>
            </>
          )}
        </div>
      )}

      {/* Top stats — the selected tile drives the chart. */}
      <Panel>
        <div className="divide-hairline grid grid-cols-2 divide-x divide-y sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          {STATS.map((stat) => {
            const current = stat.getValue(currentStats);
            const previous = stat.getValue(prevStats);
            const isActive = activeMetric === stat.key;
            const definition = METRIC_DEFINITIONS[stat.label];
            return (
              <button
                key={stat.key}
                type="button"
                onClick={() => setActiveMetric(stat.key)}
                aria-pressed={isActive}
                className={`relative flex flex-col items-start px-4 py-4 text-left transition-colors ${
                  isActive ? 'bg-muted' : 'hover:bg-muted/50'
                }`}
              >
                <span className="text-muted-foreground mb-1.5 flex items-center gap-1 text-xs font-medium">
                  {stat.label}
                  {definition && (
                    <span title={definition} className="inline-flex items-center">
                      <InfoIcon className="size-3 shrink-0 opacity-50" />
                    </span>
                  )}
                </span>
                <span className="text-foreground font-mono text-2xl font-semibold tracking-tight tabular-nums">
                  {stat.format(current)}
                </span>
                <div className="mt-1">
                  <ChangeBadge
                    current={current}
                    previous={previous}
                    higherIsBetter={stat.higherIsBetter}
                  />
                </div>
                {isActive && (
                  <div className="bg-foreground absolute right-0 bottom-0 left-0 h-0.5" />
                )}
              </button>
            );
          })}
        </div>
      </Panel>

      {/* Area chart */}
      <Panel>
        <div className="border-hairline flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">{activeStat.label} over time</p>
          <span className="text-muted-foreground text-xs">Per day, Kuala Lumpur time</span>
        </div>
        <div className="h-[220px] w-full px-2 py-4">
          {/* getChartData returns a zero point for every day in the range, so
              "empty" means no day had a visitor. */}
          {chartData.every((d) => d.unique_visitors === 0) ? (
            <div className="flex h-full items-center justify-center">
              <EmptyState title="No data for this period" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
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
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                  tickFormatter={(v) => fmtNumber(Number(v))}
                />
                <Tooltip
                  content={makeChartTooltip(activeStat)}
                  cursor={{ stroke: CHART_ACCENT, strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Area
                  type="monotone"
                  dataKey={activeStat.key}
                  stroke={CHART_ACCENT}
                  strokeWidth={2}
                  fill="url(#metricGradient)"
                  dot={chartData.length === 1}
                  activeDot={{ r: 4, fill: CHART_ACCENT, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TabbedPanel
          tabs={['Sources', 'UTM Source', 'UTM Medium', 'UTM Campaign']}
          render={(tab) =>
            tab === 'Sources' ? (
              <DataTable rows={sources} variant="sources" />
            ) : tab === 'UTM Source' ? (
              <DataTable rows={utmSources} />
            ) : tab === 'UTM Medium' ? (
              <DataTable rows={utmMediums} />
            ) : (
              <DataTable rows={utmCampaigns} />
            )
          }
        />
        <TabbedPanel
          tabs={['Top Pages', 'Entry Pages', 'Exit Pages']}
          render={(tab) => (
            <DataTable
              rows={tab === 'Top Pages' ? topPages : tab === 'Entry Pages' ? entryPages : exitPages}
              variant="pages"
              pageTitles={pageTitles}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TabbedPanel
          key={`${selectedCountry ?? ''}|${selectedRegion ?? ''}`}
          tabs={['Countries', 'States', 'Cities']}
          initialTab={locationTab}
          render={(tab) =>
            tab === 'Countries' ? (
              <DataTable rows={countries} variant="countries" getRowHref={countryRowHref} />
            ) : tab === 'States' ? (
              selectedCountry ? (
                <DataTable rows={states} getRowHref={regionRowHref} formatName={formatRegionName} />
              ) : (
                <EmptyState title="Pick a country to see its states" />
              )
            ) : (
              <DataTable rows={cities} />
            )
          }
        />
        <TabbedPanel
          tabs={['Browsers', 'OS', 'Screen Sizes']}
          render={(tab) =>
            tab === 'Browsers' ? (
              <DataTable rows={browsers} />
            ) : tab === 'OS' ? (
              <DataTable rows={operatingSystems} />
            ) : (
              <DataTable rows={screenSizes} variant="screenSizes" />
            )
          }
        />
      </div>
    </div>
  );
}
