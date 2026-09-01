/**
 * UI-05 — the three pillar-hub states, asserted on rendered markup.
 *
 * The empty-pillar state (P6) is the reason this file exists: it cannot be
 * reproduced on production without emptying a live category, and it is also
 * the shape `renderPillarPage` renders when `getPillarView` fails or blows
 * its 3s deadline. It gets a render test instead of a live check.
 *
 * `PillarBody` is a server component with no async work and no data access,
 * so it renders under `renderToStaticMarkup` exactly as it does in the route.
 */
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { PillarBody, emptyClusterCopy } from '../pillar-body';
import type { PillarView } from '@/lib/inspire/pillar-queries';

const article = (n: number, title: string) => ({
  id: `a${n}`,
  title,
  slug: `slug-${n}`,
  categorySlug: 'jodoh-taaruf-istikharah',
  publishedAt: null,
});

const cluster = (
  id: string,
  name: string,
  entityPhrase: string,
  articles: PillarView['unclustered'],
) => ({
  id,
  name,
  slug: id,
  entityPhrase,
  pillarCode: null,
  articles,
});

const EMPTY: PillarView = { clusters: [], unclustered: [], totalArticles: 0 };

// Two distinct articles are rendered (one clustered, one unclustered), so
// `totalArticles` is 2. It was 1 in this fixture until COPY-01 put the number
// on the page and the inconsistency started to matter.
const MIXED: PillarView = {
  totalArticles: 2,
  unclustered: [article(9, 'Lain-lain satu')],
  clusters: [
    cluster('c1', 'Jodoh & taaruf', 'jodoh dan taaruf', [article(1, 'Taaruf maksud')]),
    cluster('c2', 'Merisik', 'merisik', []),
  ],
};

/**
 * COPY-01's failing case, reproduced from production 02 Sept 2026.
 *
 * `/artikel/sebelum-nikah` carried an empty cluster "Merisik & meminang"
 * saying "Artikel untuk merisik akan datang tidak lama lagi." two headings
 * below a LIVE article titled "Cincin Tunang, Nikah dan Merisik". The sentence
 * was false on its own page. This fixture is that page, reduced.
 */
const SEBELUM_NIKAH: PillarView = {
  totalArticles: 4,
  unclustered: [],
  clusters: [
    cluster('c1', 'Jodoh, taaruf & istikharah jodoh', 'jodoh', [
      article(1, 'Doa jodoh'),
      article(2, 'Taaruf Maksud'),
    ]),
    cluster('c2', 'Cincin tunang, nikah & merisik', 'cincin tunang', [
      article(3, 'Cincin Tunang, Nikah dan Merisik: Tiga Cincin, Siapa Beri yang Mana'),
    ]),
    cluster('c3', 'Majlis pertunangan & doa', 'majlis pertunangan', [
      article(4, 'Doa Majlis Pertunangan'),
    ]),
    cluster('c4', 'Merisik & meminang', 'merisik', []),
    cluster('c5', 'Adat perkahwinan Melayu & mandi bunga', 'mandi bunga', []),
  ],
};

/** A pillar commissioned but not yet written: clusters exist, all empty. */
const ALL_CLUSTERS_EMPTY: PillarView = {
  totalArticles: 0,
  unclustered: [],
  clusters: [cluster('c1', 'Merisik & meminang', 'merisik', [])],
};

describe('PillarBody — empty pillar (UI-05 P6)', () => {
  const html = renderToStaticMarkup(<PillarBody view={EMPTY} intro="Satu perenggan intro." />);

  it('renders the designed empty state, not a blank div', () => {
    expect(html).toContain('s-empty');
    expect(html).toContain('Panduan ini masih kosong.');
    expect(html).toContain('Belum ada artikel di bawah topik ini.');
  });

  it('offers a crawlable way out to /artikel', () => {
    expect(html).toMatch(/<a[^>]+href="\/artikel"[^>]*>Semua artikel<\/a>/);
  });

  it('still renders the intro above it', () => {
    expect(html).toContain('Satu perenggan intro.');
  });

  it('renders no cluster sections and no images', () => {
    expect(html).not.toContain('aria-labelledby="cluster-');
    expect(html).not.toContain('<img');
  });
});

