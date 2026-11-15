import { normaliseSectionHeading } from '@/lib/analytics/section-tracking';

/**
 * The article's section headings as the PUBLIC page renders them, read from
 * the stored tiptap JSON — the server-side twin of the tracker's DOM selector
 * (`SECTION_HEADING_SELECTOR`: `.inspire-prose > div > h2 | h3`).
 *
 * The renderer unwraps editor-only `sectionBlock`s, then turns each run of
 * top-level nodes into HTML parts; a top-level `heading` node becomes a direct
 * child `<h2>`/`<h3>` of one of those parts. Levels: the renderer allows 2–6
 * and maps anything it does not list (a WordPress-import level 1, or a missing
 * level, which tiptap defaults to 1) to `<h2>`, so level ≤ 3 = a section.
 * Headings nested in lists, quotes, table cells or embeds (the ang pow rate
 * table's own `<h3>`s) are not top-level and are not counted — exactly what the
 * selector skips. `(see article-sections tests)` renders a
 * fixture through the real `ArticleRenderer` and asserts the two agree.
 *
 * Pure (no DOM, no DB) so the admin page can compare the current heading count
 * with the one recorded readers saw (`headingsChanged`).
 */

interface TiptapNode {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: unknown[];
  text?: string;
}

function unwrapSections(nodes: unknown[]): unknown[] {
  const out: unknown[] = [];
  for (const node of nodes) {
    const n = node as TiptapNode | null;
    if (n && n.type === 'sectionBlock' && Array.isArray(n.content)) {
      out.push(...unwrapSections(n.content));
    } else {
      out.push(node);
    }
  }
  return out;
}

function textOf(node: unknown): string {
  const n = node as TiptapNode | null;
  if (!n || typeof n !== 'object') return '';
  if (n.type === 'text') return typeof n.text === 'string' ? n.text : '';
  return Array.isArray(n.content) ? n.content.map(textOf).join('') : '';
}

/** The renderer's heading levels (StarterKit `heading.levels` in article-renderer.tsx). */
const RENDERED_LEVELS: readonly unknown[] = [2, 3, 4, 5, 6];

function isSectionHeading(node: unknown): boolean {
  const n = node as TiptapNode | null;
  if (!n || n.type !== 'heading') return false;
  // Mirror tiptap's Heading.renderHTML exactly: a level it does not list
  // (1, 7, a missing level, even the string "3") renders as levels[0] = h2.
  const raw = n.attrs?.level;
  const rendered = RENDERED_LEVELS.includes(raw) ? (raw as number) : 2;
  return rendered <= 3;
}

/** Each body section heading's text, in order (whitespace-collapsed, ≤ 80 chars). */
export function bodySectionHeadings(content: unknown): string[] {
  const doc = content as TiptapNode | null;
  if (!doc || typeof doc !== 'object' || !Array.isArray(doc.content)) return [];
  return unwrapSections(doc.content)
    .filter(isSectionHeading)
    .map((h) => normaliseSectionHeading(textOf(h)));
}

/** How many body sections the public page renders for this content. */
export function countBodySections(content: unknown): number {
  return bodySectionHeadings(content).length;
}
