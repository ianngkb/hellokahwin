/**
 * Is this media row a TEXT CARD — an image whose content is words?
 *
 * The owner's directive of 25 Aug 2026 is "no text card at all", cover or in
 * body. The style guide's test for a reviewer is: **if you could paste the
 * content as a markdown table and lose nothing, it is a text card.** This is
 * the machine form of the same question, and it lives here rather than inside
 * `scripts/audit-live-images.mts` so it can be tested — which is the whole
 * reason it moved.
 *
 * WHY IT CANNOT BE A PATTERN OVER THE SERVED URL. Ingest stores a figure's
 * `src` as the WebP derivative, `…/1787652677828-cover-borang-nikah/high.webp`,
 * so `like '%kad-tajuk%'` and `like '%.png'` both miss a card that is really
 * there. A card is only visible by resolving the `src` back to its `media` row
 * and reading the FILENAME the article file declared.
 *
 * THE RULE, stated so it can be argued with:
 *
 *     text card  ==  filename ends .png
 *                    AND filename !== basename(r2_key)
 *                    AND filename does not start with `S-`
 *
 * Clause 2 spares the legacy WordPress PNG photographs and screenshots: ingest
 * stamps every upload with `Date.now()`, so a file declared in an article ends
 * up with a filename different from its key's basename, while a WordPress
 * import carries the stamp *in* the filename and the two are equal.
 *
 * Clause 3 spares archival photographs that happen to be PNGs. `S-` is the
 * sourced-photograph convention — `images/S-name.ext` in an approved article
 * file is a photograph somebody looked at, licensed and credited.
 *
 * Clause 3 was described in the audit's header comment and NOT implemented,
 * from the day the comment was written. It cost nothing while the two 1899/1940s
 * songket weaving plates sat in a draft, and failed the ingest run the hour
 * they went live on 26 Aug 2026. Neither frame contains a word. An instrument
 * that fails on correct content is worse than no instrument, because the next
 * operator learns to read past its FAIL — and reading past the audit is exactly
 * the habit that let eight real cards sit on indexed pages for a day.
 */
export interface TextCardCandidate {
  /** The filename the approved article file declared, e.g. `S-name.png`. */
  filename: string;
  /** The R2 object key, e.g. `inspire/<slug>/<stamp>-<name>.png`. */
  r2Key: string;
}

const basename = (key: string) => key.split('/').pop() ?? key;

/** `images/S-name.ext` — the sourced-photograph convention, any container format. */
export function isSourcedPhotograph(m: Pick<TextCardCandidate, 'filename'>): boolean {
  return /^S-/.test(m.filename);
}

/** True when this media row is a typographic card rather than a photograph. */
export function isTextCard(m: TextCardCandidate): boolean {
  return /\.png$/i.test(m.filename) && m.filename !== basename(m.r2Key) && !isSourcedPhotograph(m);
}
