import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { articles } from '@/lib/db/schema/articles';
import { bodySectionHeadings } from './body-sections';

/**
 * The section headings of an article as it is stored now — what the admin
 * section drop-off panel compares with the headings readers were served, so it
 * can say when an edit added or removed one (`headingsChanged`).
 *
 * HelloKahwin port note: The Wedding Notebook reads these from the public
 * page's cached render (stored doc + dynamic blocks merged). Dynamic blocks are
 * only ever added around the body (see `@/lib/inspire/faq-schema`), never as a
 * direct `h2`/`h3` child of the prose, so the stored document gives the same
 * heading list without reaching into the public page cache.
 *
 * An unknown slug → `[]`. Failures propagate: the panel degrades through
 * `safePanel`, never guesses. Uncached (a plain indexed read by slug), so the
 * cached and uncached drop-off getters both call it as is.
 */
export async function loadCurrentSectionHeadings(slug: string): Promise<string[]> {
  if (!slug) return [];
  const [article] = await db
    .select({ content: articles.content })
    .from(articles)
    .where(eq(articles.slug, slug))
    .limit(1);
  return article ? bodySectionHeadings(article.content) : [];
}
