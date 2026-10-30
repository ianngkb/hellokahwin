import { isCountryCode, parseRegion } from '@/lib/analytics/sql-filters';

/**
 * Drill-down links for the Locations panel. Pure, so they are unit-testable:
 * each keeps the current range / traffic / page params and only toggles the
 * geo params.
 */
function withParams(pathname: string, search: string, mutate: (p: URLSearchParams) => void) {
  const p = new URLSearchParams(search);
  mutate(p);
  const qs = p.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

/**
 * A country row's link. Selecting a country resets any state drill-down: a
 * region belongs to one country, so it must not survive switching to another.
 * Non-countries (`Unknown`, provider pseudo-codes) are not links.
 */
export function countryHref(pathname: string, search: string, name: string): string | undefined {
  if (!isCountryCode(name)) return undefined;
  return withParams(pathname, search, (p) => {
    p.set('country', name.toUpperCase());
    p.delete('region');
  });
}

export function clearCountryHref(pathname: string, search: string): string {
  return withParams(pathname, search, (p) => {
    p.delete('country');
    p.delete('region');
  });
}

/**
 * A state row's link. Only a code the page will accept becomes a link
 * (parseRegion also rejects the 'Unknown' bucket) — otherwise the row would
 * navigate to a region the page silently ignores.
 */
export function regionHref(pathname: string, search: string, name: string): string | undefined {
  const code = parseRegion(name);
  return code ? withParams(pathname, search, (p) => p.set('region', code)) : undefined;
}

export function clearRegionHref(pathname: string, search: string): string {
  return withParams(pathname, search, (p) => p.delete('region'));
}
