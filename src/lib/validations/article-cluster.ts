import { z } from 'zod/v4';

// ── Article clusters ("series") ───────────────────────────────────────
// Validation for `/admin/inspire/clusters`, ported from The Wedding Notebook's
// `src/lib/validations/article.ts`. Kept in its own module so the clusters
// admin, the editor's Series panel and their tests share one set of rules
// without growing the article validations file. Client-safe (no server
// imports): the editor components read the caps from here.

/**
 * Whether the reader-facing Series box is on the public article page yet.
 *
 * HelloKahwin has the admin side (clusters, the switch, the intro) but NOT the
 * public box. Until it ships, a switched-on series is a saved setting that no
 * reader sees, and every admin screen must say so rather than promise a box.
 * Flip to `true` in the same change that renders the box on `/artikel/...`.
 */
export const SERIES_BOX_ON_SITE = false;

/** A URL-safe slug: lowercase letters, digits and single hyphens. */
export const URL_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
export const URL_SLUG_MESSAGE =
  'Slug may contain only lowercase letters, numbers and single hyphens';

export const CLUSTER_NAME_MAX = 120;
export const CLUSTER_SLUG_MAX = 80;

/**
 * Length as a person counts it: by GRAPHEME (user-perceived character), after
 * NFC normalisation — so "💍", "é" written as e + combining accent, and a ZWJ
 * family emoji are each ONE character.
 */
export function clusterNameLength(value: string): number {
  const nfc = value.normalize('NFC');
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    return [...new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(nfc)].length;
  }
  return Array.from(nfc).length;
}

/**
 * A hard ceiling on raw code points, whatever the grapheme count: one
 * "character" can carry any number of combining marks. Generous enough for any
 * real name (8 per grapheme: a ZWJ family emoji is 5, a tagged flag 7).
 */
const CLUSTER_NAME_MAX_CODE_POINTS = CLUSTER_NAME_MAX * 8;

const clusterNameSchema = z
  .string('Cluster name is required')
  .trim()
  .min(1, 'Cluster name is required')
  // PostgreSQL text cannot hold U+0000: the write would fail with a database
  // error instead of a message the admin can act on.
  .refine((v) => !v.includes('\u0000'), 'Cluster name cannot contain a null character')
  .refine(
    (v) =>
      clusterNameLength(v) <= CLUSTER_NAME_MAX &&
      Array.from(v.normalize('NFC')).length <= CLUSTER_NAME_MAX_CODE_POINTS,
    `Cluster name must be ${CLUSTER_NAME_MAX} characters or fewer`,
  )
  // Stored in NFC, so two names that look identical are byte-identical too.
  .transform((v) => v.normalize('NFC'));

/**
 * Optional slug: blank (or only spaces) comes out as `null`, never `''` —
 * `article_clusters.slug` is UNIQUE, and Postgres lets many rows share NULL but
 * only one share ''.
 */
const optionalClusterSlug = z
  .string()
  .trim()
  .max(CLUSTER_SLUG_MAX, `Cluster slug must be ${CLUSTER_SLUG_MAX} characters or fewer`)
  .refine((v) => v === '' || URL_SLUG_PATTERN.test(v), URL_SLUG_MESSAGE)
  .transform((v) => (v === '' ? null : v))
  .nullish()
  .transform((v) => v ?? null);

export const clusterCreateSchema = z.object({
  name: clusterNameSchema,
  slug: optionalClusterSlug,
});

export type ClusterCreateInput = z.infer<typeof clusterCreateSchema>;

export const clusterRenameSchema = z.object({
  id: z.string().uuid('Invalid cluster ID'),
  name: clusterNameSchema,
});

export type ClusterRenameInput = z.infer<typeof clusterRenameSchema>;

/** Add or remove one article from one cluster. */
export const clusterMemberSchema = z.object({
  clusterId: z.string().uuid('Invalid cluster ID'),
  articleId: z.string().uuid('Invalid article ID'),
});

export type ClusterMemberInput = z.infer<typeof clusterMemberSchema>;

