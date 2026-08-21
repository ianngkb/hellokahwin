import type { Metadata } from 'next';
import { unstable_cache } from 'next/cache';
import Link from 'next/link';
import { eq, sql, asc } from 'drizzle-orm';
import { ArrowLeftIcon, PlusIcon, PencilIcon } from 'lucide-react';
import { requireAdminSection } from '@/lib/auth/admin';
import { db } from '@/lib/db/drizzle';
import { dynamicBlocks, dynamicBlockRules } from '@/lib/db/schema/dynamic-blocks';
import { articles, inspireCategories, inspireTags } from '@/lib/db/schema/articles';
import { collectEmbeddedBlockIds } from '@/lib/inspire/dynamic-blocks';
import { Button } from '@/components/ui/button';
import { Chip } from '@/components/ui/chip';
import { ConsoleTable } from '@/components/ui/console-table';
import { EmptyState } from '@/components/ui/empty-state';
import { PageHeader } from '@/components/layout/page-header';
import { StatusChip } from '@/lib/ui/status-chip';

export const metadata: Metadata = {
  title: 'Dynamic Blocks - Admin',
};

// Manual-embed usage counts. The `content::text LIKE` prefilter scans every
// article's multi-MB jsonb — too heavy to run per render (this exact pattern
// has 500'd admin pages against the 8s role statement_timeout), so it's cached
// and invalidated with article saves. Null = lookup unavailable; the column
// degrades to "—" instead of failing the page.
const getEmbedCounts = unstable_cache(
  async (): Promise<Record<string, number> | null> => {
    try {
      const rows = await db
        .select({ id: articles.id, content: articles.content })
        .from(articles)
        .where(sql`${articles.content}::text LIKE '%dynamicBlockEmbed%'`);
      const counts: Record<string, number> = {};
      for (const row of rows) {
        for (const blockId of collectEmbeddedBlockIds(row.content)) {
          counts[blockId] = (counts[blockId] ?? 0) + 1;
        }
      }
      return counts;
    } catch (err) {
      console.error('[dynamic-blocks] embed usage count failed:', err);
      return null;
    }
  },
  ['dynamic-blocks-embed-counts'],
  { tags: ['articles'], revalidate: 300 },
);

export default async function AdminDynamicBlocksPage() {
  await requireAdminSection('inspire');

  const [blocks, rules, embedCounts] = await Promise.all([
    db
      .select({
        id: dynamicBlocks.id,
        name: dynamicBlocks.name,
        placement: dynamicBlocks.placement,
        status: dynamicBlocks.status,
        isActive: dynamicBlocks.isActive,
        displayOrder: dynamicBlocks.displayOrder,
        updatedAt: dynamicBlocks.updatedAt,
      })
      .from(dynamicBlocks)
      .orderBy(asc(dynamicBlocks.displayOrder), asc(dynamicBlocks.createdAt)),
    db
      .select({
        blockId: dynamicBlockRules.blockId,
        categoryName: inspireCategories.name,
        tagName: inspireTags.name,
        articleTitle: articles.title,
      })
      .from(dynamicBlockRules)
      .leftJoin(inspireCategories, eq(dynamicBlockRules.categoryId, inspireCategories.id))
      .leftJoin(inspireTags, eq(dynamicBlockRules.tagId, inspireTags.id))
      .leftJoin(articles, eq(dynamicBlockRules.articleId, articles.id)),
    getEmbedCounts(),
  ]);

  const rulesByBlock = new Map<string, string[]>();
  for (const rule of rules) {
    const label = rule.categoryName
      ? `Category: ${rule.categoryName}`
      : rule.tagName
        ? `Tag: ${rule.tagName}`
        : rule.articleTitle
          ? `Article: ${rule.articleTitle}`
          : null;
    if (!label) continue;
    const list = rulesByBlock.get(rule.blockId) ?? [];
    list.push(label);
    rulesByBlock.set(rule.blockId, list);
  }

  return (
    <div>
      <PageHeader
        breadcrumb={
          <Button asChild variant="ghost" size="sm" className="-ml-2">
            <Link href="/admin/inspire">
              <ArrowLeftIcon className="mr-1 size-4" />
              Back to Inspire
            </Link>
          </Button>
        }
        title="Dynamic Blocks"
        description="Reusable content blocks injected into matching articles at render time, or embedded manually from the article editor."
        actions={
          <Button asChild>
            <Link href="/admin/inspire/dynamic-blocks/create">
              <PlusIcon className="mr-1 size-4" />
              New Block
            </Link>
          </Button>
        }
      />

      {blocks.length === 0 ? (
        <div className="bg-card rounded-card border-hairline border">
          <EmptyState
            title="No dynamic blocks yet"
            description="Create one to attach shared content to categories, tags or specific articles."
          />
        </div>
      ) : (
        <div className="bg-card rounded-card border-hairline overflow-hidden border">
          <ConsoleTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Placement</th>
                <th>Rules</th>
                <th>Status</th>
                <th className="num">Manual embeds</th>
                <th className="num">Order</th>
                <th className="actions"></th>
              </tr>
            </thead>
            <tbody>
              {blocks.map((block) => {
                const ruleLabels = rulesByBlock.get(block.id) ?? [];
                const embedCount = embedCounts?.[block.id] ?? 0;
                return (
                  <tr key={block.id}>
                    <td>
                      <Link
                        href={`/admin/inspire/dynamic-blocks/${block.id}/edit`}
                        className="font-semibold hover:underline"
                      >
                        {block.name}
                      </Link>
                    </td>
                    <td className="capitalize">{block.placement}</td>
                    <td className="text-muted-foreground max-w-md">
                      {ruleLabels.length > 0 ? ruleLabels.join(', ') : '—'}
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        <StatusChip
                          status={block.status}
                          variant={block.status === 'published' ? 'success' : 'solid'}
                          label={block.status === 'published' ? 'Published' : 'Draft'}
                        />
                        {!block.isActive && (
                          <Chip variant="warning" size="sm">
                            Inactive
                          </Chip>
                        )}
                      </div>
                    </td>
                    <td className="num text-muted-foreground">
                      {embedCount > 0 ? `${embedCount} article${embedCount === 1 ? '' : 's'}` : '—'}
                    </td>
                    <td className="num text-muted-foreground">{block.displayOrder}</td>
                    <td className="actions">
                      <Button asChild variant="ghost" size="sm">
                        <Link href={`/admin/inspire/dynamic-blocks/${block.id}/edit`}>
                          <PencilIcon className="mr-1 size-3.5" />
                          Edit
                        </Link>
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </ConsoleTable>
        </div>
      )}
    </div>
  );
}
