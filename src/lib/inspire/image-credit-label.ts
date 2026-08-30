/**
 * ONE image-credit label, ONE casing, sitewide — RIGHTS-01, 31 Aug 2026.
 *
 * THE DEFECT THIS CLOSES. Measured across all 86 published article URLs on
 * 31 Aug 2026, the credit label in `<figcaption>` read:
 *
 *     Kredit:  63     source:  48     SOURCE:  37
 *     Source:  21     sOURCE:   4     image:    1
 *
 * — one canonical Malay label on the articles written under the current style
 * guide, and 111 English labels in four casings on the older imported ones,
 * including a `sOURCE:` typo rendering live. A second axis nobody had recorded:
 * the character after the colon is `U+0020` on some credits and `U+00A0` on
 * others, so a fix aimed only at casing would have left two invisible variants.
 *
 * THE LABEL IS `Kredit:` AND THAT WAS NOT MINE TO CHOOSE.
 *
 * Style guide §13.1 (`docs/plans/aug-23-2026-session-01/aug-23-2026-style-guide.md`)
 * already fixes the on-page credit format as `Kredit: {Nama pemilik}`, under the
 * owner-level rule that every image is credited to its original source. The 63
 * conforming credits above are that rule already working. This module makes the
 * other 111 match it; it does not introduce a label.
 *
 * WHY NOT `Sumber:`, WHICH IS WHAT THE PUBLISHER EVIDENCE POINTED AT. Sinar
 * Harian captions with `Foto:` and Astro Awani credits images `Sumber: FB
 * Maybank Marathon`, so `Sumber:` was the defensible choice on outside evidence
 * alone — and it would have been wrong here. `Sumber:` is ALREADY IN USE on this
 * site for something else: 87 occurrences in article body prose, citing the
 * authority behind a FACT — `Sumber: seksyen 2 Enakmen Undang-Undang Keluarga
 * Islam (Negeri Pulau Pinang) 2004`, `Sumber: senarai kadar sewaan Dewan
 * Banquet, MBPJ 2024`. Using the same word for "where this photograph came
 * from" and "where this legal rate came from" would have made the two
 * indistinguishable to a reader. `Kredit:` keeps them apart, which is very
 * likely why the style guide picked it.
 *
 * WHAT THIS DELIBERATELY LEAVES ALONE, all three verified against the live site:
 *
 *  - **Descriptive captions.** 171 figcaptions carry a teaching caption, not a
 *    credit — *"Setiap barang duduk atas dulangnya sendiri, dan itulah sebabnya
 *    bilangan dulang dikira berasingan…"*. `normaliseCaptionLabel` returns those
 *    untouched. An earlier draft of this module prefixed every caption
 *    unconditionally and would have shipped `Kredit:` in front of all 171.
 *  - **`Grafik:`** — style guide §13.1 makes it a permitted specialisation of
 *    `Kredit:` for our own original graphics. It is not in the strip list.
 *  - **`Sumber:` and `Jurugambar:`** — live conventions for OTHER things.
 *    `Jurugambar:` is a line inside the body's "Kredit Vendor" block on the 17
 *    real-wedding articles. Neither is stripped, so neither can be silently
 *    converted into an image credit.
 *
 * WHY A FUNCTION AND NOT A DATA MIGRATION. The label is presentation, and
 * normalising at render is the only form that cannot drift: an editor typing
 * `source:` tomorrow still gets `Kredit:` on the page. A one-off `UPDATE` would
 * have fixed the pages that exist and none written next week. Measured
 * precondition: on the live page the RSC flight payload mirrors the visible
 * markup 20-for-20 with an identical variant distribution, so the payload is
 * post-render and normalising at render clears both.
 */

/**
 * The one label. Fixed by style guide §13.1 — an editorial decision, not a
 * coding one. Changing it means changing the style guide first.
 */
export const CREDIT_LABEL = 'Kredit';

/**
 * Label words replaced by `CREDIT_LABEL`, matched case-insensitively.
 *
 * Only an UNAMBIGUOUS image-credit label appears here. `sumber`, `jurugambar`
 * and `grafik` are deliberately absent — each is a live convention for
 * something that is not an image credit, and stripping them would silently
 * rewrite a fact citation, a vendor block line, or a permitted graphic credit.
 *
 * `kredit` is present so an already-correct credit is recognised rather than
 * double-prefixed.
 *
 * Only a SINGLE leading token followed by a colon counts, so a genuine credit
 * that opens with one of these words survives: `Foto Ali Studio` has no colon,
 * and `Image Studio: Kuala Lumpur` is two tokens.
 */
