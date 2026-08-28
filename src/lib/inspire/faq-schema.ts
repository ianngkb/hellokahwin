import { nodeText } from './heading-anchors';

/**
 * `FAQPage` JSON-LD for articles that carry a Soalan lazim block.
 *
 * 29 of the 31 articles the Sprint-02 census flagged end in a `Soalan lazim`
 * section — a heading, then a question per sub-heading, then the answer as
 * prose. Every one of them was emitting `Article` + `BreadcrumbList` and
 * nothing else, so the question-shaped half of a question-shaped corpus was
 * invisible as structured data.
 *
 * The block is found by heading TEXT, not by heading level, because the corpus
 * uses two levels for the same thing: the mas-kahwin cluster writes the whole
 * body in `<h3>` and so opens the block with `<h3>Soalan lazim</h3>` and asks
 * in `<h4>`; every other article opens with `<h2>` and asks in `<h3>`. Keying
 * off `<h2>` would have silently skipped seven articles.
 *
 * Like `listicle-schema.ts`, this is derived from the article's own body and
 * never hand-written per article, and it is deliberately conservative — a
 * `Question` we cannot show on the page is worse than no `FAQPage` at all,
 * because structured data that misdescribes the page is how a site loses
 * rich-result eligibility rather than gains it. So a sub-heading only becomes a
 * `Question` when it is phrased as one, and only when prose follows it.
 *
 * Source of truth is `article.content` — the authored body — not the merged
 * `renderContent`. Dynamic blocks only ever add nodes around the body, so
 * every string this module emits is guaranteed to be text the reader can see,
 * which is exactly what Google's "content must be visible" rule asks for.
 * Reading the merged doc instead would let a heading-less block appended at
 * the end bleed into the last answer.
 */

/**
 * The one heading that opens a Q&A block. Style guide §9 fixes the wording at
 * `Soalan lazim`; the tolerance here is case, inner whitespace and a trailing
 * colon, and nothing else. It deliberately does NOT match `Soalan sebelum
 * bayar` or `Soalan sebelum menempah juru inai` — three live articles carry
 * one of those as a prose section AND a real `Soalan lazim` block further
 * down, so a prefix match would have picked the wrong section and emitted a
 * `FAQPage` with no questions in it.
 */
const FAQ_BLOCK_HEADING = /^soalan\s+lazim\s*:?$/i;

/** A sub-heading is only a question when it is written as one. */
const QUESTION = /\?$/;

/**
 * How many questions a block needs before we describe the page as an FAQ.
 *
 * The style guide asks writers for 3 to 5 and the live corpus runs 3 to 5, so
 * this floor never fires today. It exists so that a single stray `?` heading
 * under a mistyped `Soalan lazim` cannot turn an ordinary article into an
 * `FAQPage` — one question is a heading, not a section.
 */
export const FAQ_MIN_QUESTIONS = 2;

export interface FaqEntry {
  /** The sub-heading, verbatim. */
  question: string;
  /** The prose under it, paragraphs joined with a single space. */
  answer: string;
}

/**
 * One entry per block-level node of a Tiptap doc, in document order.
 * `level` is the heading level, or `0` for a paragraph.
 *
 * Depth-first like `extractHeadings`, so editor-only `sectionBlock` wrappers
 * need no special case. Recursion stops at headings and paragraphs, which is
 * what lets a paragraph nested in a blockquote or a list item still surface as
 * its own chunk of answer prose.
 */
function flattenBlocks(content: unknown): { level: number; text: string }[] {
  const blocks: { level: number; text: string }[] = [];

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; attrs?: { level?: unknown }; content?: unknown[] };

    if (n.type === 'heading') {
      const level = typeof n.attrs?.level === 'number' ? n.attrs.level : 0;
      const text = nodeText(n).trim();
      if (level > 0 && text) blocks.push({ level, text });
      return;
    }

    if (n.type === 'paragraph') {
      const text = nodeText(n).trim();
      if (text) blocks.push({ level: 0, text });
      return;
    }

    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  walk(content);
  return blocks;
}

/**
 * The question/answer pairs of an article's Soalan lazim block, in order.
 * Empty for an article that has no block — two of the census's 31 do not.
 *
 * The block runs from its heading to the next heading at or above the same
 * level. Inside it, a heading exactly one level deeper opens a question;
 * anything deeper than that is sub-structure inside an answer and contributes
 * no text, because a heading is not prose we can quote as an answer.
 */
export function extractFaqEntries(content: unknown): FaqEntry[] {
  const blocks = flattenBlocks(content);
  const start = blocks.findIndex((b) => b.level > 0 && FAQ_BLOCK_HEADING.test(b.text));
  if (start === -1) return [];

  const blockLevel = blocks[start].level;
  const entries: FaqEntry[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.length > 0) entries.push({ question, answer: answer.join(' ') });
    question = null;
    answer = [];
  };

  for (const block of blocks.slice(start + 1)) {
    if (block.level > 0 && block.level <= blockLevel) break;
    if (block.level === blockLevel + 1) {
      flush();
      // A sub-heading that is not a question closes the previous answer and
      // opens nothing, so its prose is never attributed to another question.
      if (QUESTION.test(block.text)) question = block.text;
      continue;
    }
    if (block.level > 0) continue;
    if (question) answer.push(block.text);
  }
  flush();

  return entries;
}

export interface FaqPageJsonLd {
  '@context': 'https://schema.org';
  '@type': 'FAQPage';
  mainEntity: {
    '@type': 'Question';
    name: string;
    acceptedAnswer: { '@type': 'Answer'; text: string };
  }[];
}

/**
 * Build the `FAQPage` block, or `null` when the article has no Q&A section.
 *
 * Nothing but `name` and `acceptedAnswer.text` is asserted. An `Answer.url`
 * pointing at the question's own in-page anchor was the obvious extra and is
 * deliberately absent: heading ids are handed out by a document-order assigner
 * over the MERGED doc, so a dynamic block injected above the body shifts them,
 * and an anchor that no longer resolves is a worse claim than no anchor.
 */
export function buildFaqPageJsonLd({ content }: { content: unknown }): FaqPageJsonLd | null {
  const entries = extractFaqEntries(content);
  if (entries.length < FAQ_MIN_QUESTIONS) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: entries.map((entry) => ({
      '@type': 'Question',
      name: entry.question,
      acceptedAnswer: { '@type': 'Answer', text: entry.answer },
    })),
  };
}
