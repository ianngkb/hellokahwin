import { nodeText } from './heading-anchors';

/**
 * The article's own source citations, for the `Sumber` block of the article
 * rail (DES-03 §5.1).
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY THIS READS THE BODY INSTEAD OF A COLUMN, AND WHY THAT IS THE HONEST FORM
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * DES-03 §5.1 draws a `Sumber` block in the rail carrying three lines — "Warta
 * Kerajaan Negeri Selangor, 4 Februari 2010", "Kenyataan JAWI, 14 Ogos 2023",
 * "Enakmen Undang-Undang Keluarga Islam negeri". There is no column on
 * `articles` that holds those, and there never has been: measured 01 Sep 2026,
 * `src/lib/db/schema/articles.ts` has no `sources`, `rujukan` or `citations`
 * field of any kind.
 *
 * So the rail could either invent the data or read what the articles already
 * say. On a site whose entire claim is that its numbers carry sources, a
 * plausible fabrication is the worst outcome available and the hardest to
 * detect later — so this reads what is already written, and renders NOTHING
 * when an article has written nothing.
 *
 * `Sumber:` is this site's established fact-citation convention and it is
 * already load-bearing: `src/lib/inspire/image-credit-label.ts` refuses to
 * rewrite it precisely because it cites a FACT and not a photograph, and its
 * test file records 87 occurrences in body content. This function surfaces
 * those citations in the rail; it does not create them.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * THE CORPUS — RE-MEASURE IT, DO NOT READ IT HERE
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * `pnpm ui:sources` (`scripts/audit-article-sources.mjs`) is where this number
 * lives now. It moved out of this comment because the comment was already
 * wrong within a day of being written.
 *
 * On 01 Sep 2026 this file said `Sumber:` appears on **34 of 86** articles and
 * 52 carry none. On 02 Sep 2026 the corpus was **92**, and the figure that
 * actually matters — how many articles render a `Sumber` block in the rail —
 * was **13 of 92**, with 79 rendering none. Neither reading was wrong when it
 * was taken. A corpus figure in prose cannot be re-measured by the person
 * reading it, and this one had already sent one census looking for the wrong
 * thing.
 *
 * The shape of the fact is stable and is what this file is built around: MOST
 * articles carry no liftable citation, so on most articles the rail renders
 * Rekod and the contents and no `Sumber` heading, because there is nothing
 * true to put under one. An empty `Sumber` heading would assert that an
 * article is sourced when it is not, which is worse than the absence.
 * `scripts/ui-layout-gate.mjs` check 14 (`sumber-empty`) fails a build that
 * prints one, against the committed fixture `2026-09-02-rail/
 * sourced-sumber-empty.html`.
 *
 * ⚠ AND THE RULE BELOW SEES HALF THE SOURCED CORPUS. Measured 02 Sep 2026,
 * 13 articles carry a standalone `Sumber:` paragraph — which is what this
 * function lifts — and a DISJOINT 13 carry an `<h2 id="sumber">Sumber</h2>`
 * section in the body with a full reference list under it and NOTHING in the
 * rail. No article uses both conventions. So 26 of 92 articles are sourced and
 * the rail speaks for exactly half of them. Widening this function to harvest
 * that second convention is a design decision with a real cost — those entries
 * are full bibliographic references and a rail child lays out in 268px — and it
 * changes what "where sources exist" means in the CEO ruling, so it is raised
 * as a finding by UI-19 rather than taken here. `pnpm ui:sources` prints the
 * 13 slugs.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * WHY ONLY PARAGRAPHS THAT *BEGIN* WITH `Sumber:`
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * The convention appears in two shapes on production:
 *
 *   1. A whole paragraph that IS the citation —
 *      `<p>Sumber: Warta Kerajaan Negeri Selangor, Jil. 63 No. 3, 4hb
 *      Februari 2010, Sel. P.U. 3</p>`
 *   2. A citation appended to the end of a sentence of running prose —
 *      `…berbeza dengan mahar yang wajib diberi kepada isteri. Sumber:
 *      e-musykil 2019. Nikah yang sah tidak bergantung…`
 *
 * Only shape 1 is taken. A writer who put the citation on its own line meant
 * it as a citation; lifting shape 2 out of a sentence would drag the sentence's
 * remaining clause into the rail with it, and there is no reliable boundary to
 * cut at — the citation is followed by more prose in the same paragraph, as the
 * example above shows. Both counts are exposed (`standalone` and `inline`) so
 * the choice is visible in a measurement rather than hidden in a rule.
 */

export interface ArticleSource {
  /** The citation with its `Sumber:` prefix removed and trailing stop trimmed. */
  text: string;
}

export interface ArticleSourceCensus {
  sources: ArticleSource[];
  /** Paragraphs that ARE a citation. These become the rail's `Sumber` block. */
  standalone: number;
  /** Citations embedded mid-paragraph. Counted, deliberately not lifted. */
  inline: number;
}

/** `Sumber:` at the very start of a paragraph's text. */
const LEADING_SUMBER = /^\s*Sumber\s*:\s*/i;
/** `Sumber:` anywhere. Used only to count what is deliberately left behind. */
const ANY_SUMBER = /Sumber\s*:/gi;

/**
 * Length ceiling on a lifted citation. A citation is a reference, not a
 * paragraph; anything past this is prose that happens to open with the word,
 * and putting it in a 268px rail column would produce a wall of text where a
 * source line belongs. Set from the corpus: measured 01 Sep 2026 the longest
 * standalone citation on the site is 190 characters ("Sumber: Ahmad Haziq
 * Haikal Kamal dan Miszairi Sitiris, Universiti Islam Antarabangsa
 * Malaysia, Kanun 34(1), 2022, halaman 141 hingga 166, …"), so 320 clears
 * every real one with room and still refuses a paragraph.
 */
const MAX_SOURCE_CHARS = 320;

/**
 * Walk Tiptap JSON in document order and return the article's standalone
 * source citations, de-duplicated, in the order they appear.
 *
 * Depth-first over `content`, exactly like `extractHeadings`, so editor-only
 * wrappers (`sectionBlock`) need no special case and a citation inside a
 * blockquote — which is where several of them live — is still found.
 */
export function extractSources(content: unknown): ArticleSourceCensus {
  const sources: ArticleSource[] = [];
  const seen = new Set<string>();
  let standalone = 0;
  let inline = 0;

  function walk(node: unknown): void {
    if (!node || typeof node !== 'object') return;
    const n = node as { type?: string; content?: unknown[] };

    if (n.type === 'paragraph') {
      const text = nodeText(n).trim();
      if (LEADING_SUMBER.test(text)) {
        standalone += 1;
        const body = text.replace(LEADING_SUMBER, '').replace(/\s+/g, ' ').trim();
        // A trailing full stop reads as punctuation in a sentence and as noise
        // in a list of references. Other terminators are left alone.
        const clean = body.replace(/\.\s*$/, '');
        const key = clean.toLowerCase();
        if (clean && clean.length <= MAX_SOURCE_CHARS && !seen.has(key)) {
          seen.add(key);
          sources.push({ text: clean });
        }
      } else {
        inline += (text.match(ANY_SUMBER) ?? []).length;
      }
      // A paragraph's children are text and inline marks. Nothing below it
      // can be another paragraph.
      return;
    }

    if (Array.isArray(n.content)) n.content.forEach(walk);
  }

  walk(content);
  return { sources, standalone, inline };
}
