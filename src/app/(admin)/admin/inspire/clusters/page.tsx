import type { Metadata } from 'next';
import { requireAdminSection } from '@/lib/auth/admin';
import { PageHeader } from '@/components/layout/page-header';
import { getClusters } from '@/lib/inspire/clusters';
import { ClusterList } from './cluster-list';

export const metadata: Metadata = {
  title: 'Article Clusters - Admin',
};

// Every Inspire admin page declares its own function budget, like TWN's.
export const maxDuration = 60;

export default async function AdminInspireClustersPage() {
  await requireAdminSection('inspire');

  const clusters = await getClusters();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <PageHeader
        title="Clusters"
        description="Hand-picked groups of articles, in the order you choose. Switch one on to show it to readers as a series."
      />

      <ClusterList
        clusters={clusters.map((c) => ({
          id: c.id,
          name: c.name,
          memberCount: c.memberCount,
          seriesEnabled: c.seriesEnabled,
          createdAt: c.createdAt.toISOString(),
        }))}
      />
    </div>
  );
}
