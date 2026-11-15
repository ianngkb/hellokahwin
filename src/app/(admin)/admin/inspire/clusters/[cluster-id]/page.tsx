import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeftIcon, BarChart3Icon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { PageHeader } from '@/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { getClusterWithMembers } from '@/lib/inspire/clusters';
import { getShownSeriesForArticles } from '@/lib/inspire/article-series';
import { articleDisplayStatus } from '../cluster-ui';
import { ClusterEditor } from './cluster-editor';

export const metadata: Metadata = {
  title: 'Edit Cluster - Admin',
};

export const maxDuration = 60;

interface PageProps {
  params: Promise<{ 'cluster-id': string }>;
}

export default async function AdminInspireClusterPage({ params }: PageProps) {
  await requireAdminSection('inspire');

  const { 'cluster-id': clusterId } = await params;
  // Null for a malformed id (no query is sent) or a cluster that is gone.
  const cluster = await getClusterWithMembers(clusterId);
  if (!cluster) notFound();

  // WHICH series a reader would meet on each member, from the one shared rule
  // — never inferred from "this cluster is switched on", because an article
  // that joined another switched-on cluster first shows that one instead. At
  // most 50 ids, one statement.
  const shownSeries = await getShownSeriesForArticles(cluster.members.map((m) => m.articleId));

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
        description="Pick the articles in this group and the order they are listed in."
        actions={
          <Button variant="quiet" size="sm" asChild>
            <Link href={`/admin/inspire/clusters/${cluster.id}/analytics`}>
              <BarChart3Icon className="mr-1 size-3.5" />
              View analytics
            </Link>
          </Button>
        }
      />

      {/* Not keyed: a remount would throw away staged picks that could not be
          added. The editor resets its own name field and optimistic list. */}
      <ClusterEditor
        cluster={{
          id: cluster.id,
          name: cluster.name,
          description: cluster.description,
          eyebrow: cluster.eyebrow,
          slug: cluster.slug,
          seriesEnabled: cluster.seriesEnabled,
          members: cluster.members.map((m) => {
            const shown = shownSeries.get(m.articleId) ?? null;
            const isThisCluster = shown !== null && shown.clusterId === cluster.id;
            return {
              articleId: m.articleId,
              title: m.title,
              status: articleDisplayStatus(m.status, m.scheduledPublishAt),
              // What a READER gets, not what the switch says.
              showsThisSeries: shown !== null && isThisCluster && shown.rendersBox,
              otherSeries:
                shown !== null && !isThisCluster
                  ? { name: shown.name, rendersBox: shown.rendersBox }
                  : null,
            };
          }),
        }}
      />
    </div>
  );
}
