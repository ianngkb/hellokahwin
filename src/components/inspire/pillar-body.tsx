import Link from 'next/link';
import type { PillarView } from '@/lib/inspire/pillar-queries';
import './article-twn.css';

/** One article row in a pillar list: a link on its own line, closed by a rule. */
const LINK_ROW_CLASS =
  'pillar-link hover:text-primary block border-b py-3 font-serif text-[17px] leading-snug transition-colors';

/** The rule that opens a cluster body. Structural, and NOT conditional on the
 * cluster having links — see the empty-cluster branch. */
const CLUSTER_BODY_CLASS = 'cluster-body mt-4 border-t';

/**
 * The one line an empty cluster renders. COPY-01, decided by the managing
 * editor 02 Sept 2026; see the empty-cluster branch below for why.
 *
 * The count sentence is suppressed at zero rather than printing "0 artikel
 * lain". A pillar whose clusters are ALL empty and which has no unclustered
 * articles reaches this branch with `totalArticles === 0` — `isEmpty` only
 * catches the pillar with no clusters at all.
 */
export function emptyClusterCopy(totalArticles: number): string {
  const here = 'Belum ada artikel di sini.';
  return totalArticles > 0 ? `${here} Halaman ini ada ${totalArticles} artikel lain.` : here;
}

/**
 * A pillar page's body: the map of the pillar.
 *
 * Every article link here is a plain crawlable <a>, grouped under its cluster
 * heading. This block IS the "pillar links down to every article" half of the
 * plan's linking rule, and it is generated from the category tree — adding an
 * article to a cluster makes it appear with no edit to this file, ever.
 *
 * Styled in The Wedding Notebook's category-page language: serif display
 * headings, quiet muted copy, hairline rules. Pillar hubs stay text-only.
 *
 * An EMPTY cluster still renders its heading (COPY-01, ratified 02 Sept 2026):
 * the pillar page is the map, and a cluster with nothing under it yet is
 * information for a reader. It does NOT get to go first: non-empty clusters
 * sort first and empty ones sink, each group keeping its editorial order —
 * `Array#sort` is stable, so this reorders nothing else.
 */
export function PillarBody({ view, intro }: { view: PillarView; intro: string | null }) {
  const paragraphs = (intro ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  // Clusters that have articles first; empty ones keep their editorial order at
  // the bottom. Stable sort, so within each group nothing moves.
  const orderedClusters = [...view.clusters].sort(
    (a, b) => Number(b.articles.length > 0) - Number(a.articles.length > 0),
  );

  // The pillar with nothing under it at all. This branch means exactly one
  // thing: the pillar is empty. A failed read throws in the route instead
  // (`@/lib/cache/degraded-render`) — do not route a failure back through here.
  const isEmpty = orderedClusters.length === 0 && view.unclustered.length === 0;

  return (
    <div className="max-w-3xl">
      {paragraphs.length > 0 && (
        <div className="text-muted-foreground space-y-4 border-b pb-8">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      )}

      {isEmpty ? (
        <div className="py-20 text-center">
          <p className="text-lg font-medium">Panduan ini masih kosong.</p>
          <p className="text-muted-foreground mt-1 text-sm">
            Belum ada artikel di bawah topik ini.
          </p>
          <Link
            href="/artikel"
            className="text-muted-foreground hover:text-foreground hover:border-foreground mt-6 inline-flex rounded-full border px-4 py-1.5 text-xs font-medium tracking-wider uppercase transition-colors"
            style={{ fontFamily: 'var(--font-geist)' }}
          >
            Semua artikel
          </Link>
        </div>
      ) : (
        <div className="mt-10 space-y-12">
          {orderedClusters.map((cluster) => (
            <section key={cluster.id} aria-labelledby={`cluster-${cluster.id}`}>
              <h2 id={`cluster-${cluster.id}`} className="inspire-display text-2xl">
                {cluster.name}
              </h2>

              {cluster.articles.length > 0 ? (
                <div className={CLUSTER_BODY_CLASS}>
                  {cluster.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/artikel/${article.categorySlug}/${article.slug}`}
                      className={LINK_ROW_CLASS}
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              ) : (
                /* An empty cluster gets the SAME opening rule as a populated
                   one, and its line sits on a link row's rhythm so the cluster
                   occupies exactly one row. COPY-01: the line is scoped to the
                   SECTION and says only what is checkable — never an undatable
                   "coming soon" promise, and no link or button (the pillar page
                   IS the handover target). */
                <div className={CLUSTER_BODY_CLASS}>
                  <p className="empty-cluster text-muted-foreground border-b py-3 text-sm">
                    {emptyClusterCopy(view.totalArticles)}
                  </p>
                </div>
              )}
            </section>
          ))}

          {view.unclustered.length > 0 && (
            <section aria-labelledby="cluster-lain-lain">
              <h2 id="cluster-lain-lain" className="inspire-display text-2xl">
                Lain-lain
              </h2>
              <div className={CLUSTER_BODY_CLASS}>
                {view.unclustered.map((article) => (
                  <Link
                    key={article.id}
                    href={`/artikel/${article.categorySlug}/${article.slug}`}
                    className={LINK_ROW_CLASS}
                  >
                    {article.title}
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
