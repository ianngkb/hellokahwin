import type { Metadata } from 'next';
import Link from 'next/link';
import { Chip } from '@/components/ui/chip';
import { Pagination } from '@/components/ui/pagination';
import { Breadcrumbs } from '@/components/common/breadcrumbs';
import { getVisibleSearchCorpus, searchArticles } from '@/lib/search/article-search';
import {
  POPULAR_SEARCHES,
  SEARCH_PAGE_PATH,
  SEARCH_PAGE_SIZE,
  searchPageHref,
  type SearchResponse,
} from '@/lib/search/contract';
import { SEARCH_MAX_QUERY_LENGTH, topCategories, type CategorySummary } from '@/lib/search/engine';
import { SearchResultRow } from './search-result-row';

/**
 * /cari — the search results page (DES-06 §5: R1 many results, R3 nothing
 * found, R4 approximate; F3 works without JavaScript). A plain GET form that
 * the server answers, so it works before hydration and the back button and a
 * shared link both land on the same results.
 *
 * noindex,follow: internal search results are thin pages, but the links on
 * them should still pass to the articles (DES-06 §3.2).
 */
export const metadata: Metadata = {
  title: 'Carian',
  description: 'Cari artikel HelloKahwin tentang hantaran, mas kahwin, nikah dan majlis.',
  robots: { index: false, follow: true },
  alternates: { canonical: SEARCH_PAGE_PATH },
};

interface CariPageProps {
  searchParams: Promise<{ q?: string | string[]; page?: string | string[] }>;
}

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value) ?? '';
}

type Outcome =
  | { kind: 'empty' }
  | { kind: 'failed' }
  | { kind: 'done'; result: SearchResponse; page: number; totalPages: number };

async function runSearch(q: string, requestedPage: number): Promise<Outcome> {
  if (q.length < 2) return { kind: 'empty' };
  try {
    let page = requestedPage;
    let result = await searchArticles(q, {
      limit: SEARCH_PAGE_SIZE,
      offset: (page - 1) * SEARCH_PAGE_SIZE,
    });
    const totalPages = Math.max(1, Math.ceil(result.total / SEARCH_PAGE_SIZE));
    // A page number past the end (an old link, a hand-edited URL) shows the last page.
    if (page > totalPages) {
      page = totalPages;
      result = await searchArticles(q, {
        limit: SEARCH_PAGE_SIZE,
        offset: (page - 1) * SEARCH_PAGE_SIZE,
      });
    }
    return { kind: 'done', result, page, totalPages };
  } catch (err) {
    console.error('[cari] search failed:', err);
    return { kind: 'failed' };
  }
}

async function loadCategories(): Promise<{
  top: CategorySummary[];
  all: CategorySummary[];
  total: number;
} | null> {
  try {
    const corpus = await getVisibleSearchCorpus();
    return { top: topCategories(corpus, 4), all: topCategories(corpus, 100), total: corpus.length };
  } catch {
    return null;
  }
}

export default async function CariPage({ searchParams }: CariPageProps) {
  const sp = await searchParams;
  const q = first(sp.q).trim().slice(0, SEARCH_MAX_QUERY_LENGTH);
  const pageParam = Number.parseInt(first(sp.page), 10);
  const requestedPage = Number.isFinite(pageParam) && pageParam > 1 ? pageParam : 1;

  const [outcome, categories] = await Promise.all([runSearch(q, requestedPage), loadCategories()]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-8 lg:px-6">
      <Breadcrumbs
        items={[
          { label: 'Utama', href: '/' },
          { label: 'Artikel', href: '/artikel' },
          { label: 'Carian' },
        ]}
      />
      <div className="inspire-editorial">
        <SearchForm query={q} autoFocus={outcome.kind === 'empty'} />

        {outcome.kind === 'empty' && (
          <>
            <h1 className="inspire-display mt-10 text-3xl">Cari artikel</h1>
            <p className="text-muted-foreground mt-2 text-sm">
              Taip sekurang-kurangnya dua huruf, atau pilih topik yang ramai cari.
            </p>
            <PopularSearches />
          </>
        )}

        {outcome.kind === 'failed' && (
          <div className="mt-10" role="alert">
            <h1 className="inspire-display text-3xl">Carian gagal</h1>
            <p className="text-muted-foreground mt-2">
              Kami tidak dapat mencari sekarang. Ini masalah di pihak kami, bukan tanda tiada
              artikel. Cuba lagi sebentar lagi.
            </p>
            <p className="mt-4">
              <Link href={searchPageHref(q)} className="text-primary underline underline-offset-4">
                Cuba lagi
              </Link>
            </p>
          </div>
        )}

        {outcome.kind === 'done' && <Results outcome={outcome} query={q} categories={categories} />}
      </div>
    </div>
  );
}

function SearchForm({ query, autoFocus }: { query: string; autoFocus: boolean }) {
  return (
    <form action={SEARCH_PAGE_PATH} method="get" role="search" className="mt-2">
      <label htmlFor="cari-q" className="mb-2 block text-sm font-medium">
        Cari
      </label>
      <div className="flex gap-2">
        <input
          id="cari-q"
          name="q"
          type="search"
          defaultValue={query}
          maxLength={SEARCH_MAX_QUERY_LENGTH}
          placeholder="mas kahwin, hantaran, dewan…"
          enterKeyHint="search"
          autoComplete="off"
          // Only with no query: the page exists to be typed into, and F3 asks
          // for focus on the field. With results showing, focus stays put.
          autoFocus={autoFocus}
          className="border-border-strong bg-surface-raised text-foreground placeholder:text-muted-foreground focus-visible:border-primary focus-visible:ring-primary rounded-control h-11 w-full min-w-0 border px-4 text-base outline-hidden focus-visible:ring-1 focus-visible:ring-inset sm:text-sm"
        />
        <button
          type="submit"
          className="rounded-control bg-primary text-primary-foreground hover:bg-plum-hover focus-visible:ring-ring inline-flex h-11 shrink-0 items-center justify-center px-5 text-[11px] font-medium tracking-[0.14em] uppercase outline-hidden focus-visible:ring-2 focus-visible:ring-offset-2"
        >
          Cari
        </button>
      </div>
    </form>
  );
}

