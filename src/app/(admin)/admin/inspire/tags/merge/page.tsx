import { requireAdminSection } from '@/lib/auth/admin';
import { PageHeader } from '@/components/layout/page-header';
import { analyzeTagsForMergeAction } from '../actions';
import { MergeReview } from './merge-review';

export default async function MergeTagsPage() {
  await requireAdminSection('inspire');
  const { error, groups } = await analyzeTagsForMergeAction();

  if (error) {
    return (
      <div>
        <p className="text-error">Error: {error}</p>
      </div>
    );
  }

  const totalDuplicates = groups.reduce((sum, g) => sum + g.tags.length - 1, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tag Merge Tool"
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
        <p className="text-muted-foreground">No duplicate tags detected. All clean!</p>
      ) : (
        <MergeReview groups={groups} />
      )}
    </div>
  );
}
