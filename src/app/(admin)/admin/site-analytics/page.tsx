import { Suspense } from 'react';
import type { Metadata } from 'next';
import { format } from 'date-fns';
import { requireAdminSection } from '@/lib/auth/admin';
import { getKLToday, resolveRange } from '@/lib/admin/date-range';
import { runBatched } from '@/lib/admin/run-batched';
import { safePanel } from '@/lib/admin/safe-panel';
import { PageHeader } from '@/components/layout/page-header';
import { DateRangePicker } from '@/components/admin/date-range-picker';
import { TrafficToggle } from '@/components/admin/traffic-toggle';
import { PageSearch } from '@/components/admin/page-search';
import {
  parseTrafficMode,
  parseCountry,
  parseRegion,
  parsePageParam,
} from '@/lib/analytics/sql-filters';
import { regionName } from '@/lib/analytics/region-name';
import { countryName } from '@/lib/analytics/country-name';
import { resolvePageTitle, resolvePageTitles } from '@/lib/analytics/resolve-page-titles';
import { getPreviousPeriod, type TopStats, type TrafficCounts } from './queries';
import {
  getCachedTopStats,
  getCachedChartData,
  getCachedSources,
  getCachedUtmSources,
  getCachedUtmMediums,
  getCachedUtmCampaigns,
  getCachedTopPages,
  getCachedEntryPages,
  getCachedExitPages,
  getCachedCountries,
  getCachedStates,
  getCachedCities,
  getCachedBrowsers,
  getCachedOperatingSystems,
  getCachedScreenSizes,
  getCachedTrafficCounts,
} from './cached';
import { SiteAnalyticsDashboard } from './dashboard';

export const metadata: Metadata = {
  title: 'Site analytics',
};

const DATE_FORMAT = 'yyyy-MM-dd';

// Max analytics queries in flight on a cold render. Kept below the
// per-instance DB pool width (5, src/lib/db/drizzle.ts) so a cache-miss
// fan-out never takes every connection.
const QUERY_CONCURRENCY = 4;

const EMPTY_STATS: TopStats = {
  uniqueVisitors: 0,
  totalVisits: 0,
  totalPageviews: 0,
  viewsPerVisit: 0,
  bounceRate: 0,
  avgVisitDuration: 0,
};
const EMPTY_TRAFFIC: TrafficCounts = { humans: 0, bots: 0, total: 0 };

interface PageProps {
  searchParams: Promise<{
    from?: string | string[];
    to?: string | string[];
    traffic?: string | string[];
    page?: string | string[];
    country?: string | string[];
    region?: string | string[];
  }>;
}

/** A repeated query key arrives as an array; only a single string counts. */
function single(value: string | string[] | undefined): string | undefined {
  return typeof value === 'string' && value ? value : undefined;
}

