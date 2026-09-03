import { describe, it, expect } from 'vitest';
import { buildTagDescription, TAG_ROBOTS } from '../tag-metadata';

// The real corpus: WP-imported tag names run from three characters to about
// forty, and the article count is a small integer that will not stay small.
const TAG_NAMES = [
  'kek',
  'nikah',
  'rukun nikah',
  'gubahan hantaran',
  'mas kahwin ikut negeri',
  'pelamin minimalis moden',
  'baju pengantin lelaki melayu tradisional',
];
const COUNTS = [0, 1, 2, 9, 12, 87, 250, 1000];

describe('buildTagDescription', () => {
  it('lands in [120, 155] for every tag name and count the corpus can produce', () => {
    for (const name of TAG_NAMES) {
      for (const count of COUNTS) {
        const description = buildTagDescription(name, count);
        expect(
          description.length,
          `${JSON.stringify(name)} x ${count} -> ${description.length} chars`,
        ).toBeGreaterThanOrEqual(120);
        expect(
          description.length,
          `${JSON.stringify(name)} x ${count} -> ${description.length} chars`,
        ).toBeLessThanOrEqual(155);
      }
    }
  });

  it('stays inside the ceiling even for an absurdly long tag name', () => {
    const description = buildTagDescription('a'.repeat(200), 3);
    expect(description.length).toBeLessThanOrEqual(155);
  });

  it('names the tag and the article count', () => {
    const description = buildTagDescription('rukun nikah', 12);
    expect(description).toContain('rukun nikah');
    expect(description).toContain('12');
  });

  it('keeps the tag name intact whenever the sentence fits', () => {
    // The long tail is dropped before the tag name is ever touched.
    expect(buildTagDescription('pelamin minimalis moden', 4)).toContain('pelamin minimalis moden');
  });

  it('normalises whitespace in the tag name', () => {
    expect(buildTagDescription('  rukun   nikah  ', 3)).toContain('bertag rukun nikah di');
  });

  it('is deterministic — the same input is the same string', () => {
    expect(buildTagDescription('nikah', 7)).toBe(buildTagDescription('nikah', 7));
  });
});

describe('TAG_ROBOTS', () => {
  it('is noindex, follow — D6 noindexes every tag regardless of article count', () => {
    expect(TAG_ROBOTS).toEqual({ index: false, follow: true });
  });
});
