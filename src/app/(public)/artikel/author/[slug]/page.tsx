import { Fragment } from 'react';
import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { GlobeIcon, InstagramIcon, LinkedinIcon, UserIcon } from 'lucide-react';
import { withDeadline } from '@/lib/api/timeout';
import { ArticleCard } from '@/components/inspire/article-card';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs, BreadcrumbJsonLd } from '@/components/common/breadcrumbs';
import { getAuthorArticles, getPublicAuthorBySlug } from '@/lib/authors/queries';
import {
  AUTHOR_ARTICLES_PER_PAGE,
  AUTHOR_ARTICLES_PER_PAGE_WITH_ADS,
  authorArchivePath,
  authorTotalPages,
  resolveAuthorPage,
} from '@/lib/authors/gate';

// Cache forever; invalidated on admin write via revalidateTag('articles') /
// revalidateTag('inspire-authors'). Time-based ISR was the cause of bot-crawl
// stampedes — see spec-inspire-catalog-bot-resilience.md.
export const revalidate = false;

// Hard 5s ceiling — see inspire/[category]/[slug]/page.tsx for rationale.
export const maxDuration = 5;

// No `generateStaticParams`, deliberately. The sibling article route documents
// why (a build-time pre-render pool blowout at `pool_size: 15` across ~30
// parallel Next build workers); author pages would draw from the same budget
// for a handful of URLs that render on first request anyway.

interface AuthorPageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ page?: string }>;
}

export async function generateMetadata({ params }: AuthorPageProps): Promise<Metadata> {
  const { slug } = await params;
  let author;
  try {
    author = await withDeadline(getPublicAuthorBySlug(slug), 3_000, `inspire-author-meta:${slug}`);
  } catch {
    return {};
  }
  // Unknown slug, a de-listed author, a vendor, a couple — all resolve to null
  // through the one gate in `getPublicAuthorBySlug`, and all get the same
  // minimal head so the page's `notFound()` below can still set a real 404
  // status. Returning full metadata here flushes the response head early and
  // locks the status at 200, which is what put ~208 tag URLs in the GSC Soft
  // 404 bucket.
  if (!author) return { title: 'Not Found' };

  // Same empty-archive detection as the tag page, and for the same reason: an
  // opted-in author with nothing published has no page, and finding that out
  // AFTER the head has flushed produces a soft 404 rather than a real one. A
  // FAILED count deliberately also returns 'Not Found' — briefly 404ing a real
  // author during a DB blip is the safer failure mode for SEO than caching a
  // soft 404.
  let articlesData: Awaited<ReturnType<typeof getAuthorArticles>>;
  try {
    articlesData = await withDeadline(
      getAuthorArticles(author.id, 1, 1),
      3_000,
      `inspire-author-meta-count:${slug}`,
    );
  } catch {
    return { title: 'Not Found' };
  }
  if (articlesData.total === 0) return { title: 'Not Found' };

  const description =
    author.bio?.trim() ||
    `Artikel dan panduan perkahwinan yang ditulis oleh ${author.name} untuk HelloKahwin.`;

  // Title omits ` | HelloKahwin` because the root layout's
  // title.template appends it. Open Graph and Twitter titles include it
  // explicitly because those tags are emitted as-is (no template).
  return {
    title: `${author.name} | Inspire`,
    description,
    alternates: { canonical: authorArchivePath(slug) },
    openGraph: {
      title: `${author.name} | Artikel | HelloKahwin`,
      description,
      type: 'profile',
      url: authorArchivePath(slug),
      images: [{ url: '/hellokahwin-logo.png', width: 886, height: 290, alt: 'HelloKahwin' }],
    },
    twitter: {
      card: 'summary',
      title: `${author.name} | Artikel | HelloKahwin`,
      description,
      images: ['/hellokahwin-logo.png'],
    },
  };
}