function PopularSearches({ heading = 'Carian popular' }: { heading?: string }) {
  return (
    <section className="mt-8" aria-labelledby="carian-popular">
      <h2 id="carian-popular" className="mb-3 text-lg">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {POPULAR_SEARCHES.map((term) => (
          <li key={term}>
            <Chip
              variant="outline"
              asChild
              className="hover:border-primary hover:text-primary h-11 px-4 text-sm"
            >
              <Link href={searchPageHref(term)}>{term}</Link>
            </Chip>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CategoryLinks({
  heading,
  items,
  total,
}: {
  heading: string;
  items: CategorySummary[];
  total: number;
}) {
  return (
    <section className="mt-10" aria-labelledby="kategori-pautan">
      <h2 id="kategori-pautan" className="mb-3 text-lg">
        {heading}
      </h2>
      <ul className="flex flex-wrap gap-2">
        {items.map((cat) => (
          <li key={cat.slug}>
            {/* Long names wrap rather than truncate (DES-06 X2). */}
            <Chip
              variant="outline"
              asChild
              className="hover:border-primary hover:text-primary h-auto min-h-11 px-4 py-2 text-left text-sm whitespace-normal"
            >
              <Link href={`/artikel/${cat.slug}`}>
                <span>{cat.name}</span>
                <span className="text-muted-foreground tabular-nums">{cat.count}</span>
              </Link>
            </Chip>
          </li>
        ))}
        <li>
          <Chip
            variant="outline"
            asChild
            className="hover:border-primary hover:text-primary h-auto min-h-11 px-4 py-2 text-sm"
          >
            <Link href="/artikel">
              <span>Semua artikel</span>
              <span className="text-muted-foreground tabular-nums">{total}</span>
            </Link>
          </Chip>
        </li>
      </ul>
    </section>
  );
}

function Results({
  outcome,
  query,
  categories,
}: {
  outcome: Extract<Outcome, { kind: 'done' }>;
  query: string;
  categories: Awaited<ReturnType<typeof loadCategories>>;
}) {
  const { result, page, totalPages } = outcome;
  const quoted = `“${query}”`;
  const suggestion = result.suggestion ? (
    <p className="mt-3 text-sm">
      Mungkin maksud anda:{' '}
      <Link
        href={searchPageHref(result.suggestion)}
        className="text-primary font-medium underline underline-offset-4"
      >
        {result.suggestion}
      </Link>
    </p>
  ) : null;

  if (result.mode === 'none' || result.total === 0) {
    return (
      <>
        <h1 className="inspire-display mt-10 text-3xl break-words">Tiada hasil untuk {quoted}</h1>
        <p className="text-muted-foreground mt-2">
          {categories
            ? `Kami ada ${categories.total} artikel, tetapi tiada yang padan dengan carian ini. Semak ejaan, cuba perkataan lain, atau mula dari topik di bawah.`
            : 'Tiada artikel yang padan dengan carian ini. Semak ejaan, cuba perkataan lain, atau mula dari topik di bawah.'}
        </p>
        {suggestion}
        <PopularSearches heading="Cuba carian ini" />
        {categories && (
          <CategoryLinks
            heading="Atau mula dari sini"
            items={categories.top}
            total={categories.total}
          />
        )}
      </>
    );
  }

  const approximate = result.mode === 'approximate';
  const start = (page - 1) * SEARCH_PAGE_SIZE;
  const shownCategories = categories
    ? categories.all.filter((c) => result.articles.some((a) => a.categorySlug === c.slug))
    : [];

  return (
    <>
      <h1 className="inspire-display mt-10 text-3xl break-words">Hasil carian untuk {quoted}</h1>
      {!approximate && (
        <p className="text-muted-foreground mt-2 text-sm">
          {result.total} artikel
          {totalPages > 1 && ` · halaman ${page} daripada ${totalPages}`}
        </p>
      )}
      {suggestion}

      {approximate ? (
        <section className="mt-8" aria-labelledby="padanan-hampir">
          <h2 id="padanan-hampir" className="text-2xl">
            Padanan hampir
          </h2>
          <p className="text-muted-foreground mt-2 mb-6 text-sm">
            Tiada artikel yang padan dengan semua perkataan itu. Ini yang paling hampir
            {result.total > 1 ? ` (${result.total} artikel)` : ''}.
          </p>
          <ol className="list-none p-0" start={start + 1}>
            {result.articles.map((article, i) => (
              <SearchResultRow
                key={article.id}
                article={article}
                headingLevel="h3"
                priority={i < 2}
              />
            ))}
          </ol>
        </section>
      ) : (
        <ol className="mt-8 list-none p-0" start={start + 1}>
          {result.articles.map((article, i) => (
            <SearchResultRow key={article.id} article={article} priority={i < 2} />
          ))}
        </ol>
      )}

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseHref={SEARCH_PAGE_PATH}
          searchParams={{ q: query }}
        />
      )}

      {categories && shownCategories.length > 0 && (
        <CategoryLinks heading="Semak juga" items={shownCategories} total={categories.total} />
      )}
    </>
  );
}
