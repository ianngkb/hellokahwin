import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { getArticleByShareToken } from '@/lib/inspire/preview-article';
import { ArticlePreviewView } from '@/components/inspire/article-preview-view';

/**
 * Client share link (spec-article-draft-client-review).
 *
 * An unguessable, unauthenticated view of a draft, so a client can review the
 * article before it goes live. It inherits `(public)/layout.tsx` — navbar,
 * footer, announcement bar — deliberately: the whole point is that the client
 * sees what ships, chrome included. No admin banner, no auth.
 *
 * `force-dynamic` because the token is revocable: a cached render would keep
 * serving a draft after the admin revoked the link.
 */
export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ token: string }>;
}

/**
 * Noindex at the page level — one of the three layers guarding this route
 * (the others are `robots.ts` Disallow and the `X-Robots-Tag` header in
 * `next.config.ts`). Never throws on a bad token: metadata runs before the page
 * body, and a 404'd token must still return a valid noindex document.
 *
 * `referrer: 'no-referrer'` is a separate concern from indexing, and it is the
 * one that protects the secret. The token IS the credential and it lives in the
 * URL, while this page inherits `(public)/layout.tsx` — a navbar and footer full
 * of outbound links. Without this, one click on any of them hands the full
 * `/draft/{token}` URL to the destination in the `Referer` header (and to every
 * third-party script on the page), permanently leaking a link that was supposed
 * to be unguessable.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { token } = await params;
  const data = await getArticleByShareToken(token);

  const robots = { index: false, follow: false };
  const referrer = 'no-referrer' as const;

  if (!data || data.article.status === 'deleted') {
    return { title: 'Not Found', robots, referrer };
  }

  return { title: `Draft for review — ${data.article.title}`, robots, referrer };
}

export default async function DraftSharePage({ params }: PageProps) {
  const { token } = await params;
  const data = await getArticleByShareToken(token);

  // No row matches: either an unknown/malformed token, or the link was revoked
  // (`share_token` set to NULL, which can never match a lookup).
  if (!data) notFound();

  const { article } = data;

  // Soft-deleted articles have no reviewable content — treat like a dead link.
  if (article.status === 'deleted') notFound();

  // Published: the token is deliberately NOT cleared on publish, so send the
  // client to the real article instead of 404ing. If the article is later
  // unpublished, this same link starts rendering the draft again.
  if (article.status === 'published') {
    // `categorySlug` comes from a leftJoin, so it is null for an article with
    // no primary category (or one whose category row was deleted). Building the
    // URL anyway would send the client to a literal `/artikel/null/{slug}`,
    // which 404s with no explanation — a plain 404 here is the honest answer.
    // The live article page guards the same value the same way before it
    // interpolates it into a redirect.
    if (!article.categorySlug) notFound();

    // 307, NOT 308. A permanent redirect is cached by the browser indefinitely,
    // which would quietly break the self-healing promise above: once a client's
    // browser has followed a 308, it stops asking us at all, so unpublishing the
    // article could never revive their link — they'd be pinned to a URL that now
    // 404s. A temporary redirect nudges them to the live article while keeping
    // every future visit a real request we can re-decide.
    redirect(`/artikel/${article.categorySlug}/${article.slug}`);
  }

  return <ArticlePreviewView data={data} />;
}
