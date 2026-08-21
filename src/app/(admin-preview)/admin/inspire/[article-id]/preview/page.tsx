import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Eye, ArrowLeft } from 'lucide-react';
import { requireAdmin } from '@/lib/auth/admin';
import { getPreviewArticleData } from '@/lib/inspire/preview-article';
import { ArticlePreviewView } from '@/components/inspire/article-preview-view';
import { Chip } from '@/components/ui/chip';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PreviewPageProps {
  params: Promise<{ 'article-id': string }>;
}

const statusVariants: Record<string, 'warning' | 'success' | 'outline'> = {
  draft: 'warning',
  published: 'success',
  archived: 'outline',
};

export async function generateMetadata({ params }: PreviewPageProps): Promise<Metadata> {
  const { 'article-id': articleId } = await params;
  const base: Metadata = { robots: { index: false, follow: false } };

  if (!UUID_RE.test(articleId)) return { ...base, title: 'Article Preview' };

  const pageData = await getPreviewArticleData(articleId);
  if (!pageData) return { ...base, title: 'Article Preview' };

  return { ...base, title: `Preview: ${pageData.article.title}` };
}

export default async function ArticlePreviewPage({ params }: PreviewPageProps) {
  await requireAdmin();

  const { 'article-id': articleId } = await params;

  if (!UUID_RE.test(articleId)) notFound();

  const pageData = await getPreviewArticleData(articleId);
  if (!pageData) notFound();
  const { article } = pageData;

  return (
    <ArticlePreviewView
      data={pageData}
      banner={
        /* Preview banner */
        <div className="border-warning bg-warning-subtle sticky top-24 z-30 border-b px-4 py-2.5 md:top-[106px]">
          <div className="container mx-auto flex items-center justify-between gap-4">
            <div className="text-warning flex items-center gap-2 text-sm">
              <Eye className="h-4 w-4 shrink-0" />
              <span className="font-medium">You are previewing this article</span>
              <Chip
                size="sm"
                variant={statusVariants[article.status] ?? 'outline'}
                className="ml-2 text-xs"
              >
                {article.status}
              </Chip>
            </div>
            <Link
              href={`/admin/inspire/${article.id}/edit`}
              className="text-warning hover:text-warning-strong flex shrink-0 items-center gap-1.5 text-sm font-medium"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Editor
            </Link>
          </div>
        </div>
      }
    />
  );
}
