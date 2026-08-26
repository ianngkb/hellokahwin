import type { ArticleHeading } from './heading-anchors';

/**
 * `ItemList` + `Place` JSON-LD for listicle-shaped articles.
 *
 * The point is entity matching. An article whose `<h2>`s name ten specific
 * wedding halls currently offers Google one entity — the article — so a
 * search for one hall by name matches nothing on the page and Google shows a
 * generic listicle title. `ItemList` names each item and points at its own
 * anchor; `Place` says the named item is a physical venue.
 *
 * Both claims are derived from the article's own headings, never hand-written
 * per article, and BOTH are deliberately conservative: a false `Place` is
 * worse than no `Place`, because structured data that misdescribes the page is
 * how a site loses rich-result eligibility rather than gains it.
 */

/** How many numbered `<h2>`s an article needs before it counts as a list. */
export const LISTICLE_MIN_ITEMS = 4;

/** A heading that opens a numbered list entry: `1. `, `10) `, `3: `. */
const NUMBERED_HEADING = /^\s*(\d{1,3})\s*[.)\]:]\s+\S/;

/**
 * Venue nouns. An item can only be a `Place` if its heading actually says it
 * is a physical venue — this is what keeps a tips listicle ("1. Rancang Bajet
 * Anda") from being described as a list of buildings.
 */
const VENUE_PREFIX = /^(dewan|pusat komuniti|balai|kompleks|auditorium|padang)\b/i;

/**
 * Localities we are willing to assert. Longest first so "Petaling Jaya" wins
 * over a bare "Jaya" and "Taman Keramat" over "Keramat".
 *
 * This list is the second half of the `Place` test and the reason it is safe.
 * A heading naming a KIND of hall — "Dewan Komuniti Moden", "Dewan Warisan
 * atau Bangunan Bersejarah" — contains no locality, so it is listed by name
 * and never claimed to be a place. A heading naming a REAL hall carries the
 * locality that makes it findable: "Dewan Seri Siantan, Putrajaya".
 *
 * Only `addressLocality` and `addressCountry` are ever emitted. The state a
 * locality sits in is not asserted, because several of these names exist in
 * more than one state and a wrong `addressRegion` would be a claim the
 * article never made.
 */
const LOCALITIES = [
  // Federal Territories and the Klang Valley localities this corpus names.
  'Kuala Lumpur',
  'Petaling Jaya',
  'Subang Jaya',
  'Shah Alam',
  'Bukit Jalil',
  'Taman Keramat',
  'Wangsa Maju',
  'Bandar Tun Razak',
  'Seri Kembangan',
  'Bukit Jelutong',
  'Kota Damansara',
  'Sungai Buloh',
  'Putrajaya',
  'Cyberjaya',
  'Setiawangsa',
  'Titiwangsa',
  'Brickfields',
  'Damansara',
  'Selayang',
  'Semenyih',
  'Puchong',
  'Keramat',
  'Ampang',
  'Cheras',
  'Gombak',
  'Sentul',
  'Kepong',
  'Subang',
  'Kajang',
  'Bangi',
  'Klang',
  'Rawang',
  'Sepang',
  'Serdang',
  'Pandan',
  // States and remaining Federal Territories.
  'Negeri Sembilan',
  'Pulau Pinang',
  'Terengganu',
  'Selangor',
  'Kelantan',
  'Sarawak',
  'Melaka',
  'Pahang',
  'Perlis',
  'Labuan',
  'Kedah',
  'Johor',
  'Perak',
  'Sabah',
] as const;

export interface ListicleItem {
  position: number;
  /** Heading text with its list ordinal removed. */
  name: string;
  /** Absolute URL of the item's own in-page anchor. */
  url: string;
  /** Set only when the heading names a venue AND a locality we can assert. */
  locality: string | null;
}

/**
 * Whole-word, case-insensitive locality lookup against the heading text.
 * Returns the canonical spelling from `LOCALITIES`, not the article's casing.
 */
export function findLocality(text: string): string | null {
  for (const locality of LOCALITIES) {
    const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])${locality}($|[^\\p{L}\\p{N}])`, 'iu');
    if (pattern.test(text)) return locality;
  }
  return null;
}

/**
 * The numbered `<h2>`s of an article, in order, each paired with the anchor
 * the renderer gave it. `<h3>`s are sub-points inside an entry, not entries.
 */
export function extractListicleItems(headings: ArticleHeading[], canonicalUrl: string) {
  return headings
    .filter((h) => h.level === 2 && NUMBERED_HEADING.test(h.text))
    .map((h, index): ListicleItem => {
      const isVenue = VENUE_PREFIX.test(h.label);
      return {
        position: index + 1,
        name: h.label,
        url: `${canonicalUrl}#${h.id}`,
        locality: isVenue ? findLocality(h.label) : null,
      };
    });
}

export interface ItemListJsonLd {
  '@context': 'https://schema.org';
  '@type': 'ItemList';
  name: string;
  itemListOrder: 'https://schema.org/ItemListOrderAscending';
  numberOfItems: number;
  itemListElement: unknown[];
}

/**
 * Build the `ItemList` block, or `null` when the article is not a list.
 *
 * Every entry gets `name` + `url` (its anchor). An entry that passed both
 * halves of the venue test also gets an `item` of type `Place` — the whole
 * page is the list, so Google's all-in-one-page shape (a nested entity per
 * `ListItem`) is the correct one rather than bare summary URLs.
 */
export function buildItemListJsonLd({
  title,
  canonicalUrl,
  headings,
}: {
  title: string;
  canonicalUrl: string;
  headings: ArticleHeading[];
}): ItemListJsonLd | null {
  const items = extractListicleItems(headings, canonicalUrl);
  if (items.length < LISTICLE_MIN_ITEMS) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: title,
    itemListOrder: 'https://schema.org/ItemListOrderAscending',
    numberOfItems: items.length,
    itemListElement: items.map((item) => ({
      '@type': 'ListItem',
      position: item.position,
      name: item.name,
      url: item.url,
      ...(item.locality
        ? {
            item: {
              '@type': 'Place',
              name: item.name,
              url: item.url,
              address: {
                '@type': 'PostalAddress',
                addressLocality: item.locality,
                addressCountry: 'MY',
              },
            },
          }
        : {}),
    })),
  };
}
