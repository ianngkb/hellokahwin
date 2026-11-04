// Bug found by the first run of the production smoke suite (2026-11-04):
// every load of https://hellokahwin.com/ threw React error #418 (hydration
// mismatch). The lead story is one big <Link> to the article, and the cover
// credit — when it has a source URL — was a second <a> INSIDE it. A link
// inside a link is invalid HTML: the browser's parser closes the outer <a>
// early, so the DOM React hydrates no longer matches the tree it rendered.
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { HomeHero, type HomeHeroItem } from '../home-hero';

const hero: HomeHeroItem = {
  slug: 'doa-keluarga-bahagia',
  title: 'Doa keluarga bahagia',
  excerpt: 'Ayat 74 Surah al-Furqan.',
  categorySlug: 'ucapan-doa',
  categoryName: 'Ucapan, Doa & Adab Majlis',
  coverImageLqip: null,
  coverCredit: 'Kredit: mohd hasan / Pexels',
  coverCreditUrl: 'https://www.pexels.com/photo/portrait-of-newlywed-couple-15430952/',
};

describe('HomeHero', () => {
  afterEach(cleanup);

  it('never nests the credit link inside the story link', () => {
    const { container } = render(<HomeHero hero={hero} heroCrops={null} />);
    expect(container.querySelectorAll('a a')).toHaveLength(0);
  });

  it('still links the headline to the article and the credit to its source', () => {
    const { container, getByText } = render(<HomeHero hero={hero} heroCrops={null} />);
    const story = container.querySelector('h1')!.closest('a');
    expect(story?.getAttribute('href')).toBe('/artikel/ucapan-doa/doa-keluarga-bahagia');
    const credit = getByText('Kredit: mohd hasan / Pexels').closest('a');
    expect(credit?.getAttribute('href')).toBe(hero.coverCreditUrl);
    expect(credit?.getAttribute('rel')).toBe('noopener noreferrer');
    expect(credit?.closest('article')).not.toBeNull();
  });

  it('renders a credit without a URL as plain text', () => {
    const { getByText } = render(
      <HomeHero hero={{ ...hero, coverCreditUrl: null }} heroCrops={null} />,
    );
    expect(getByText('Kredit: mohd hasan / Pexels').closest('a')).toBeNull();
  });
});