describe('PillarBody — populated and empty clusters (UI-05 P2/P3)', () => {
  const html = renderToStaticMarkup(<PillarBody view={MIXED} intro={null} />);

  it('styles every article link with .s-pillar-link, never the unmatched .t', () => {
    const links = html.match(/class="s-pillar-link"/g) ?? [];
    // one clustered article + one unclustered article
    expect(links).toHaveLength(2);
    expect(html).not.toMatch(/class="t"/);
  });

  it('gives an empty cluster the same opening rule and air as a populated one', () => {
    // Both cluster bodies carry the structural top rule; it is not conditional
    // on there being links.
    const rules = html.match(/border-top:1px solid var\(--rule\)/g) ?? [];
    expect(rules).toHaveLength(3); // c1, c2 (empty), and Lain-lain
    expect(html).toMatch(/margin-top:20px;border-top:1px solid var\(--rule\)/);
  });

  it('sits the empty-cluster line on a link row rhythm and closes it with a hair rule', () => {
    expect(html).toMatch(
      /<p class="s-meta" style="padding:13px 0;border-bottom:1px solid var\(--hair\)">Belum ada artikel di sini\. Halaman ini ada 2 artikel lain\.<\/p>/,
    );
  });

  it('keeps the empty cluster rendered, and below the populated one', () => {
    expect(html.indexOf('Jodoh &amp; taaruf')).toBeLessThan(html.indexOf('Merisik'));
  });

  it('renders no images — pillar hubs are text-only, UI-05', () => {
    expect(html).not.toContain('<img');
  });
});

describe('PillarBody — empty-cluster copy (COPY-01)', () => {
  const html = renderToStaticMarkup(<PillarBody view={SEBELUM_NIKAH} intro={null} />);

  // THE FAILING CASE. Run the fix against it, do not reason about it.
  it('no longer promises an arrival nobody can date', () => {
    expect(html).not.toContain('akan datang tidak lama lagi');
  });

  it('no longer claims we have nothing on a topic the same page publishes', () => {
    // The old line was "Artikel untuk merisik akan datang tidak lama lagi."
    // rendered on a page carrying a live merisik article. Neither the entity
    // phrase nor any topic-scoped claim appears in the empty-cluster row now.
    expect(html).toContain('Cincin Tunang, Nikah dan Merisik: Tiga Cincin, Siapa Beri yang Mana');
    expect(html).not.toMatch(/Artikel untuk\s/);
  });

  it('scopes the claim to the section and hands over what the page holds', () => {
    const rows = html.match(/Belum ada artikel di sini\. Halaman ini ada 4 artikel lain\./g) ?? [];
    expect(rows).toHaveLength(2); // the two empty clusters, and only those
  });

  it('is not DES-03 §7.2 C — the empty-CATEGORY copy never appears here', () => {
    expect(html).not.toContain('Kategori ini masih kosong.');
  });

  it('adds no link or button, so the one-row rhythm is unchanged', () => {
    const rowRule =
      /<p class="s-meta" style="padding:13px 0;border-bottom:1px solid var\(--hair\)">/g;
    expect(html.match(rowRule) ?? []).toHaveLength(2);
    expect(html).not.toContain('class="s-btn"');
  });
});

describe('emptyClusterCopy — the zero guard', () => {
  it('never prints "0 artikel lain"', () => {
    expect(emptyClusterCopy(0)).toBe('Belum ada artikel di sini.');
    const html = renderToStaticMarkup(<PillarBody view={ALL_CLUSTERS_EMPTY} intro={null} />);
    expect(html).toContain('Belum ada artikel di sini.');
    expect(html).not.toContain('0 artikel lain');
  });

  it('names the real count when there is one', () => {
    expect(emptyClusterCopy(1)).toBe('Belum ada artikel di sini. Halaman ini ada 1 artikel lain.');
    expect(emptyClusterCopy(38)).toBe(
      'Belum ada artikel di sini. Halaman ini ada 38 artikel lain.',
    );
  });
});
