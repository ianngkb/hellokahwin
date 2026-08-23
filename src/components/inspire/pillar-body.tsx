import Link from 'next/link';
import type { PillarView } from '@/lib/inspire/pillar-queries';

/**
 * A pillar page's body: the map of the pillar.
 *
 * Every article link here is a plain crawlable <a>, grouped under its cluster
 * heading. This block IS the "pillar links down to every article" half of the
 * plan's linking rule, and it is generated from the category tree — adding an
 * article to a cluster makes it appear with no edit to this file, ever.
 *
 * An EMPTY cluster still renders its heading. That is deliberate: the pillar
 * page is the map, and a cluster with nothing under it yet is information for a
 * reader and a commitment for the editorial team. Hiding it would make the
 * pillar look complete when it is not.
 */
export function PillarBody({ view, intro }: { view: PillarView; intro: string | null }) {
  const paragraphs = (intro ?? '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <div className="mx-auto max-w-3xl">
      {paragraphs.length > 0 && (
        <div className="border-border border-b pb-10">
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'hk-deck' : 'hk-deck mt-4'}>
              {p}
            </p>
          ))}
        </div>
      )}

      <div className="mt-12 space-y-14">
        {view.clusters.map((cluster) => (
          <section key={cluster.id} aria-labelledby={`cluster-${cluster.id}`}>
            <h2 id={`cluster-${cluster.id}`} className="hk-display text-[1.5rem] lg:text-[1.75rem]">
              {cluster.name}
            </h2>

            {cluster.articles.length > 0 ? (
              <ul className="border-border mt-5 divide-y border-t">
                {cluster.articles.map((article) => (
                  <li key={article.id}>
                    <Link
                      href={`/artikel/${article.categorySlug}/${article.slug}`}
                      className="hover:text-muted-foreground block py-3 text-base transition-colors"
                    >
                      {article.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground mt-4 text-sm">
                Artikel untuk {cluster.entityPhrase} akan datang tidak lama lagi.
              </p>
            )}
          </section>
        ))}

        {view.unclustered.length > 0 && (
          <section aria-labelledby="cluster-lain-lain">
            <h2 id="cluster-lain-lain" className="hk-display text-[1.5rem] lg:text-[1.75rem]">
              Lain-lain
            </h2>
            <ul className="border-border mt-5 divide-y border-t">
              {view.unclustered.map((article) => (
                <li key={article.id}>
                  <Link
                    href={`/artikel/${article.categorySlug}/${article.slug}`}
                    className="hover:text-muted-foreground block py-3 text-base transition-colors"
                  >
                    {article.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
