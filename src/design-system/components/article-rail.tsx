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
 * `toc`     — UI-18's `<ArticleToc labelledBy={RAIL_TOC_HEADING_ID}>`. The
 *             component keeps its `<nav class="article-toc">` and its links;
 *             the prop makes it drop its own heading, `aria-label` and box
 *             chrome, and this container supplies the heading instead.
 *
 *             Settled the long way round, which is worth recording because
 *             the intermediate position looked finished and was wrong. The
 *             contract first gave the heading to this container; then, on
 *             finding that the component already rendered §5.1's exact string
 *             and that UI-18's gate read the label out of `.hk-eyebrow`, it
 *             was handed back; then UI-18 shipped `labelledBy` together with
 *             a gate that resolves the name through `aria-label` ->
 *             `aria-labelledby` -> `.hk-eyebrow` and a `bad-toc-two-headings`
 *             fixture, which makes container-owned both safe AND checkable.
 *             That version is on master. Two props doing one job is the
 *             drift; one of them had to go, and it was not the tested one.
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
/**
 * The id the rail's contents heading carries, and the value callers pass to
 * `<ArticleToc labelledBy>`. Exported rather than written twice: the two must
 * be the same string or the landmark loses its accessible name, and
 * `audit-article-toc.mjs` fails a page whose `aria-labelledby` points at an id
 * that is not in the document — which is exactly what a typo produces.
 */
export const RAIL_TOC_HEADING_ID = 'hk-rail-toc-heading';

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

      {/* The heading is the CONTAINER's, and `<ArticleToc labelledBy>` is how
          UI-18 shipped that contract: set the prop and the component drops its
          own heading, its own `aria-label` and its own box chrome, so exactly
          one of the two renders the words and the landmark keeps an accessible
          name. `audit-article-toc.mjs` resolves that name through
          `aria-label` -> `aria-labelledby` -> `.hk-eyebrow`, and carries a
          `bad-toc-two-headings` fixture for the case where both render one.

          The `<nav>` stays UI-18's. Wrapping their nav in a nav of ours would
          nest two landmarks, and this item's own relocation check (R7) keys on
          `nav.article-toc` INSIDE `[data-hk-rail]` — a bare `<ol>` handed up
          would leave that assertion matching nothing and green for the wrong
          reason. So the rail contributes a heading and a wrapper `<div>`, and
          nothing that is itself a landmark.

          `<h2>`, not a styled `<span>`: a contents list is navigable structure
          and a screen-reader user needs to reach it. `.s-label` gives it the
          same small-caps as `Rekod` and `Sumber`; the uppercase on screen is a
          `text-transform`, so the accessible name stays `Dalam artikel ini` in
          sentence case rather than being shouted. */}
      {toc && (
        <div data-hk-rail-block="toc" className="hk-rail-block">
          <h2 id={RAIL_TOC_HEADING_ID} className="s-label hk-rail-heading">
            Dalam artikel ini
          </h2>
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
