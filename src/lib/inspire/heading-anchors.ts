import { decode as decodeEntities } from 'he';

/**
 * Deterministic heading anchors for article bodies.
 *
 * Every `<h2>`/`<h3>` an article renders gets an `id` derived from its own
 * text, so an in-page anchor exists for each named thing on the page. Two
 * consumers have to agree on those ids — the table of contents (built from
 * the Tiptap JSON) and the rendered HTML (ids injected after sanitising) —
 * and they agree because both walk the headings in document order through the
 * same `createHeadingIdAssigner()` contract. `__tests__/heading-anchors.test.ts`
 * asserts the two sequences are identical rather than trusting that they are.
 *
 * Nothing here is per-article: an article gets anchors because it has
 * headings, not because someone remembered to add them.
 */

export interface ArticleHeading {
  level: 2 | 3;
  /** Heading text as written, ordinal prefix and all. */
  text: string;
  /** The same text with a leading list ordinal (`1. `, `10) `) removed. */
  label: string;
  id: string;
}

/**
 * A leading list ordinal. Stripped from the slug on purpose: a listicle that
 * gets reordered would otherwise change every id on the page and break every
 * link anyone had to a section. `#dewan-seri-siantan-putrajaya` survives
 * renumbering; `#1-dewan-seri-siantan-putrajaya` does not.
 */
const LEADING_ORDINAL = /^\s*\d{1,3}\s*[.)\]:]\s+/;

/** Characters that should vanish rather than become a separator. */
const ELIDED = /['‘’“”„`"]/g;

const MAX_SLUG_LENGTH = 72;

export function stripLeadingOrdinal(text: string): string {
  return text.replace(LEADING_ORDINAL, '').trim();
}

/**
 * Slugify a heading. ASCII-lowercase, `-` separated, no leading/trailing
 * separator. Returns `''` for text that has no sluggable characters at all
 * (punctuation, emoji, a script with no latin transliteration) — callers
 * supply the fallback, because only they know the heading's ordinal.
 */
export function slugifyHeadingText(text: string): string {
  const base = stripLeadingOrdinal(text)
    .normalize('NFKD')
    // Strip the combining marks NFKD just separated out, so `Ré` → `re`
    // rather than `re-`.
    .replace(/\p{Diacritic}/gu, '')
    .replace(ELIDED, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (base.length <= MAX_SLUG_LENGTH) return base;
  // Cut at a word boundary so the id stays readable, but never return an
  // empty string just because the first word is longer than the cap.
  const cut = base.slice(0, MAX_SLUG_LENGTH);
  const atBoundary = cut.replace(/-[^-]*$/, '');
  return (atBoundary || cut).replace(/^-+|-+$/g, '');
}

/**
 * Returns a function that turns heading text into a page-unique id, in the
 * order the headings are fed to it. Two headings with the same text get
 * `foo` and `foo-2`; a third gets `foo-3`. The emitted set is tracked rather
 * than a per-base counter, so a genuine `foo-2` heading elsewhere on the page
 * cannot be handed the same id twice.
 *
 * One assigner per article render. Feeding it the headings in a different
 * order produces different ids — that is the whole reason both consumers walk
 * the document forwards.
 */
export function createHeadingIdAssigner(): (text: string) => string {
  const emitted = new Set<string>();
  let ordinal = 0;

  return (text: string): string => {
    ordinal += 1;
    const base = slugifyHeadingText(text) || `bahagian-${ordinal}`;
    let candidate = base;
    let suffix = 1;
    while (emitted.has(candidate)) {
      suffix += 1;
      candidate = `${base}-${suffix}`;
    }
    emitted.add(candidate);
    return candidate;
  };
}

/** Concatenate the text of a Tiptap node's descendants. */
function nodeText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { type?: string; text?: string; content?: unknown[] };
  if (n.type === 'text' && typeof n.text === 'string') return n.text;
  if (!Array.isArray(n.content)) return '';
  return n.content.map(nodeText).join('');
}

/**
 * Walk Tiptap JSON in document order and return every level-2 and level-3
 * heading with the id it will carry in the rendered HTML.
 *
 * Depth-first, so `sectionBlock` wrappers (editor-only, unwrapped before
 * render) need no special case — their children are visited in the same order
 * `generateHTML` emits them.
 */
export function extractHeadings(content: unknown): ArticleHeading[] {
  const headings: ArticleHeading[] = [];
  const assign = createHeadingIdAssigner();

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: { level?: unknown }; content?: unknown[] };

    if (n.type === 'heading') {
      const level = typeof n.attrs?.level === 'number' ? n.attrs.level : 0;
      if (level === 2 || level === 3) {
        const text = nodeText(n).trim();
        headings.push({ level, text, label: stripLeadingOrdinal(text), id: assign(text) });
      }
      // A heading's own children are text — nothing below it to visit.
      return;
    }

    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  walk(content);
  return headings;
}

/**
 * `<h2>` / `<h3>`, with or without attributes. Headings never nest, so the
 * non-greedy body closes at the right tag.
 */
const HEADING_TAG = /<(h[23])((?:\s[^>]*)?)>([\s\S]*?)<\/\1>/gi;

/**
 * Add an `id` to every `<h2>`/`<h3>` in a rendered HTML fragment.
 *
 * Runs AFTER `sanitizeHtml`, like `wrapTablesForScroll` — `id` is not on the
 * sanitiser's allowlist, so injecting before it would simply have the
 * attribute stripped again. That also means no `id` reaching this function
 * can have come from author input.
 *
 * Pass the SAME assigner across every fragment of one article: the renderer
 * sanitises each content chunk separately, and a fresh assigner per chunk
 * would restart the de-duplication counter mid-page.
 */
export function injectHeadingIds(html: string, assign: (text: string) => string): string {
  return html.replace(HEADING_TAG, (whole, tag: string, attrs: string, inner: string) => {
    const text = decodeEntities(inner.replace(/<[^>]*>/g, '')).trim();
    // Consume the ordinal even when we do not inject, so a heading that
    // already carries an id cannot shift every later id by one.
    const id = assign(text);
    if (/\sid\s*=/i.test(attrs)) return whole;
    // The assigner only ever emits [a-z0-9-]; the guard is here so that stays
    // true if the slug rules are ever loosened.
    if (!/^[A-Za-z0-9_-]+$/.test(id)) return whole;
    return `<${tag} id="${id}"${attrs}>${inner}</${tag}>`;
  });
}
