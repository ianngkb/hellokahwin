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
 */
export function ArticleToc({ headings }: { headings: ArticleHeading[] }) {
  const entries = groupHeadings(headings);
  if (entries.length < TOC_MIN_HEADINGS) return null;

  return (
    <nav
      aria-label="Dalam artikel ini"
      className="article-toc border-border bg-muted/40 my-8 rounded-md border px-4 py-3.5 lg:mx-auto lg:max-w-[680px]"
    >
      <p className="hk-eyebrow mb-2.5">Dalam artikel ini</p>
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
