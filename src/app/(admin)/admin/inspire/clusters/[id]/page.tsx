import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { AlertTriangleIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { getClusterOverview, type ClusterAdminArticle } from '@/lib/inspire/cluster-admin';
import { THIN_CLUSTER_LIVE_MIN } from '@/lib/inspire/clusters';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { PageHeader } from '@/components/layout/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { ConsoleTable } from '@/components/ui/console-table';
import { formatAdminDate, formatViews } from '../format';
import { ClusterSettingsForm, CreateClusterForm } from '../cluster-forms';

export const metadata: Metadata = {
  title: 'Cluster - Admin',
};

const STATUS_LABEL: Record<ClusterAdminArticle['status'], string> = {
  published: 'Live',
  draft: 'Draft',
  scheduled: 'Scheduled',
};

function ArticleTable({
  articles,
  viewsAvailable,
}: {
  articles: ClusterAdminArticle[];
  viewsAvailable: boolean;
}) {
  if (articles.length === 0) {
    return <p className="text-muted-foreground px-5 py-4 text-sm">No articles yet.</p>;
  }
  return (
    <ConsoleTable>
      <thead>
        <tr>
          <th>Article</th>
          <th>Status</th>
          <th>Publish date</th>
          <th className="num">Views (28 days)</th>
        </tr>
      </thead>
      <tbody>
        {articles.map((a) => (
          <tr key={a.id}>
            <td>
              <Link
                href={`/admin/inspire/${a.id}/edit`}
                className="font-semibold underline-offset-4 hover:underline"
              >
                {a.title}
              </Link>
            </td>
            <td>{STATUS_LABEL[a.status]}</td>
            <td>{formatAdminDate(a.publishedAt ?? a.scheduledPublishAt)}</td>
            <td className="num">
              {a.status === 'published' && viewsAvailable ? formatViews(a.views) : '—'}
            </td>
          </tr>
        ))}
      </tbody>
    </ConsoleTable>
  );
}

export default async function AdminInspireClusterDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdminSection('inspire');
  const { id } = await params;
  const { pillars, viewsAvailable } = await getClusterOverview();

  const pillar = pillars.find((p) => p.id === id);
  const parent = pillar ? undefined : pillars.find((p) => p.clusters.some((c) => c.id === id));
  const cluster = parent?.clusters.find((c) => c.id === id);
  if (!pillar && !cluster) notFound();

  const breadcrumb = (
    <ConsoleBreadcrumb
      items={[
        { label: 'Admin' },
        { label: 'Inspire', href: '/admin/inspire' },
        { label: 'Clusters', href: '/admin/inspire/clusters' },
        { label: (pillar ?? cluster)!.name },
      ]}
    />
  );

  if (pillar) {
    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          breadcrumb={breadcrumb}
          title={pillar.name}
          description={`Pillar ${pillar.code ?? ''} · ${pillar.clusters.length} clusters`}
        />
        <SectionCard title="Pillar settings">
          <ClusterSettingsForm
            kind="pillar"
            id={pillar.id}
            entityPhrase={pillar.entityPhrase}
            intro={pillar.intro}
            fallbackPhrase={pillar.name}
          />
        </SectionCard>
        <SectionCard title="Add a cluster under this pillar">
          <CreateClusterForm pillarId={pillar.id} />
        </SectionCard>
        <SectionCard
          title={`Not in any cluster (${pillar.unclustered.length})`}
          bodyClassName="p-0"
        >
          {pillar.unclustered.length > 0 && (
            <p className="text-warning-strong flex items-center gap-1.5 px-5 pt-4 text-sm">
              <AlertTriangleIcon className="size-4" aria-hidden="true" />
              Put each of these in a cluster from the article editor’s Cluster picker.
            </p>
          )}
          <ArticleTable articles={pillar.unclustered} viewsAvailable={viewsAvailable} />
        </SectionCard>
      </div>
    );
  }

  const c = cluster!;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={breadcrumb}
        title={c.name}
        description={`Cluster ${c.code} in ${parent!.name} · ${c.live} live, ${c.draft} draft, ${c.scheduled} scheduled · ${formatViews(c.views)} views in the last 28 days`}
      />
      {c.thin && (
        <p className="text-warning-strong bg-warning-subtle/40 rounded-card flex items-center gap-1.5 px-4 py-3 text-sm">
          <AlertTriangleIcon className="size-4" aria-hidden="true" />
          This cluster is thin: it has fewer than {THIN_CLUSTER_LIVE_MIN} live articles.
        </p>
      )}
      <SectionCard title="Articles" bodyClassName="p-0">
        <ArticleTable articles={c.articles} viewsAvailable={viewsAvailable} />
      </SectionCard>
      <SectionCard title="Cluster settings">
        <ClusterSettingsForm
          kind="cluster"
          id={c.id}
          entityPhrase={c.entityPhrase}
          seriesEnabled={c.seriesEnabled}
          seriesDescription={c.seriesDescription}
          fallbackPhrase={c.name}
        />
      </SectionCard>
    </div>
  );
}
