import { afterEach, describe, it, expect } from 'vitest';
import { cleanup, render, screen, within } from '@testing-library/react';
import { SeriesBox } from '../series-box';
import { buildSeriesBox } from '@/lib/inspire/series-box';

afterEach(cleanup);

const link = (seriesEnabled: boolean) => ({
  slug: 'mas-kahwin',
  anchor: 'mas kahwin',
  cluster: {
    anchor: 'mas kahwin ikut negeri',
    seriesEnabled,
    seriesDescription: 'Kadar terkini setiap negeri.',
  },
});
const current = {
  title: 'Mas kahwin Perak',
  slug: 'perak',
  publishedAt: new Date('2026-11-05T00:00:00Z'),
};
const siblings = [
  {
    title: 'Mas kahwin Johor',
    slug: 'johor',
    categorySlug: 'mas-kahwin',
    publishedAt: new Date('2026-11-09T00:00:00Z'),
  },
  {
    title: 'Mas kahwin Kedah',
    slug: 'kedah',
    categorySlug: 'mas-kahwin',
    publishedAt: new Date('2026-11-01T00:00:00Z'),
  },
];

describe('<SeriesBox>', () => {
  it('renders nothing when the cluster has the box switched off', () => {
    const { container } = render(
      <SeriesBox box={buildSeriesBox(link(false), current, siblings)} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders nothing when there are no other live articles', () => {
    const { container } = render(<SeriesBox box={buildSeriesBox(link(true), current, [])} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders the cluster phrase, description, sibling links and a pillar link', () => {
    render(<SeriesBox box={buildSeriesBox(link(true), current, siblings)} />);
    const nav = screen.getByRole('navigation', { name: 'mas kahwin ikut negeri' });
    expect(within(nav).getByText('Dalam siri ini')).toBeInTheDocument();
    expect(within(nav).getByText('Kadar terkini setiap negeri.')).toBeInTheDocument();
    expect(within(nav).getByRole('link', { name: 'Mas kahwin Johor' })).toHaveAttribute(
      'href',
      '/artikel/mas-kahwin/johor',
    );
    expect(
      within(nav).getByRole('link', { name: 'Lihat semua panduan mas kahwin' }),
    ).toHaveAttribute('href', '/artikel/mas-kahwin');
  });

  it('marks the current article without linking it, in date order', () => {
    render(<SeriesBox box={buildSeriesBox(link(true), current, siblings)} />);
    const items = screen.getAllByRole('listitem');
    expect(items.map((li) => li.textContent)).toEqual([
      'Mas kahwin Johor',
      'Mas kahwin Perak(sedang dibaca)',
      'Mas kahwin Kedah',
    ]);
    expect(items[1]).toHaveAttribute('aria-current', 'page');
    expect(within(items[1]).queryByRole('link')).toBeNull();
  });
});
