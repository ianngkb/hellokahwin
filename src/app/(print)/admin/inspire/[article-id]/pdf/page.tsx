import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { requireAdmin } from '@/lib/auth/admin';
import { getPreviewArticleData } from '@/lib/inspire/preview-article';
import { ArticlePreviewView } from '@/components/inspire/article-preview-view';
import { AutoPrint } from './auto-print';
import { PrintToolbar } from './print-toolbar';

export const dynamic = 'force-dynamic';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PdfPageProps {
  params: Promise<{ 'article-id': string }>;
}

/**
 * The document title is doing real work here, not decoration: every browser
 * seeds the "Save as PDF" filename from `document.title`, so setting it to the
 * article title is what makes the file land on the client's disk as
 * "Ten Penang Venues.pdf" rather than "admin-inspire-<uuid>-pdf.pdf".
 *
 * `robots: noindex, nofollow` is the innermost of three layers — the route also
 * inherits the middleware `/admin(.*)` auth gate and the `X-Robots-Tag: noindex`
 * header `next.config.ts` sets for `/admin/(.*)`. The `(print)` route group is
 * invisible to both of those, which key off the URL path.
 */
export async function generateMetadata({ params }: PdfPageProps): Promise<Metadata> {
  const { 'article-id': articleId } = await params;
  const base: Metadata = { robots: { index: false, follow: false } };

  if (!UUID_RE.test(articleId)) return { ...base, title: 'Article PDF' };

  const pageData = await getPreviewArticleData(articleId);
  if (!pageData) return { ...base, title: 'Article PDF' };

  return { ...base, title: pageData.article.title };
}

/**
 * Chrome-free print view of an article draft (spec-article-draft-client-review).
 *
 * Renders the same `ArticlePreviewView` the admin preview and the client share
 * link use — so the PDF a client receives is the article they'd see live — but
 * in the `print` variant, which drops the sidebar and the mobile photo bar.
 * The `(print)` route group supplies a layout with no navbar or footer; the
 * `.article-print-root` wrapper is the hook for the `@media print` rules in
 * globals.css that hide everything else on the page.
 *
 * `PrintToolbar` sits deliberately outside that wrapper — screen-only chrome,
 * so a cancelled dialog isn't a dead end. See its own doc comment.
 */
export default async function ArticlePdfPage({ params }: PdfPageProps) {
  // Defence in depth: the middleware `/admin(.*)` matcher already gates this
  // URL, but admin-ness is ultimately the `admin_users` email lookup, not the
  // Clerk session role — so call the same guard the preview page calls.
  await requireAdmin();

  const { 'article-id': articleId } = await params;

  if (!UUID_RE.test(articleId)) notFound();

  const pageData = await getPreviewArticleData(articleId);
  if (!pageData) notFound();

  return (
    <>
      <PrintToolbar articleId={articleId} />
      <div className="article-print-root">
        <ArticlePreviewView data={pageData} variant="print" />
        <AutoPrint />
      </div>
    </>
  );
}
