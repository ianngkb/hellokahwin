import type { ArticleHeading } from '@/lib/inspire/heading-anchors';

/**
 * Below this many `<h2>`s a list of links is noise, not navigation — a
 * three-section article is already visible in one scroll.
 */
export const TOC_MIN_HEADINGS = 4;

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
 * `article-toc` is not decoration: the component renders inside
 * `.inspire-prose`, whose `ol` and `a` rules would otherwise style navigation
 * like body copy. The matching block lives in `globals.css`.
 */
export function ArticleToc({ headings }: { headings: ArticleHeading[] }) {
  const entries = groupHeadings(headings);
  if (entries.length < TOC_MIN_HEADINGS) return null;

  return (
    <nav
      aria-label="Isi kandungan"
      className="article-toc border-border bg-muted/40 my-8 rounded-md border px-4 py-3.5 lg:mx-auto lg:max-w-[680px]"
    >
      <p className="hk-eyebrow mb-2.5">Isi Kandungan</p>
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
