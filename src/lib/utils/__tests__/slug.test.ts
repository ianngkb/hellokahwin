import { beforeEach, describe, expect, it, vi } from 'vitest';
import { generateSlug } from '../slug';

// generateListingSlug lazy-imports the place inventory; mock it so no DB is
// touched and the reserved set is deterministic.
const getDerivedPlaces = vi.fn();
vi.mock('@/lib/seo/place-page-data', () => ({
  getDerivedPlaces: () => getDerivedPlaces(),
}));

beforeEach(() => {
  getDerivedPlaces.mockReset();
  getDerivedPlaces.mockResolvedValue({
    places: {
      penang: { slug: 'penang' },
      'kuala-lumpur': { slug: 'kuala-lumpur' },
    },
    totalLiveVenues: 2,
    excludedListingSlugs: [],
  });
});

describe('generateSlug', () => {
  it('slugifies names', () => {
    expect(generateSlug('Forest Valley Hall')).toBe('forest-valley-hall');
    expect(generateSlug('  Rowan & Parsley!  ')).toBe('rowan-parsley');
  });
});

