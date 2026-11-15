import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, PencilIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { safePanel } from '@/lib/admin/safe-panel';
import { runBatched } from '@/lib/admin/run-batched';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import {
  getClusterJourney,
  getClusterLinkClicks,
  getClusterOverview,
  getClusterSeriesBox,
  loadClusterAnalytics,
  type ClusterLinkClick,
  type ClusterOverview,
  type ClusterSeriesBox,
  type ClusterTransition,
} from '@/lib/analytics/cluster-analytics';
import { parseClusterWindow } from '@/lib/analytics/cluster-window';
import { ClusterDashboard } from './cluster-dashboard';

export const metadata: Metadata = {
  title: 'Cluster Analytics - Admin',
};

// Same budget as the other analytics pages: every read is safePanel-guarded at
// 6 s, so this is headroom over the broad vercel.json 30 s cap (route-segment
// config is the only thing that lifts it), not an expectation.
export const maxDuration = 60;

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ window?: string | string[] }>;
}

export default async function ClusterAnalyticsPage({ params, searchParams }: PageProps) {
  await requireAdminSection('inspire');

  const { id: clusterId } = await params;
  // ONE read of the cluster: the labels below and every getter use this same
  // member snapshot, so a membership change mid-render cannot mix the two.
  // Null for a malformed id (no query is sent) or a cluster that is gone.
  const cluster = await loadClusterAnalytics(clusterId);
  if (!cluster) notFound();
  const { members, membership } = cluster;

  // ?window=30|90|365; anything else is the 90-day default.
  const window = parseClusterWindow((await searchParams).window);

  // Each read in its own safePanel(…, null) inside runBatched(…, 3): a slow or
  // failed read is "This panel couldn't load", never a page error and never a
  // row of zeros. The overview and the journey share ONE cached statement. An
  // empty cluster runs nothing.
  let overview: ClusterOverview | null = null;
  let journey: ClusterTransition[] | null = [];
  let clicks: ClusterLinkClick[] | null = [];
  let series: ClusterSeriesBox | null = null;
  if (members.length > 0) {
    [overview, journey, clicks, series] = await runBatched(
      [
        () =>
          safePanel<ClusterOverview | null>(
            'cluster:overview',
            () => getClusterOverview(cluster.id, membership, window),
            null,
          ),
        () =>
          safePanel<ClusterTransition[] | null>(
            'cluster:journey',
            () => getClusterJourney(cluster.id, membership, window),
            null,
          ),
        () =>
          safePanel<ClusterLinkClick[] | null>(
            'cluster:clicks',
            () => getClusterLinkClicks(cluster.id, membership, window),
            null,
          ),
        () =>
          safePanel<ClusterSeriesBox | null>(
            'cluster:series',
            () => getClusterSeriesBox(cluster.id, membership, window),
            null,
          ),
      ] as const,
      3,
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        breadcrumb={
          <Link
            href="/admin/inspire/clusters"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px] font-semibold tracking-[0.14em] uppercase"
          >
            <ArrowLeftIcon className="size-3" />
            Clusters
          </Link>
        }
        title={<span className="break-words">{cluster.name}</span>}
        description="How readers use these articles together: how many visits read more than one, where they went next, which in-article links they clicked, and how the series box did."
        actions={
          <Button variant="quiet" size="sm" asChild>
            <Link href={`/admin/inspire/clusters/${cluster.id}`}>
              <PencilIcon className="mr-1 size-3.5" />
              Edit cluster
            </Link>
          </Button>
        }
      />

      <ClusterDashboard
        clusterId={cluster.id}
        members={members}
        window={window}
        overview={overview}
        journey={journey}
        clicks={clicks}
        series={series}
        seriesEnabled={cluster.seriesEnabled}
      />
    </div>
  );
}
