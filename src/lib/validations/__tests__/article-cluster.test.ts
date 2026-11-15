import { describe, it, expect } from 'vitest';
import {
  CLUSTER_NAME_MAX,
  clusterNameLength,
  CLUSTER_SLUG_MAX,
  CLUSTER_DESCRIPTION_MAX,
  CLUSTER_EYEBROW_MAX,
  clusterCreateSchema,
  clusterMemberSchema,
  clusterRenameSchema,
  clusterSeriesSettingsSchema,
  URL_SLUG_MESSAGE,
} from '../article-cluster';

// Ported from TWN's validations test. One HelloKahwin difference: an omitted
// slug comes out as `null` (not absent), the same "blank is NULL" rule the
// settings schema already follows.

const ID = '11111111-1111-4111-8111-111111111111';
const ID2 = '22222222-2222-4222-8222-222222222222';

function firstMessage(result: { success: boolean; error?: { issues: { message: string }[] } }) {
  return result.success ? null : result.error!.issues[0]!.message;
}

describe('clusterCreateSchema', () => {
  it('trims the name', () => {
    expect(clusterCreateSchema.parse({ name: '  Budget  ' })).toEqual({
      name: 'Budget',
      slug: null,
    });
  });

  it.each([[''], ['   '], [undefined]])('rejects a blank name (%j)', (name) => {
    expect(firstMessage(clusterCreateSchema.safeParse({ name }))).toBe('Cluster name is required');
  });

  it('caps the name length at the boundary', () => {
    expect(clusterCreateSchema.safeParse({ name: 'a'.repeat(CLUSTER_NAME_MAX) }).success).toBe(
      true,
    );
    expect(
      firstMessage(clusterCreateSchema.safeParse({ name: 'a'.repeat(CLUSTER_NAME_MAX + 1) })),
    ).toBe(`Cluster name must be ${CLUSTER_NAME_MAX} characters or fewer`);
  });

  it('counts the name in characters a person sees, so 120 emoji fit and 121 do not', () => {
    // '💍' is one code point but two UTF-16 units: 120 of them have .length 240.
    expect('💍'.repeat(CLUSTER_NAME_MAX)).toHaveLength(CLUSTER_NAME_MAX * 2);
    expect(clusterCreateSchema.safeParse({ name: '💍'.repeat(CLUSTER_NAME_MAX) }).success).toBe(
      true,
    );
    expect(
      firstMessage(clusterCreateSchema.safeParse({ name: '💍'.repeat(CLUSTER_NAME_MAX + 1) })),
    ).toBe(`Cluster name must be ${CLUSTER_NAME_MAX} characters or fewer`);
    expect(
      clusterRenameSchema.safeParse({ id: ID, name: '💍'.repeat(CLUSTER_NAME_MAX) }).success,
    ).toBe(true);
  });

  // I-F11: 120 DISPLAYED characters fit even when they are built from several
  // code points (combining accents, ZWJ emoji); 121 do not.
  it('I-F11: counts graphemes after NFC, so combining marks and ZWJ emoji count once', () => {
    const decomposed = 'e\u0301'; // é as e + combining acute: 2 code points, 1 character
    const family = '\u{1F468}\u200D\u{1F469}\u200D\u{1F467}'; // 👨‍👩‍👧: 5 code points
    expect(clusterNameLength(decomposed)).toBe(1);
    expect(clusterNameLength(family)).toBe(1);
    for (const ch of [decomposed, family, 'a\u0308\u0304']) {
      expect(clusterCreateSchema.safeParse({ name: ch.repeat(CLUSTER_NAME_MAX) }).success).toBe(
        true,
      );
      expect(
        firstMessage(clusterCreateSchema.safeParse({ name: ch.repeat(CLUSTER_NAME_MAX + 1) })),
      ).toBe(`Cluster name must be ${CLUSTER_NAME_MAX} characters or fewer`);
    }
    // Stored NFC: the decomposed é comes back as the single code point U+00E9.
    expect(clusterCreateSchema.parse({ name: `Caf${decomposed}` }).name).toBe('Caf\u00e9');
  });

  it('I-F11: still bounds raw code points (one grapheme cannot carry unlimited marks)', () => {
    const heavy = 'a' + '\u0301'.repeat(CLUSTER_NAME_MAX * 8 + 1);
    expect(clusterNameLength(heavy)).toBe(1);
    expect(clusterCreateSchema.safeParse({ name: heavy }).success).toBe(false);
  });

  // I-F12: PostgreSQL text cannot store U+0000 — reject it with a message
  // before any database access, on create and on rename.
  it('I-F12: rejects a NUL character in the name', () => {
    const msg = 'Cluster name cannot contain a null character';
    expect(firstMessage(clusterCreateSchema.safeParse({ name: 'Ball\u0000rooms' }))).toBe(msg);
    expect(firstMessage(clusterRenameSchema.safeParse({ id: ID, name: '\u0000x' }))).toBe(msg);
  });

  it('caps the slug length at the boundary', () => {
    const slug = (n: number) => 'a'.repeat(n);
    expect(clusterCreateSchema.parse({ name: 'x', slug: slug(CLUSTER_SLUG_MAX) })).toEqual({
      name: 'x',
      slug: slug(CLUSTER_SLUG_MAX),
    });
    expect(
      firstMessage(clusterCreateSchema.safeParse({ name: 'x', slug: slug(CLUSTER_SLUG_MAX + 1) })),
    ).toBe(`Cluster slug must be ${CLUSTER_SLUG_MAX} characters or fewer`);
  });

  it('accepts no slug, an empty slug, or a URL-shaped slug; rejects anything else', () => {
    expect(clusterCreateSchema.safeParse({ name: 'x' }).success).toBe(true);
    expect(clusterCreateSchema.parse({ name: 'x', slug: '' })).toEqual({ name: 'x', slug: null });
    expect(clusterCreateSchema.parse({ name: 'x', slug: '   ' })).toEqual({
      name: 'x',
      slug: null,
    });
    expect(clusterCreateSchema.parse({ name: 'x', slug: null })).toEqual({ name: 'x', slug: null });
    expect(clusterCreateSchema.parse({ name: 'x', slug: ' a-b ' })).toEqual({
      name: 'x',
      slug: 'a-b',
    });
    expect(clusterCreateSchema.safeParse({ name: 'x', slug: 'wedding-budget' }).success).toBe(true);
    expect(firstMessage(clusterCreateSchema.safeParse({ name: 'x', slug: 'Wedding Budget' }))).toBe(
      URL_SLUG_MESSAGE,
    );
  });
});

