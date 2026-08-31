import type { ReactNode } from 'react';
import type { ArticleSource } from '@/lib/inspire/article-sources';

/**
 * The article rail — DES-03 §5.1.
 *
 *   "On desktop the panel is the 300 px rail; on a phone it is a full-width
 *    block in the same place in the reading order."
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ONE MOUNT. THIS IS THE WHOLE DESIGN.
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The obvious way to build a block that is a sidebar on desktop and a
 * full-width block on a phone is to render it twice — `hidden lg:block` for one
 * and `lg:hidden` for the other — and this template already does exactly that
 * with `<ArticleSidebar>`, which is why production serves TWO `<aside>`
 * elements per article and why one of them measures 0x0 at every width.
 *
 * That pattern has already cost this site once: DES-09 G01 found the article
 * template emitting TWO `<h1>` elements on 85 of 85 articles, from a
 * mobile/desktop pair carrying the same headline. It was fixed by making the
 * headline ONE node whose size is a `clamp()`.
 *
 * So this component is mounted once and moved by CSS Grid placement, never
 * duplicated. `.hk-article-grid` puts it in column 2 spanning every row at
 * >= 1024px, and leaves it in source order — after the deck, before the
 * photograph — below that. `scripts/measure-article-rail.mjs` asserts the
 * count is exactly 1 at all five widths (check R6) rather than trusting this
 * comment.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE SLOTS, AND WHO OWNS EACH
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `rekod`   — UI-17. The record panel, which already existed and already
 *             rendered; it was in the wrong COLUMN, not missing.
 * `toc`     — UI-18. The table of contents. Passed in as a node; this
 *             component owns the `Dalam artikel ini` heading and the wrapper,
 *             UI-18 owns the list. Agreed with UI-18 on 01 Sep 2026: exactly
 *             one of the two may render that string, and the single-mount
 *             component is the only place that can guarantee it.
 *             **The heading renders only when `toc` is non-null** — a heading
 *             over nothing asserts a contents list the page does not have.
 * `sumber`  — UI-17. Rendered from the article's own `Sumber:` citations and
 *             from nothing else; see `@/lib/inspire/article-sources`. Absent
 *             on the 52 of 86 articles that carry no citation, because an
 *             empty `Sumber` heading asserts that an article is sourced when
 *             it is not.
 * `extra`   — everything the old sidebar carried (tags, categories, gallery,
 *             credits). Below the three specified blocks, so the composition
 *             DES-03 draws is the top of the rail at every width.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * MEASURED WIDTHS, FOR ANYONE BUILDING INTO A SLOT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The rail column is 300px. Blocks inside it carry `--sp-4` (16px) of
 * horizontal padding each side, so a child lays out in **268px** on desktop.
 * On a 390px phone the same node sits in the body column: 350px less the same
 * 32px = **318px**. A tap-target or truncation check inside the rail must use
 * 268, which is the narrower of the two and the one that is new.
 *
 * NOT sticky, and that is a decision with a reason rather than an omission:
 * when this column was pinned (`lg:sticky lg:top-[120px]`) its height was
 * capped at the viewport and the last block in it fell below that edge on a
 * normal laptop with no way to scroll to it.
 */
export interface ArticleRailProps {
  rekod?: ReactNode;
  /** UI-18's contents list. Null renders no heading and no wrapper. */
  toc?: ReactNode;
  sources?: ArticleSource[];
  extra?: ReactNode;
}

export function ArticleRail({ rekod, toc, sources, extra }: ArticleRailProps) {
  const hasSources = Array.isArray(sources) && sources.length > 0;
  // A rail with nothing in it is not an empty rail, it is a 300px hole in the
  // composition. Render nothing and let the body column take the full grid.
  if (!rekod && !toc && !hasSources && !extra) return null;

  return (
    <aside data-hk-rail className="hk-rail">
      {rekod && (
        <div data-hk-rail-block="rekod" className="hk-rail-block">
          {rekod}
        </div>
      )}

      {toc && (
        <nav data-hk-rail-block="toc" className="hk-rail-block" aria-labelledby="hk-rail-toc-h">
          {/* The heading is a real heading, not a styled span: a contents list
              is a navigable landmark and a screen-reader user needs to be able
              to jump to it. `.s-label` gives it the rail's small-caps
              treatment; the uppercase on screen is a `text-transform`, so the
              accessible name stays `Dalam artikel ini` in sentence case. */}
          <h2 id="hk-rail-toc-h" className="s-label hk-rail-heading">
            Dalam artikel ini
          </h2>
          {toc}
        </nav>
      )}

      {hasSources && (
        <div data-hk-rail-block="sumber" className="hk-rail-block">
          <h2 className="s-label hk-rail-heading">Sumber</h2>
          <ul className="hk-rail-sources">
            {sources.map((s) => (
              <li key={s.text}>{s.text}</li>
            ))}
          </ul>
        </div>
      )}

      {extra && <div className="hk-rail-block">{extra}</div>}
    </aside>
  );
}
