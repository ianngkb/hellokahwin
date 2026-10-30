import { LoadingRows } from '@/components/ui/empty-state';

/**
 * A cold render fans out ~16 aggregations over `analytics_events`, so it can
 * take a moment even when nothing is wrong. Shape mirrors the dashboard: header,
 * KPI strip, chart, then the two-column panel grid.
 */
export default function SiteAnalyticsLoading() {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-live="polite" aria-label="Loading">
      <div className="flex flex-col gap-2.5">
        <div className="bg-muted h-7 w-48 animate-pulse rounded-[8px]" />
        <div className="bg-muted h-4 w-80 animate-pulse rounded-[8px]" />
      </div>
      <div className="bg-muted rounded-card h-24 w-full animate-pulse" />
      <div className="bg-card rounded-card border-hairline border p-5">
        <div className="bg-muted mb-4 h-4 w-40 animate-pulse rounded-[8px]" />
        <div className="bg-muted h-56 w-full animate-pulse rounded-[8px]" />
      </div>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-card border-hairline border">
            <LoadingRows rows={5} />
          </div>
        ))}
      </div>
    </div>
  );
}
