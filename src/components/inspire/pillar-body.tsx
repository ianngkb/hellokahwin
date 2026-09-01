import Link from 'next/link';
import { EmptyState } from '@/design-system/components';
import type { PillarView } from '@/lib/inspire/pillar-queries';

/** The shared style of one article row in a pillar list. `.s-pillar-link`
 * (components.css) carries the type; the row geometry is here because the
 * empty-cluster promise line below has to sit on exactly the same rhythm. */
const LINK_ROW_STYLE = {
  display: 'block',
  padding: '13px 0',
  borderBottom: '1px solid var(--hair)',
  textDecoration: 'none',
  color: 'inherit',
} as const;

/** The rule that opens a cluster body. Structural, and NOT conditional on the
 * cluster having links — see the empty-cluster branch. */
const CLUSTER_BODY_STYLE = { marginTop: 20, borderTop: '1px solid var(--rule)' } as const;

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
 *
 * It does NOT, however, get to go first. Clusters arrive in `display_order`,
 * which is an editorial ordering of the topic — not of what exists yet — so an
 * empty cluster could and did land above real articles. Measured on production
 * 2026-08-26: three of the nine pillars opened on a promise instead of a link
 * (`venue-perancangan` led with an empty "Dewan & venue majlis" while four
 * live articles sat below it; also `sebelum-nikah` and
 * `pelamin-kad-cenderahati`). Non-empty clusters therefore sort first and
 * empty ones sink, each group keeping its editorial order — `Array#sort` is
 * stable per spec (ES2019), so this reorders nothing else. */
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

  // UI-05 P6 — the pillar with nothing under it at all. Before this branch
  // existed it rendered an empty <div> — intro, then nothing, with no message
  // and no way out.
  //
  // PLAT-16: this used to be the FAILURE shape too. `renderPillarPage`
  // swallowed a failed or timed-out `getPillarView`, left `view` at
  // `{ clusters: [], unclustered: [], totalArticles: 0 }`, and rendered this —
  // so "we could not read this pillar" and "this pillar is empty" were the
  // same HTTP 200, cacheable at the Vercel edge for up to fifteen minutes. The
  // route now throws instead (`@/lib/cache/degraded-render`). This branch means
  // exactly one thing again: the pillar is empty. Keep it that way — do not
  // route a failure back through here.
  const isEmpty = orderedClusters.length === 0 && view.unclustered.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      {paragraphs.length > 0 && (
        <div style={{ borderBottom: '1px solid var(--rule)', paddingBottom: 40 }}>
          {paragraphs.map((p, i) => (
            <p key={i} className="s-deck" style={i === 0 ? undefined : { marginTop: 16 }}>
              {p}
            </p>
          ))}
        </div>
      )}

      {isEmpty ? (
        <div className="mt-12">
          {/* The design system's own empty block, not a bespoke one. `action`
              takes an onClick, which a server component cannot pass, so the
              way out is a real <Link> wearing `.s-btn` — a crawlable anchor
              rather than a button that would need a client boundary to do
              anything at all. The 14px offset reproduces what the built-in
              action gets: `.s-empty`'s 10px flex gap plus the button's own
              4px marginTop. */}
          <EmptyState
            size="h3"
            heading="Panduan ini masih kosong."
            body="Belum ada artikel di bawah topik ini."
          />
          <Link
            href="/artikel"
            className="s-btn"
            style={{ marginTop: 14, width: 'fit-content', textDecoration: 'none' }}
          >
            Semua artikel
          </Link>
        </div>
      ) : (
        <div className="mt-12 space-y-14">
          {orderedClusters.map((cluster) => (
            <section key={cluster.id} aria-labelledby={`cluster-${cluster.id}`}>
              <h2 id={`cluster-${cluster.id}`} className="s-h2">
                {cluster.name}
              </h2>

              {cluster.articles.length > 0 ? (
                <div style={CLUSTER_BODY_STYLE}>
                  {cluster.articles.map((article) => (
                    <Link
                      key={article.id}
                      href={`/artikel/${article.categorySlug}/${article.slug}`}
                      className="s-pillar-link"
                      style={LINK_ROW_STYLE}
                    >
                      {article.title}
                    </Link>
                  ))}
                </div>
              ) : (
                /* UI-05 P2/P3 — an empty cluster gets the SAME opening rule
                   and the same 20px of air as a populated one, and its promise
                   line sits on a link row's rhythm (13px/13px, closed by a
                   --hair border) so the cluster occupies exactly one row. The
                   rule says "the cluster body starts here" and that statement
                   is not conditional on there being links; before this, an
                   empty cluster rendered a bare `.s-meta mt-4` and the promise
                   read as a subtitle bolted onto the h2. Copy and colour are
                   deliberately unchanged — the wording is a separate open
                   question owned by the managing editor. */
                <div style={CLUSTER_BODY_STYLE}>
                  <p
                    className="s-meta"
                    style={{ padding: '13px 0', borderBottom: '1px solid var(--hair)' }}
                  >
                    Artikel untuk {cluster.entityPhrase} akan datang tidak lama lagi.
                  </p>
                </div>
              )}
            </section>
          ))}

          {view.unclustered.length > 0 && (
            <section aria-labelledby="cluster-lain-lain">
              <h2 id="cluster-lain-lain" className="s-h2">
                Lain-lain
              </h2>
              <div style={CLUSTER_BODY_STYLE}>
                {view.unclustered.map((article) => (
                  <Link
                    key={article.id}
                    href={`/artikel/${article.categorySlug}/${article.slug}`}
                    className="s-pillar-link"
                    style={LINK_ROW_STYLE}
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
