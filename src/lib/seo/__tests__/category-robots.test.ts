import { describe, it, expect } from 'vitest';
import {
  categoryRobots,
  ROBOTS_ON_DEADLINE_MISS,
  type CategoryRobotsFacts,
} from '../category-robots';

/**
 * RISK-07's regression suite. The six URLs below were served
 * `noindex, follow` while the sitemap advertised them; Google crawled all six
 * on 23 Aug 2026 and excluded all six.
 */
describe('categoryRobots — the six hubs RISK-07 is named after', () => {
  const THE_SIX = [
    'hiasan-dekorasi',
    'moden-kontemporari',
    'fotografi-videografi',
    'glamor-eksklusif',
    'minimalis-mewah',
    'pantai-santai',
  ];

  it.each(THE_SIX)('/artikel/%s — a child hub owning published articles is index,follow', () => {
    expect(categoryRobots({ view: 'child-hub', ownsPublishedArticles: true })).toEqual({
      index: true,
      follow: true,
    });
  });

  it('never returns index:false for a child hub that owns published articles', () => {
    const r = categoryRobots({ view: 'child-hub', ownsPublishedArticles: true });
    expect(r.index).toBe(true);
  });
});

describe('categoryRobots — the rest of the table', () => {
  const cases: Array<[string, CategoryRobotsFacts, { index: boolean; follow: boolean }]> = [
    [
      'child hub with no published articles of its own is an orphaned duplicate',
      { view: 'child-hub', ownsPublishedArticles: false },
      { index: false, follow: true },
    ],
    [
      'top-level hub with articles anywhere beneath it',
      { view: 'base-hub', subtreeArticleCount: 1 },
      { index: true, follow: true },
    ],
    [
      'empty pillar waiting for its first cluster',
      { view: 'base-hub', subtreeArticleCount: 0 },
      { index: false, follow: true },
    ],
    [
      '?sub= naming a slug that does not exist',
      { view: 'invalid-sub' },
      { index: false, follow: false },
    ],
    [
      '?sub= naming a real child that holds articles',
      { view: 'valid-sub', subtreeArticleCount: 4 },
      { index: true, follow: true },
    ],
    [
      '?sub= naming a real child that holds nothing yet',
      { view: 'valid-sub', subtreeArticleCount: 0 },
      { index: false, follow: true },
    ],
  ];

  it.each(cases)('%s', (_label, facts, expected) => {
    expect(categoryRobots(facts)).toEqual(expected);
  });
});

describe('the deadline fallback', () => {
  it('fails OPEN — a DB blip must never pin noindex on a hub with live article URLs', () => {
    expect(ROBOTS_ON_DEADLINE_MISS).toEqual({ index: true, follow: true });
  });
});
