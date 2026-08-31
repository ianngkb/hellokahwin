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
 * `toc`     — UI-18's `<ArticleToc variant="rail">`, which brings its own
 *             `nav`, `aria-label` and `Dalam artikel ini` label. The rail
 *             renders NO heading of its own for it.
 *
 *             The contract first agreed with UI-18 on 01 Sep 2026 gave the
 *             heading to this component, on the argument that a single mount
 *             is the only place that can guarantee exactly one instance. That
 *             was right about mounting and wrong about ownership: the
 *             component already renders §5.1's exact string, and UI-18's
 *             production gate reads the label out of `.hk-eyebrow` rather
 *             than comparing it to a string of its own. Taking the heading
 *             would have doubled the words on screen and turned that gate red
 *             on a correct article. Corrected before either shipped.
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

      {/* No heading here, deliberately. `<ArticleToc variant="rail">` renders
          its own `nav.article-toc`, its own `aria-label` and its own
          `<p class="hk-eyebrow">Dalam artikel ini</p>` — DES-03 §5.1's exact
          string — and `scripts/audit-article-toc.mjs` reads all three off
          production. A heading here as well would render the same words twice,
          one above the other. The rail contributes the rule above the label
          (`.hk-rail-block .hk-eyebrow`) and nothing else. */}
      {toc && (
        <div data-hk-rail-block="toc" className="hk-rail-block">
          {toc}
        </div>
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