export default async function SiteAnalyticsPage({ searchParams }: PageProps) {
  await requireAdminSection('site_analytics');

  const params = await searchParams;
  const today = getKLToday();
  // Fallbacks, the today clamp and the MAX_RANGE_DAYS cap — the only bound on
  // how much of `analytics_events` one view scans.
  const range = resolveRange(params, today);
  const prevRange = getPreviousPeriod(range.from, range.to);
  const traffic = parseTrafficMode(single(params.traffic));
  // A pathname of at most 2000 chars, or no page filter at all.
  const page = parsePageParam(single(params.page));
  // Optional per-country drill-down, validated to a real ISO alpha-2 code. The
  // Countries panel itself stays global so it remains the navigator.
  const country = parseCountry(single(params.country));
  // Optional per-state drill-down, honoured only under a country.
  const region = country ? parseRegion(single(params.region)) : undefined;

  const [
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
    countries,
    states,
    cities,
    browsers,
    operatingSystems,
    screenSizes,
    trafficCounts,
  ] = await runBatched(
    [
      () =>
        safePanel(
          'topStats',
          () => getCachedTopStats(range, traffic, page, country, region),
          EMPTY_STATS,
        ),
      () =>
        safePanel(
          'prevStats',
          () => getCachedTopStats(prevRange, traffic, page, country, region),
          EMPTY_STATS,
        ),
      () =>
        safePanel('chartData', () => getCachedChartData(range, traffic, page, country, region), []),
      () => safePanel('sources', () => getCachedSources(range, traffic, page, country, region), []),
      () =>
        safePanel(
          'utmSources',
          () => getCachedUtmSources(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel(
          'utmMediums',
          () => getCachedUtmMediums(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel(
          'utmCampaigns',
          () => getCachedUtmCampaigns(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel('topPages', () => getCachedTopPages(range, traffic, page, country, region), []),
      () =>
        safePanel(
          'entryPages',
          () => getCachedEntryPages(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel('exitPages', () => getCachedExitPages(range, traffic, page, country, region), []),
      // Navigators: Countries stays global and States stays country-scoped, so
      // the rows you click to move around are never hidden by the current scope.
      () => safePanel('countries', () => getCachedCountries(range, traffic, page), []),
      // With no country there is nothing to show (and a cross-country GROUP BY
      // region is meaningless — codes collide), so skip the query entirely.
      () =>
        safePanel(
          'states',
          () => (country ? getCachedStates(range, traffic, page, country) : Promise.resolve([])),
          [],
        ),
      () => safePanel('cities', () => getCachedCities(range, traffic, page, country, region), []),
      () =>
        safePanel('browsers', () => getCachedBrowsers(range, traffic, page, country, region), []),
      () =>
        safePanel(
          'operatingSystems',
          () => getCachedOperatingSystems(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel(
          'screenSizes',
          () => getCachedScreenSizes(range, traffic, page, country, region),
          [],
        ),
      () =>
        safePanel(
          'trafficCounts',
          () => getCachedTrafficCounts(range, page, country, region),
          EMPTY_TRAFFIC,
        ),
    ] as const,
    QUERY_CONCURRENCY,
  );

  // Article titles for the page panels and the active page filter. One batched
  // lookup per content type; a failure leaves raw pathnames, never an error.
  const pathnames = [...new Set([...topPages, ...entryPages, ...exitPages].map((r) => r.name))];
  const [titleMap, activePageTitle] = await Promise.all([
    safePanel('pageTitles', () => resolvePageTitles(pathnames), new Map<string, string>()),
    page ? safePanel('activePageTitle', () => resolvePageTitle(page), null) : null,
  ]);
  const pageTitles = Object.fromEntries(titleMap);

  // State codes → names on the server; the dashboard gets a small map.
  const regionNames: Record<string, string> = {};
  if (country) {
    for (const row of states) regionNames[row.name] = regionName(country, row.name);
    if (region) regionNames[region] = regionName(country, region);
  }

  // Country names too, on the server: `Intl.DisplayNames` output can differ
  // between the server's and the browser's ICU data, which would be a
  // hydration mismatch if the client resolved them.
  const countryNames: Record<string, string> = {};
  for (const row of countries) countryNames[row.name] = countryName(row.name);
  if (country) countryNames[country] = countryName(country);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        className="mb-0"
        breadcrumb={
          <span className="text-muted-foreground text-[11px] font-semibold tracking-[0.14em] uppercase">
            Analytics · Site
          </span>
        }
        title="Site analytics"
        description="Visitors, sources, pages and devices across hellokahwin.com. Days are Kuala Lumpur days; bots are excluded unless you switch the traffic toggle."
        actions={
          <>
            <Suspense>
              <PageSearch
                activePage={page}
                activePageTitle={activePageTitle}
                from={range.from}
                to={range.to}
                traffic={traffic}
              />
            </Suspense>
            <Suspense>
              <TrafficToggle active={traffic} counts={trafficCounts} />
            </Suspense>
            <Suspense>
              <DateRangePicker from={range.from} to={range.to} today={format(today, DATE_FORMAT)} />
            </Suspense>
          </>
        }
      />

      <SiteAnalyticsDashboard
        currentStats={currentStats}
        prevStats={prevStats}
        chartData={chartData}
        sources={sources}
        utmSources={utmSources}
        utmMediums={utmMediums}
        utmCampaigns={utmCampaigns}
        topPages={topPages}
        entryPages={entryPages}
        exitPages={exitPages}
        pageTitles={pageTitles}
        countries={countries}
        states={states}
        regionNames={regionNames}
        countryNames={countryNames}
        cities={cities}
        browsers={browsers}
        operatingSystems={operatingSystems}
        screenSizes={screenSizes}
        selectedCountry={country}
        selectedRegion={region}
      />
    </div>
  );
}
