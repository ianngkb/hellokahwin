import { describe, it, expect, vi } from 'vitest';
import { bodySectionHeadings, countBodySections } from '../body-sections';

vi.mock('server-only', () => ({}));
let rows: unknown[] = [];
vi.mock('@/lib/db/drizzle', () => {
  const chain = { from: () => chain, where: () => chain, limit: async () => rows };
  return { db: { select: () => chain } };
});
const { loadCurrentSectionHeadings } = await import('../article-current-headings');

const h = (level: unknown, text: string) => ({
  type: 'heading',
  attrs: { level },
  content: [{ type: 'text', text }],
});

const doc = {
  type: 'doc',
  content: [
    { type: 'paragraph', content: [{ type: 'text', text: 'Intro' }] },
    h(2, 'Kos   majlis'),
    h(4, 'Too deep — not a section'),
    // Editor-only wrapper: unwrapped like the renderer does.
    { type: 'sectionBlock', content: [h(3, 'Senarai semak')] },
    // A level the renderer does not list renders as h2: a section.
    h(1, 'Import level one'),
    // Nested in a list: not a direct child of a prose part.
    { type: 'bulletList', content: [{ type: 'listItem', content: [h(2, 'Nested')] }] },
  ],
};

describe('bodySectionHeadings', () => {
  it('returns top-level h2/h3 (as rendered) in order, whitespace-collapsed', () => {
    expect(bodySectionHeadings(doc)).toEqual(['Kos majlis', 'Senarai semak', 'Import level one']);
    expect(countBodySections(doc)).toBe(3);
  });

  it('is empty for missing or malformed content', () => {
    expect(bodySectionHeadings(null)).toEqual([]);
    expect(bodySectionHeadings({ type: 'doc' })).toEqual([]);
    expect(bodySectionHeadings('x')).toEqual([]);
  });
});

describe('loadCurrentSectionHeadings', () => {
  it('reads the stored article content by slug', async () => {
    rows = [{ content: doc }];
    expect(await loadCurrentSectionHeadings('hantaran')).toHaveLength(3);
  });

  it('an unknown or empty slug has no headings', async () => {
    rows = [];
    expect(await loadCurrentSectionHeadings('nope')).toEqual([]);
    expect(await loadCurrentSectionHeadings('')).toEqual([]);
  });
});