describe('clusterRenameSchema', () => {
  it('needs a uuid id and a non-blank name', () => {
    expect(clusterRenameSchema.parse({ id: ID, name: ' New ' })).toEqual({ id: ID, name: 'New' });
    expect(firstMessage(clusterRenameSchema.safeParse({ id: 'nope', name: 'x' }))).toBe(
      'Invalid cluster ID',
    );
    expect(firstMessage(clusterRenameSchema.safeParse({ id: ID, name: ' ' }))).toBe(
      'Cluster name is required',
    );
  });
});

describe('clusterMemberSchema', () => {
  it('needs two uuids', () => {
    expect(clusterMemberSchema.parse({ clusterId: ID, articleId: ID2 })).toEqual({
      clusterId: ID,
      articleId: ID2,
    });
    expect(firstMessage(clusterMemberSchema.safeParse({ clusterId: ID, articleId: 'x' }))).toBe(
      'Invalid article ID',
    );
    expect(firstMessage(clusterMemberSchema.safeParse({ clusterId: 'x', articleId: ID2 }))).toBe(
      'Invalid cluster ID',
    );
  });
});

// ── The Series box settings (R4) ──────────────────────────────────────
// The intro, the small label, the (now editable) web-address name and the
// on/off switch, saved as one form.

describe('clusterSeriesSettingsSchema', () => {
  /** A valid payload with the box switched off and nothing filled in. */
  const base = { id: ID, description: '', eyebrow: '', slug: '', seriesEnabled: false };

  it('turns every blank field into null, never an empty string', () => {
    // NULL is what the reads use to tell "not written yet" from a real value,
    // and `slug` is UNIQUE — Postgres lets many rows share NULL, only one ''.
    expect(clusterSeriesSettingsSchema.parse(base)).toEqual({
      id: ID,
      description: null,
      eyebrow: null,
      slug: null,
      seriesEnabled: false,
    });
    expect(
      clusterSeriesSettingsSchema.parse({
        ...base,
        description: '   ',
        eyebrow: '\n ',
        slug: '  ',
      }),
    ).toEqual({ id: ID, description: null, eyebrow: null, slug: null, seriesEnabled: false });
    // Omitted or explicitly null behaves the same as blank.
    expect(clusterSeriesSettingsSchema.parse({ id: ID, seriesEnabled: false, slug: null })).toEqual(
      {
        id: ID,
        description: null,
        eyebrow: null,
        slug: null,
        seriesEnabled: false,
      },
    );
  });

  it('trims the intro and the label and stores them in NFC', () => {
    const decomposed = 'Café weddings'; // é as e + combining acute
    const out = clusterSeriesSettingsSchema.parse({
      ...base,
      description: '  Six guides, in order.  ',
      eyebrow: `  ${decomposed}  `,
    });
    expect(out.description).toBe('Six guides, in order.');
    expect(out.eyebrow).toBe('Café weddings');
  });

  it('caps the intro at 600 characters, at the boundary', () => {
    expect(
      clusterSeriesSettingsSchema.safeParse({
        ...base,
        description: 'a'.repeat(CLUSTER_DESCRIPTION_MAX),
      }).success,
    ).toBe(true);
    expect(
      firstMessage(
        clusterSeriesSettingsSchema.safeParse({
          ...base,
          description: 'a'.repeat(CLUSTER_DESCRIPTION_MAX + 1),
        }),
      ),
    ).toBe(`Intro text must be ${CLUSTER_DESCRIPTION_MAX} characters or fewer`);
  });

  it('caps the label at 60 characters, at the boundary', () => {
    expect(
      clusterSeriesSettingsSchema.safeParse({ ...base, eyebrow: 'a'.repeat(CLUSTER_EYEBROW_MAX) })
        .success,
    ).toBe(true);
    expect(
      firstMessage(
        clusterSeriesSettingsSchema.safeParse({
          ...base,
          eyebrow: 'a'.repeat(CLUSTER_EYEBROW_MAX + 1),
        }),
      ),
    ).toBe(`Small label must be ${CLUSTER_EYEBROW_MAX} characters or fewer`);
  });

  it('counts both fields the way a person does (graphemes after NFC)', () => {
    const family = '\u{1F468}‍\u{1F469}‍\u{1F467}'; // one character, 5 code points
    expect(clusterNameLength(family)).toBe(1);
    expect(
      clusterSeriesSettingsSchema.safeParse({
        ...base,
        eyebrow: family.repeat(CLUSTER_EYEBROW_MAX),
      }).success,
    ).toBe(true);
    expect(
      clusterSeriesSettingsSchema.safeParse({
        ...base,
        eyebrow: family.repeat(CLUSTER_EYEBROW_MAX + 1),
      }).success,
    ).toBe(false);
    // …and still bounds raw code points, so one grapheme cannot carry unlimited marks.
    expect(
      clusterSeriesSettingsSchema.safeParse({
        ...base,
        eyebrow: 'a' + '́'.repeat(CLUSTER_EYEBROW_MAX * 8 + 1),
      }).success,
    ).toBe(false);
  });

  it('rejects a NUL character in either field (PostgreSQL text cannot hold it)', () => {
    expect(
      firstMessage(clusterSeriesSettingsSchema.safeParse({ ...base, description: 'a\u0000b' })),
    ).toBe('Intro text cannot contain a null character');
    expect(
      firstMessage(clusterSeriesSettingsSchema.safeParse({ ...base, eyebrow: '\u0000' })),
    ).toBe('Small label cannot contain a null character');
  });

  it('keeps the existing slug rule and its 80-character cap', () => {
    expect(clusterSeriesSettingsSchema.parse({ ...base, slug: ' sg-rings ' }).slug).toBe(
      'sg-rings',
    );
    expect(firstMessage(clusterSeriesSettingsSchema.safeParse({ ...base, slug: 'SG Rings' }))).toBe(
      URL_SLUG_MESSAGE,
    );
    expect(
      clusterSeriesSettingsSchema.safeParse({ ...base, slug: 'a'.repeat(CLUSTER_SLUG_MAX) })
        .success,
    ).toBe(true);
    expect(
      firstMessage(
        clusterSeriesSettingsSchema.safeParse({ ...base, slug: 'a'.repeat(CLUSTER_SLUG_MAX + 1) }),
      ),
    ).toBe(`Cluster slug must be ${CLUSTER_SLUG_MAX} characters or fewer`);
  });

  it('needs a uuid id', () => {
    expect(firstMessage(clusterSeriesSettingsSchema.safeParse({ ...base, id: 'nope' }))).toBe(
      'Invalid cluster ID',
    );
  });

  it('refuses to switch the box on while the intro is blank, and says what to do', () => {
    const msg = 'Add the intro text readers will see before switching the series box on';
    for (const description of ['', '   ', undefined, null]) {
      expect(
        firstMessage(
          clusterSeriesSettingsSchema.safeParse({ ...base, description, seriesEnabled: true }),
        ),
      ).toBe(msg);
    }
    // Switching OFF with a blank intro is fine — that is the default state.
    expect(clusterSeriesSettingsSchema.safeParse({ ...base, seriesEnabled: false }).success).toBe(
      true,
    );
    // With an intro, switching on is allowed.
    expect(
      clusterSeriesSettingsSchema.safeParse({
        ...base,
        description: 'Six guides, in order.',
        seriesEnabled: true,
      }).success,
    ).toBe(true);
  });

  it('needs the switch to be a real boolean, not a checkbox string', () => {
    expect(clusterSeriesSettingsSchema.safeParse({ ...base, seriesEnabled: 'on' }).success).toBe(
      false,
    );
    expect(
      clusterSeriesSettingsSchema.safeParse({ ...base, seriesEnabled: undefined }).success,
    ).toBe(false);
  });
});
