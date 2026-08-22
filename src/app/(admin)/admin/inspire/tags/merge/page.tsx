import { CheckCircle2Icon, TriangleAlertIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { ConsoleBreadcrumb } from '@/components/console/console-breadcrumb';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { analyzeTagsForMergeAction } from '../actions';
import { MergeReview } from './merge-review';

export default async function MergeTagsPage() {
  await requireAdminSection('inspire');
  const { error, groups } = await analyzeTagsForMergeAction();

  if (error) {
    return (
      <div className="bg-card rounded-card border-hairline border">
        <EmptyState
          icon={<TriangleAlertIcon className="text-error" />}
          title="Could not analyse tags"
          description={error}
        />
      </div>
    );
  }

  const totalDuplicates = groups.reduce((sum, g) => sum + g.tags.length - 1, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumb={
          <ConsoleBreadcrumb
            items={[
              { label: 'Admin' },
              { label: 'Inspire', href: '/admin/inspire' },
              { label: 'Tags', href: '/admin/inspire/tags' },
              { label: 'Merge' },
            ]}
          />
        }
        title="Merge tags"
        description={
          <>
            <span className="font-mono tabular-nums">{groups.length}</span> merge group
            {groups.length !== 1 ? 's' : ''} found
            {' \u2014 '}
            <span className="font-mono tabular-nums">{totalDuplicates}</span> duplicate tag
            {totalDuplicates !== 1 ? 's' : ''} can be merged
          </>
        }
      />

      {groups.length === 0 ? (
        <div className="bg-card rounded-card border-hairline border">
          <EmptyState
            icon={<CheckCircle2Icon />}
            title="No duplicate tags"
            description="Every tag is distinct — there is nothing to merge right now."
          />
        </div>
      ) : (
        <MergeReview groups={groups} />
      )}
    </div>
  );
}
