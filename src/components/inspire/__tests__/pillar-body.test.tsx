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
import { PillarBody } from '../pillar-body';
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

const MIXED: PillarView = {
  totalArticles: 1,
  unclustered: [article(9, 'Lain-lain satu')],
  clusters: [
    cluster('c1', 'Jodoh & taaruf', 'jodoh dan taaruf', [article(1, 'Taaruf maksud')]),
    cluster('c2', 'Merisik', 'merisik', []),
  ],
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

  it('sits the promise line on a link row rhythm and closes it with a hair rule', () => {
    expect(html).toMatch(
      /<p class="s-meta" style="padding:13px 0;border-bottom:1px solid var\(--hair\)">Artikel untuk merisik akan datang tidak lama lagi\.<\/p>/,
    );
  });

  it('keeps the empty cluster rendered, and below the populated one', () => {
    expect(html.indexOf('Jodoh &amp; taaruf')).toBeLessThan(html.indexOf('Merisik'));
  });

  it('renders no images — pillar hubs are text-only, UI-05', () => {
    expect(html).not.toContain('<img');
  });
});
