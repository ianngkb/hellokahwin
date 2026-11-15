import { resolveArticleTitle } from '@/lib/seo/article-metadata';

/**
 * Google truncates a result title past roughly this many characters (TWN's
 * `MAX_TITLE_CHARS`). A new test title longer than this is refused.
 */
export const MAX_TITLE_CHARS = 60;

/**
 * The title Google is given for an article — exactly what the public page's
 * `generateMetadata` puts in <title> before the " | HelloKahwin" template
 * suffix: the meta title with any stored brand suffix stripped and entities
 * decoded, else the article title (`resolveArticleTitle`, the same function
 * the page uses, so the two cannot disagree).
 *
 * Its own module (not the 'use server' actions file, which may only export
 * async functions) so the actions and the tab's data loader share it.
 */
export function googleTitleOf(a: { title: string; metaTitle: string | null }): string {
  return resolveArticleTitle(a);
}