export default async function InspireAuthorPage({ params, searchParams }: AuthorPageProps) {
  const { slug } = await params;
  const sp = await searchParams;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://hellokahwin.com';

  const author = await withDeadline(getPublicAuthorBySlug(slug), 3_000, `inspire-author:${slug}`);
  // THE gate, in one place: `getPublicAuthorBySlug` only ever returns a profile
  // that is an admin, opted in, and slugged. Everything else — including every
  // couple and vendor on the site — is null here and 404s.
  if (!author) notFound();

  const page = resolveAuthorPage(sp.page);

  const showAds = false;
  const perPage = showAds ? AUTHOR_ARTICLES_PER_PAGE_WITH_ADS : AUTHOR_ARTICLES_PER_PAGE;

  // Soft-fail the listing query — render the empty state on deadline rather
  // than crashing the page. `null` is the "fetch failed" sentinel; a SUCCESSFUL
  // fetch returning zero articles is a different signal entirely and triggers
  // notFound() below.
  let articlesData: Awaited<ReturnType<typeof getAuthorArticles>> | null = null;
  try {
    articlesData = await withDeadline(
      getAuthorArticles(author.id, page, perPage),
      3_000,
      `inspire-author-articles:${slug}`,
    );
  } catch (err) {
    console.error(`[inspire-author:${slug}] articles fetch failed:`, err);
  }

  // Author exists and is public, but has nothing published → real 404, not a
  // 200 "no articles yet" page. An empty archive is thin content and Google
  // reads the empty-state body served with HTTP 200 as a Soft 404. Drafts count
  // toward zero on purpose: the URL 404s for the public until something goes
  // live. Only fires when the fetch SUCCEEDED — a transient DB failure falls
  // through to the empty UI instead of flickering a 404 during a Supabase blip.
  if (articlesData && articlesData.total === 0) {
    notFound();
  }

  const { data, total } = articlesData ?? { data: [], total: 0 };
  const totalPages = authorTotalPages(total, perPage);

  const breadcrumbItems = [
    { label: 'Utama', href: '/' },
    { label: 'Inspire', href: '/artikel' },
    { label: author.name },
  ];

  const socials = [
    { href: author.websiteUrl, Icon: GlobeIcon, label: `${author.name}'s website` },
    { href: author.instagramUrl, Icon: InstagramIcon, label: `${author.name} on Instagram` },
    { href: author.linkedinUrl, Icon: LinkedinIcon, label: `${author.name} on LinkedIn` },
  ].filter((s): s is { href: string; Icon: typeof GlobeIcon; label: string } => Boolean(s.href));

  const archiveUrl = `${baseUrl}${authorArchivePath(slug)}`;

  return (
    <div className="container mx-auto px-4 py-8 lg:px-6">
      <BreadcrumbJsonLd items={breadcrumbItems} />
      {total > 0 && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              // ProfilePage, not CollectionPage: the primary entity here is the
              // PERSON, and this is the URL every article's `author.url` points
              // at. Making the two agree is the whole E-E-A-T point of the
              // feature — a `Person` with a `url` that resolves to a page
              // declaring the same Person.
              '@type': 'ProfilePage',
              url: archiveUrl,
              mainEntity: {
                '@type': 'Person',
                name: author.name,
                url: archiveUrl,
                ...(author.title ? { jobTitle: author.title } : {}),
                ...(author.bio ? { description: author.bio } : {}),
                ...(author.avatarUrl ? { image: author.avatarUrl } : {}),
                ...(socials.length > 0 ? { sameAs: socials.map((s) => s.href) } : {}),
                worksFor: {
                  '@type': 'Organization',
                  name: 'HelloKahwin',
                  url: baseUrl,
                },
              },
            }).replace(/</g, '\\u003c'),
          }}
        />
      )}
      <Breadcrumbs items={breadcrumbItems} />

      <div className="inspire-editorial">
        {/* Author header */}
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-start">
          {author.avatarUrl ? (
            <Image
              src={author.avatarUrl}
              alt=""
              width={96}
              height={96}
              className="size-24 shrink-0 rounded-full object-cover"
              priority
            />
          ) : (
            <span className="bg-muted text-muted-foreground flex size-24 shrink-0 items-center justify-center rounded-full">
              <UserIcon className="size-9" />
            </span>
          )}
          <div className="min-w-0">
            <h1 className="inspire-display text-3xl">{author.name}</h1>
            {author.title && <p className="text-muted-foreground mt-1 text-sm">{author.title}</p>}
            {author.bio && (
              <p className="mt-3 max-w-[65ch] text-sm leading-relaxed">{author.bio}</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-4">
              <p className="text-muted-foreground text-sm">
                <span className="text-foreground font-mono font-medium tabular-nums">{total}</span>{' '}
                article{Number(total) === 1 ? '' : 's'}
              </p>
              {socials.length > 0 && (
                <span className="flex items-center gap-3">
                  {socials.map(({ href, Icon, label }) => (
                    <a
                      key={href}
                      href={href}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      aria-label={label}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Icon className="size-4" />
                    </a>
                  ))}
                </span>
              )}
            </div>
          </div>
        </header>

        {data.length > 0 ? (
          <>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {data.map((article, index) => (
                <Fragment key={article.id}>
                  <ArticleCard
                    title={article.title}
                    slug={article.slug}
                    categorySlug={article.categorySlug ?? 'uncategorized'}
                    categories={article.categories}
                    coverImageUrl={article.coverImageUrl}
                    coverImageVariants={
                      article.coverImageVariants as Record<
                        string,
                        { url: string; sizeBytes: number }
                      > | null
                    }
                    smartCrops={
                      article.coverImageSmartCrops as Record<
                        string,
                        { url: string; width: number; height: number }
                      > | null
                    }
                    publishedAt={null}
                  />
                </Fragment>
              ))}
            </div>

            {totalPages > 1 && (
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                baseHref={authorArchivePath(slug)}
                searchParams={{}}
              />
            )}
          </>
        ) : (
          <div className="py-20 text-center">
            <p className="text-lg font-medium">Tiada artikel dijumpai</p>
            <p className="text-muted-foreground mt-1 text-sm">
              Artikel lain daripada {author.name} akan datang tidak lama lagi.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
