import type { ArticleHeading } from '@/lib/inspire/heading-anchors';

/**
 * Below this many `<h2>`s a list of links is noise, not navigation.
 *
 * TWO, not four. It was four, on the argument that a three-section article is
 * already visible in one scroll — which is an argument about a reader who has
 * already arrived at the top of the page. It was measured against the live
 * corpus on 01 Sept 2026 (UI-18): of 86 article URLs in the sitemap, 65 carry
 * two or more `<h2>`, 63 carry four or more. The four-heading floor was
 * therefore withholding the contents list from exactly two articles, at the
 * cost of a rule nobody could state from the page. UI-18's DoD sets the floor
 * at two and `scripts/audit-article-toc.mjs` asserts it against production, so
 * this constant and the gate move together or the gate goes red.
 */
export const TOC_MIN_HEADINGS = 2;

interface TocEntry {
  heading: ArticleHeading;
  children: ArticleHeading[];
}

/**
 * Does this article get a contents list at all? — UI-17.
 *
 * Exported so the floor lives in ONE place. UI-17's rail has to know the
 * answer BEFORE it renders: a slot whose component returns null still leaves
 * the rail's wrapper `<div>` behind, and a wrapper in a flex column with
 * `gap: var(--sp-9)` contributes 56px of dead space between Rekod and Sumber
 * while measuring 0px tall. That shipped to a preview and was caught only
 * because `measure-article-rail.mjs` records block HEIGHT — `toc h0` on
 * mas-kahwin-ikut-negeri, an article with zero `<h2>`, at all five widths. A
 * React element is truthy even when it renders nothing, so
 * `{toc && <div>{toc}</div>}` cannot see it.
 *
 * The caller could have counted `<h2>`s itself. That would be a SECOND
 * definition of the floor, in another file, free to drift from
 * `TOC_MIN_HEADINGS` the day somebody changes it — and it has already moved
 * once, from four to two.
 */
export function hasArticleToc(headings: ArticleHeading[]): boolean {
  return groupHeadings(headings).length >= TOC_MIN_HEADINGS;
}

/** Group `<h3>`s under the `<h2>` they follow. Orphan `<h3>`s are dropped. */
function groupHeadings(headings: ArticleHeading[]): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const heading of headings) {
    if (heading.level === 2) {
      entries.push({ heading, children: [] });
    } else if (entries.length > 0) {
      entries[entries.length - 1].children.push(heading);
    }
  }
  return entries;
}

/**
 * In-page table of contents.
 *
 * Plain `<a href="#…">` anchors — no client JavaScript, no scroll-spy, and
 * therefore present in the server-rendered HTML that Google parses. That is
 * the point: the links are what tell a crawler this page contains ten
 * separately-addressable things rather than one long article.
 *
 * The ids come from `extractHeadings()`, the same call the renderer feeds to
 * `injectHeadingIds()`, so every href here resolves to a heading that exists.
 *
 * Entries show the heading VERBATIM, list ordinal and all, so the contents
 * read exactly like the page it describes. Adding a second numbering of our
 * own put "11." in front of an unnumbered "Kesimpulan" and double-numbered
 * everything above it.
 *
 * `article-toc` is not decoration, and it is not scoped to one container
 * either. The component styles itself from `nav.article-toc` in `globals.css`;
 * the `.inspire-prose nav.article-toc` rules alongside it carry ONLY the
 * overrides needed to beat the prose `ol`/`a` rules, which would otherwise
 * dress navigation up as body copy. That split is the CONTAINER CONTRACT with
 * UI-17: the desktop rail renders this same component OUTSIDE `.inspire-prose`,
 * and a component whose only styling lived under an ancestor selector would
 * arrive there unstyled. (DES-12 shipped a 0x0 wordmark that way, and UI-02
 * hit the same shape.) UI-17 owns the rail; UI-18 owns this component and its
 * base rules.
 *
 * The label is `Dalam artikel ini`, from DES-03 §5.1 — the served text is
 * uppercase because `.hk-eyebrow` sets `text-transform`, exactly as `REKOD`
 * and `SUMBER` are mixed case in source. It read `Isi Kandungan` until UI-18.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * `labelledBy` — THE ONE PROP, AND WHY IT IS A PROP AND NOT A SECOND COMPONENT
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * UI-17's rail renders `Dalam artikel ini` itself, as an `.s-label` sibling of
 * `Rekod` and `Sumber`, so the three rail blocks read as one system. That is the
 * right call and the heading is theirs. But it leaves a window in which BOTH
 * render it, and a half-done relocation stacks two headings on 68 live articles.
 *
 * So the two shapes are one component with one switch, rather than an agreement
 * between two files that a person has to keep:
 *
 *   <ArticleToc headings={…} />                      inline, today. Own heading,
 *                                                    own aria-label, own box.
 *   <ArticleToc headings={…} labelledBy="rail-toc" /> in the rail. NO heading, NO
 *                                                    aria-label, NO box, NO
 *                                                    margin — the container
 *                                                    supplies all four, and the
 *                                                    landmark takes its name from
 *                                                    the container's heading id.
 *
 * Passing `labelledBy` is therefore the ONLY way to get the bare form, and there
 * is no way to get the bare form without an accessible name. `aria-label` is
 * dropped rather than kept alongside `aria-labelledby` on purpose: an
 * `aria-label` on this element would override the container's heading as the
 * landmark's accessible name, which is the opposite of what the rail intends.
 *
 * `scripts/audit-article-toc.mjs` asserts both shapes against production —
 * `ok-toc-in-rail`, `bad-toc-duplicated` and `bad-toc-two-headings` are three
 * captures of a real article that differ from the green control in exactly one
 * thing each.
 */
export function ArticleToc({
  headings,
  labelledBy,
}: {
  headings: ArticleHeading[];
  /**
   * Id of a heading the CONTAINER renders. Set it and this component drops its
   * own heading, its own `aria-label` and its own box chrome. Leave it unset and
   * nothing about the inline render changes.
   */
  labelledBy?: string;
}) {
  const entries = groupHeadings(headings);
  if (!hasArticleToc(headings)) return null;

  // The box chrome is an INLINE-CALLOUT treatment: bordered card, centred,
  // capped at the 680px reading measure. Inside a 268px rail column that is a
  // card in a card, and `lg:max-w-[680px]` fights the column's own width.
  const chrome = labelledBy
    ? 'article-toc'
    : 'article-toc border-border bg-muted/40 my-8 rounded-md border px-4 py-3.5 lg:mx-auto lg:max-w-[680px]';

  return (
    <nav
      {...(labelledBy ? { 'aria-labelledby': labelledBy } : { 'aria-label': 'Dalam artikel ini' })}
      className={chrome}
    >
      {!labelledBy && <p className="hk-eyebrow mb-2.5">Dalam artikel ini</p>}
      <ol>
        {entries.map((entry) => (
          <li key={entry.heading.id}>
            <a href={`#${entry.heading.id}`}>{entry.heading.text}</a>
            {entry.children.length > 0 && (
              <ul>
                {entry.children.map((child) => (
                  <li key={child.id}>
                    <a href={`#${child.id}`}>{child.text}</a>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
