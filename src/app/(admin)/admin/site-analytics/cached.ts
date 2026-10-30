import { unstable_cache } from 'next/cache';
import {
  getTopStats,
  getChartData,
  getSources,
  getUtmSources,
  getUtmMediums,
  getUtmCampaigns,
  getTopPages,
  getEntryPages,
  getExitPages,
  getCountries,
  getStates,
  getCities,
  getBrowsers,
  getOperatingSystems,
  getScreenSizes,
  getTrafficCounts,
} from './queries';

/**
 * Cached wrappers around the Site Analytics dashboard getters.
 *
 * With no rollup tables (and no scheduler to maintain any), every panel reads
 * `analytics_events` directly, so the cache is what keeps repeat views off the
 * database. `unstable_cache` folds the call arguments (range, traffic, page,
 * country, region) into the key, so each filter combination gets its own entry
 * and the default view (last 30 days · humans · no filter) serves warm for
 * everyone. The 10-minute TTL bounds how often a cold fan-out can run at all;
 * these figures don't need sub-10-minute freshness.
 */
const ANALYTICS_OPTS = { tags: ['site-analytics'], revalidate: 600 };

export const getCachedTopStats = unstable_cache(
  getTopStats,
  ['site-analytics:top-stats'],
  ANALYTICS_OPTS,
);
export const getCachedChartData = unstable_cache(
  getChartData,
  ['site-analytics:chart-data'],
  ANALYTICS_OPTS,
);
export const getCachedSources = unstable_cache(
  getSources,
  ['site-analytics:sources'],
  ANALYTICS_OPTS,
);
export const getCachedUtmSources = unstable_cache(
  getUtmSources,
  ['site-analytics:utm-sources'],
  ANALYTICS_OPTS,
);
export const getCachedUtmMediums = unstable_cache(
  getUtmMediums,
  ['site-analytics:utm-mediums'],
  ANALYTICS_OPTS,
);
export const getCachedUtmCampaigns = unstable_cache(
  getUtmCampaigns,
  ['site-analytics:utm-campaigns'],
  ANALYTICS_OPTS,
);
export const getCachedTopPages = unstable_cache(
  getTopPages,
  ['site-analytics:top-pages'],
  ANALYTICS_OPTS,
);
export const getCachedEntryPages = unstable_cache(
  getEntryPages,
  ['site-analytics:entry-pages'],
  ANALYTICS_OPTS,
);
export const getCachedExitPages = unstable_cache(
  getExitPages,
  ['site-analytics:exit-pages'],
  ANALYTICS_OPTS,
);
export const getCachedCountries = unstable_cache(
  getCountries,
  ['site-analytics:countries'],
  ANALYTICS_OPTS,
);
export const getCachedStates = unstable_cache(getStates, ['site-analytics:states'], ANALYTICS_OPTS);
export const getCachedCities = unstable_cache(getCities, ['site-analytics:cities'], ANALYTICS_OPTS);
export const getCachedBrowsers = unstable_cache(
  getBrowsers,
  ['site-analytics:browsers'],
  ANALYTICS_OPTS,
);
export const getCachedOperatingSystems = unstable_cache(
  getOperatingSystems,
  ['site-analytics:operating-systems'],
  ANALYTICS_OPTS,
);
export const getCachedScreenSizes = unstable_cache(
  getScreenSizes,
  ['site-analytics:screen-sizes'],
  ANALYTICS_OPTS,
);
export const getCachedTrafficCounts = unstable_cache(
  getTrafficCounts,
  ['site-analytics:traffic-counts'],
  ANALYTICS_OPTS,
);
