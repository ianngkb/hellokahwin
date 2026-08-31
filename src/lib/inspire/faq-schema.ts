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
 * Does this article open a Q&A block with a `Soalan lazim` HEADING?
 *
 * Exported because two SEO-13 scripts needed to ask it and both first answered
 * it themselves, with `/soalan\s+lazim/i` over `JSON.stringify(content)`. That
 * predicate reported `bajet-kahwin` and `checklist-kahwin` as already carrying a
 * block, and the write script skipped them. Neither has one. Both quote the
 * Jabatan Agama Islam Selangor **soalan lazim page** as a source, in prose:
 *
 *   "mengikut soalan lazim rasmi Jabatan Agama Islam Selangor"
 *
 * A string test over serialised JSON cannot tell a heading from a citation, and
 * it silently dropped two articles from a coverage job whose entire deliverable
 * is a coverage count. Ask the document, not the string — and ask it here,
 * once, rather than in each caller.
 */
export function hasFaqBlockHeading(content: unknown): boolean {
  return flattenBlocks(content).some((b) => b.level > 0 && FAQ_BLOCK_HEADING.test(b.text));
}

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
 * How much of an article has to be question-shaped before the WHOLE body counts
 * as the Q&A section — see `extractFaqEntries`.
 *
 * Three quarters, and the number is picked to be well clear of the only article
 * that meets it. `apa-itu-mas-kahwin` is 7 questions out of 8 headings (0.875);
 * the next-densest article in the 86-article corpus is 0. There is no article
 * anywhere near the line, which is the state a threshold should be in.
 */
const WHOLE_BODY_QUESTION_SHARE = 0.75;

/**
 * The question/answer pairs of an article's Soalan lazim block, in order.
 * Empty for an article that has neither a block nor a question-shaped body.
 *
 * The block runs from its heading to the next heading at or above the same
 * level. Inside it, a heading exactly one level deeper opens a question;
 * anything deeper than that is sub-structure inside an answer and contributes
 * no text, because a heading is not prose we can quote as an answer.
 *
 * ── WHEN THERE IS NO BLOCK ────────────────────────────────────────────────
 * SEO-13 (01 September 2026) found one live article that IS an FAQ and was
 * emitting nothing: `/artikel/hantaran-mas-kahwin/apa-itu-mas-kahwin`, whose
 * entire body is eight `<h3>` headings, seven of them questions, each followed
 * by its answer. It has no `Soalan lazim` heading because it does not need one
 * — there is no non-FAQ part to separate the block from.
 *
 * So when no block exists, the body itself is considered, and ONLY on a test
 * strict enough that a normal article cannot pass it by accident: at the
 * article's shallowest heading level, at least `WHOLE_BODY_QUESTION_SHARE` of
 * the headings must be phrased as questions. A guide with two question-shaped
 * H2s among fourteen is not an FAQ and does not qualify; a page that is nothing
 * but questions is one.
 *
 * The share is measured at the SHALLOWEST level rather than over all headings
 * because deeper headings are sub-structure. Counting them would let a single
 * long sub-divided answer sink an article that genuinely is a Q&A, and would let
 * an article with many question-shaped H4s inside one ordinary H2 float up.
 */
export function extractFaqEntries(content: unknown): FaqEntry[] {
  const blocks = flattenBlocks(content);
  const start = blocks.findIndex((b) => b.level > 0 && FAQ_BLOCK_HEADING.test(b.text));
  if (start === -1) return extractWholeBodyFaq(blocks);

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

/**
 * An article whose whole body is a Q&A, read as one block. Empty unless the
 * shallowest heading level is overwhelmingly question-shaped.
 *
 * Headings at the shallowest level that are NOT questions still close the
 * previous answer — exactly as inside a real block — so `Beza mas kahwin,
 * hantaran dan duit hantaran` cannot have its prose attributed to the question
 * above it. Deeper headings contribute no text.
 */
function extractWholeBodyFaq(blocks: { level: number; text: string }[]): FaqEntry[] {
  const headings = blocks.filter((b) => b.level > 0);
  if (headings.length === 0) return [];

  const topLevel = Math.min(...headings.map((b) => b.level));
  const top = headings.filter((b) => b.level === topLevel);
  const questions = top.filter((b) => QUESTION.test(b.text));

  if (questions.length < FAQ_MIN_QUESTIONS) return [];
  if (questions.length / top.length < WHOLE_BODY_QUESTION_SHARE) return [];

  const entries: FaqEntry[] = [];
  let question: string | null = null;
  let answer: string[] = [];

  const flush = () => {
    if (question && answer.length > 0) entries.push({ question, answer: answer.join(' ') });
    question = null;
    answer = [];
  };

  for (const block of blocks) {
    if (block.level === topLevel) {
      flush();
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
