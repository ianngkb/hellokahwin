import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangleIcon, LayersIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { getClusterOverview } from '@/lib/inspire/cluster-admin';
import { THIN_CLUSTER_LIVE_MIN } from '@/lib/inspire/clusters';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { ConsoleTable } from '@/components/ui/console-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Badge } from '@/components/ui/badge';
import { formatAdminDate, formatViews } from './format';

export const metadata: Metadata = {
  title: 'Clusters - Admin',
};

export default async function AdminInspireClustersPage() {
  await requireAdminSection('inspire');
  const { pillars, viewsAvailable } = await getClusterOverview();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'Clusters' },
            ]}
          />
        }
        title="Clusters"
        description="Every pillar and its clusters: how many articles are live, how they are doing, and which clusters need more."
      />

      {!viewsAvailable && (
        <p className="text-muted-foreground text-sm" role="status">
          Page views could not be loaded just now, so they show as “—”. Reload to try again.
        </p>
      )}

      {pillars.length === 0 ? (
        <SectionCard>
          <EmptyState
            icon={<LayersIcon />}
            title="No pillars yet"
            description="Pillars and clusters are set up by the pillar seed script. Once it has run, they appear here."
          />
        </SectionCard>
      ) : (
        pillars.map((pillar) => (
          <SectionCard
            key={pillar.id}
            title={
              <>
                {pillar.code && (
                  <span className="text-muted-foreground mr-2 font-mono text-xs">
                    {pillar.code}
                  </span>
                )}
                {pillar.name}
              </>
            }
            headerAction={
              <Link
                href={`/admin/inspire/clusters/${pillar.id}`}
                className="text-sm font-medium underline-offset-4 hover:underline"
              >
                Edit pillar and add clusters
              </Link>
            }
            bodyClassName="p-0"
          >
            {pillar.clusters.length === 0 ? (
              <p className="text-muted-foreground px-5 py-4 text-sm">
                No clusters under this pillar yet.
              </p>
            ) : (
              <ConsoleTable>
                <thead>
                  <tr>
                    <th>Cluster</th>
                    <th className="num">Live</th>
                    <th className="num">Draft</th>
                    <th className="num">Scheduled</th>
                    <th>Last published</th>
                    <th className="num">Views (28 days)</th>
                    <th>Series box</th>
                  </tr>
                </thead>
                <tbody>
                  {pillar.clusters.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <Link
                          href={`/admin/inspire/clusters/${c.id}`}
                          className="font-semibold underline-offset-4 hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="text-muted-foreground ml-2 font-mono text-xs">
                          {c.code}
                        </span>
                        {c.thin && (
                          <span className="text-warning-strong mt-0.5 flex items-center gap-1 text-xs">
                            <AlertTriangleIcon className="size-3.5" aria-hidden="true" />
                            Thin: fewer than {THIN_CLUSTER_LIVE_MIN} live articles
                          </span>
                        )}
                      </td>
                      <td className="num">{c.live}</td>
                      <td className="num">{c.draft}</td>
                      <td className="num">{c.scheduled}</td>
                      <td>{formatAdminDate(c.lastPublishedAt)}</td>
                      <td className="num">{formatViews(c.views)}</td>
                      <td>
                        <Badge variant={c.seriesEnabled ? 'default' : 'outline'}>
                          {c.seriesEnabled ? 'On' : 'Off'}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </ConsoleTable>
            )}

            {pillar.unclustered.length > 0 && (
              <div className="border-hairline bg-warning-subtle/40 border-t px-5 py-4">
                <p className="text-warning-strong flex items-center gap-1.5 text-sm font-semibold">
                  <AlertTriangleIcon className="size-4" aria-hidden="true" />
                  {pillar.unclustered.length === 1
                    ? '1 article in this pillar is not in any cluster'
                    : `${pillar.unclustered.length} articles in this pillar are not in any cluster`}
                </p>
                <ul className="mt-2 flex flex-col gap-1 text-sm">
                  {pillar.unclustered.map((a) => (
                    <li key={a.id}>
                      <Link
                        href={`/admin/inspire/${a.id}/edit`}
                        className="underline-offset-4 hover:underline"
                      >
                        {a.title}
                      </Link>
                      <span className="text-muted-foreground ml-2 text-xs capitalize">
                        {a.status}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </SectionCard>
        ))
      )}
    </div>
  );
}