/**
 * Most articles one cluster may hold. A cluster is a hand-picked group (a
 * pillar and its spokes), so 50 is far above any real one — but the reorder
 * writes one row per member in a transaction, so it stays bounded only if the
 * cluster does.
 */
export const MAX_CLUSTER_MEMBERS = 50;

export const clusterIdSchema = z.string().uuid('Invalid cluster ID');

/** The cluster's members in their new order, by article id. */
export const clusterReorderSchema = z.object({
  clusterId: z.string().uuid('Invalid cluster ID'),
  orderedArticleIds: z
    .array(z.string().uuid('Invalid article ID'))
    .min(1, 'Nothing to reorder')
    .max(MAX_CLUSTER_MEMBERS, `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles`),
});

export type ClusterReorderInput = z.infer<typeof clusterReorderSchema>;

/**
 * Several articles added to one cluster in one go (the editor's "Add N
 * articles" button), in the order they were picked. Repeats are refused: the
 * picker never sends one, so a repeat means a hand-built request.
 */
export const clusterAddMembersSchema = z.object({
  clusterId: z.string().uuid('Invalid cluster ID'),
  articleIds: z
    .array(z.string().uuid('Invalid article ID'))
    .min(1, 'Pick at least one article')
    .max(MAX_CLUSTER_MEMBERS, `A cluster can hold up to ${MAX_CLUSTER_MEMBERS} articles`)
    .refine((ids) => new Set(ids).size === ids.length, 'The same article was picked twice'),
});

export type ClusterAddMembersInput = z.infer<typeof clusterAddMembersSchema>;

// ── The cluster's reader-facing "Series box" settings ─────────────────

/** Most characters the intro paragraph may hold (counted like the name). */
export const CLUSTER_DESCRIPTION_MAX = 600;

/** Most characters the small label above the title may hold. */
export const CLUSTER_EYEBROW_MAX = 60;

const CLUSTER_DESCRIPTION_MAX_CODE_POINTS = CLUSTER_DESCRIPTION_MAX * 8;
const CLUSTER_EYEBROW_MAX_CODE_POINTS = CLUSTER_EYEBROW_MAX * 8;

/**
 * An optional plain-text field on a cluster: trimmed, NFC, no NUL, capped by
 * grapheme count, and blank (or whitespace only) comes out as `null` — never
 * `''`. Shared by the intro and the label so one rule cannot drift.
 */
function optionalClusterText(label: string, maxGraphemes: number, maxCodePoints: number) {
  return z
    .string()
    .trim()
    .refine((v) => !v.includes('\u0000'), `${label} cannot contain a null character`)
    .refine(
      (v) =>
        clusterNameLength(v) <= maxGraphemes &&
        Array.from(v.normalize('NFC')).length <= maxCodePoints,
      `${label} must be ${maxGraphemes} characters or fewer`,
    )
    .transform((v) => (v === '' ? null : v.normalize('NFC')))
    .nullish()
    .transform((v) => v ?? null);
}

/**
 * The cluster's Series-box settings, saved as one form.
 *
 * The one cross-field rule: the switch cannot be turned on while the intro is
 * blank. Phrased as the next thing to do, not as a rejection.
 */
export const clusterSeriesSettingsSchema = z
  .object({
    id: z.string().uuid('Invalid cluster ID'),
    description: optionalClusterText(
      'Intro text',
      CLUSTER_DESCRIPTION_MAX,
      CLUSTER_DESCRIPTION_MAX_CODE_POINTS,
    ),
    eyebrow: optionalClusterText(
      'Small label',
      CLUSTER_EYEBROW_MAX,
      CLUSTER_EYEBROW_MAX_CODE_POINTS,
    ),
    slug: optionalClusterSlug,
    seriesEnabled: z.boolean(),
  })
  .refine((v) => !v.seriesEnabled || v.description !== null, {
    message: 'Add the intro text readers will see before switching the series box on',
    path: ['description'],
  });

export type ClusterSeriesSettingsInput = z.infer<typeof clusterSeriesSettingsSchema>;