const KNOWN_LABEL_WORDS = new Set([
  'source',
  'sources',
  'credit',
  'credits',
  'kredit',
  'photo',
  'photos',
  'foto',
  'image',
  'images',
  'imej',
  'gambar',
  'picture',
  'pic',
  'courtesy',
  'photography',
  'photographer',
]);

/** `Word:` at the start of a caption, capturing the word. */
const LEADING_LABEL = /^([\p{L}]+)\s*:\s*/u;

/** Collapse every whitespace run — U+00A0 included — to one ordinary space. */
function tidy(raw: string): string {
  return raw.replace(/\s+/g, ' ').trim();
}

/**
 * Normalise a DEDICATED credit field — the cover image's `media.credit`, which
 * is only ever a credit — to `Kredit: <owner>`.
 *
 * Adds the label when the stored value is a bare name, and replaces any
 * recognised label the editor typed. Returns `null` for absent, blank or
 * label-only input: a bare `Kredit:` with nothing after it claims attribution
 * where there is none, so callers render nothing.
 */
export function formatCreditLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = tidy(raw);
  if (!text) return null;

  const stripped = text
    .replace(LEADING_LABEL, (whole, word: string) =>
      KNOWN_LABEL_WORDS.has(word.toLowerCase()) ? '' : whole,
    )
    .trim();

  return stripped ? `${CREDIT_LABEL}: ${stripped}` : null;
}

/**
 * Normalise an ARTICLE FIGCAPTION, which may be a credit OR a descriptive
 * caption.
 *
 * Relabels only when the caption already opens with a recognised image-credit
 * label. Anything else — a teaching caption, a `Grafik:` credit, a `Sumber:`
 * fact citation — is returned exactly as written. This asymmetry with
 * `formatCreditLabel` is the whole point: on this site a figcaption is not
 * necessarily a credit, and 171 of them are not.
 */
export function normaliseCaptionLabel(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const text = tidy(raw);
  if (!text) return null;

  const match = LEADING_LABEL.exec(text);
  if (!match || !KNOWN_LABEL_WORDS.has(match[1].toLowerCase())) return text;

  const owner = text.slice(match[0].length).trim();
  // A caption that is nothing but a label credits nobody; drop it rather than
  // render `Kredit:` over a photograph with no name after it.
  return owner ? `${CREDIT_LABEL}: ${owner}` : null;
}

/**
 * Does this string carry the canonical label, exactly?
 *
 * Exported so the audit script and the renderer cannot disagree about what
 * "correct" looks like.
 */
export function hasCanonicalCreditLabel(text: string): boolean {
  return new RegExp(`^${CREDIT_LABEL}: \\S`).test(text);
}

/**
 * Relabel credits that were imported as ordinary body PARAGRAPHS rather than
 * figure captions.
 *
 * Four credits on `/artikel/hantaran-mas-kahwin/hantaran-tunang` render as
 * `<p>source: kek hantaran kahwin</p>` immediately after an image, never
 * reaching the figcaption path. They survived a fix that only touched captions,
 * and the local sweep caught them at 4 remaining against 174 correct.
 *
 * Deliberately narrow, because this operates on arbitrary article HTML: it
 * rewrites a `<p>` ONLY when the paragraph's entire content is a recognised
 * label, a colon and a name, with no nested markup. A paragraph that merely
 * begins with one of those words is left alone, and so is the body's
 * `Lokasi:` / `Jurugambar:` vendor block, whose labels are not in the strip
 * list at all.
 */
export function normaliseCreditParagraphs(html: string): string {
  return html.replace(
    /<p>([\p{L}]+)\s*:\s*([^<>]+?)\s*<\/p>/gu,
    (whole, word: string, owner: string) =>
      KNOWN_LABEL_WORDS.has(word.toLowerCase()) && owner
        ? `<p>${CREDIT_LABEL}: ${owner.replace(/\s+/g, ' ')}</p>`
        : whole,
  );
}
