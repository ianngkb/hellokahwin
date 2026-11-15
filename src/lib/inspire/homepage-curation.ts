import { z } from 'zod';

export const INSPIRE_HOMEPAGE_SETTING_KEY = 'inspire_homepage';
export const INSPIRE_HOMEPAGE_CACHE_TAG = 'inspire-homepage';
export const INSPIRE_HOMEPAGE_VERSION = 1 as const;

export type InspireHomepageSource = 'latest' | 'category';

export interface InspireHomepageZoneConfig {
  source: InspireHomepageSource;
  categoryId: string | null;
  pinnedArticleIds: string[];
}

export interface InspireHomepageConfig {
  version: typeof INSPIRE_HOMEPAGE_VERSION;
  featured: InspireHomepageZoneConfig;
  latest: InspireHomepageZoneConfig;
}

export const DEFAULT_INSPIRE_HOMEPAGE_CONFIG: InspireHomepageConfig = {
  version: INSPIRE_HOMEPAGE_VERSION,
  featured: { source: 'latest', categoryId: null, pinnedArticleIds: [] },
  latest: { source: 'latest', categoryId: null, pinnedArticleIds: [] },
};

const zoneSchema = (capacity: number) =>
  z
    .object({
      source: z.enum(['latest', 'category']),
      categoryId: z.string().uuid().nullable(),
      pinnedArticleIds: z.array(z.string().uuid()).max(capacity),
    })
    .superRefine((zone, ctx) => {
      if (zone.source === 'category' && !zone.categoryId) {
        ctx.addIssue({
          code: 'custom',
          path: ['categoryId'],
          message: 'Choose a category for every category-based section.',
        });
      }
      if (new Set(zone.pinnedArticleIds).size !== zone.pinnedArticleIds.length) {
        ctx.addIssue({
          code: 'custom',
          path: ['pinnedArticleIds'],
          message: 'An article can only be pinned once in a section.',
        });
      }
    });

export const inspireHomepageConfigSchema = z
  .object({
    version: z.literal(INSPIRE_HOMEPAGE_VERSION),
    featured: zoneSchema(3),
    latest: zoneSchema(9),
  })
  .superRefine((config, ctx) => {
    const featured = new Set(config.featured.pinnedArticleIds);
    const repeated = config.latest.pinnedArticleIds.find((id) => featured.has(id));
    if (repeated) {
      ctx.addIssue({
        code: 'custom',
        path: ['latest', 'pinnedArticleIds'],
        message: 'The same article cannot be pinned in Featured and Latest.',
      });
    }
  });

export function parseInspireHomepageConfig(value: unknown): {
  config: InspireHomepageConfig;
  invalid: boolean;
} {
  const parsed = inspireHomepageConfigSchema.safeParse(value);
  return parsed.success
    ? { config: parsed.data, invalid: false }
    : { config: DEFAULT_INSPIRE_HOMEPAGE_CONFIG, invalid: value != null };
}

export interface InspireHomepageArticle {
  id: string;
  title: string;
  slug: string;
  coverImageUrl: string;
  coverImageVariants: unknown;
  coverImageSmartCrops: unknown;
  publishedAt: Date | null;
  categoryName: string | null;
  categorySlug: string | null;
  categories?: Array<{ name: string; slug: string }>;
}

export type ResolvedArticleSource = 'pinned' | 'category' | 'latest' | 'fallback';

export interface ResolvedInspireHomepageArticle {
  article: InspireHomepageArticle;
  source: ResolvedArticleSource;
}

export interface InspireHomepageResolution {
  featured: ResolvedInspireHomepageArticle[];
  latest: ResolvedInspireHomepageArticle[];
  warnings: string[];
}

export interface InspireHomepageResolverInput {
  config: InspireHomepageConfig;
  globalLatest: InspireHomepageArticle[];
  pinnedById: ReadonlyMap<string, InspireHomepageArticle>;
  featuredCategory: InspireHomepageArticle[];
  latestCategory: InspireHomepageArticle[];
  categoryExists: ReadonlySet<string>;
}

function resolveZone({
  name,
  capacity,
  config,
  automatic,
  globalLatest,
  pinnedById,
  reservedPinIds,
  used,
  warnings,
  categoryExists,
}: {
  name: 'Featured' | 'Latest';
  capacity: number;
  config: InspireHomepageZoneConfig;
  automatic: InspireHomepageArticle[];
  globalLatest: InspireHomepageArticle[];
  pinnedById: ReadonlyMap<string, InspireHomepageArticle>;
  reservedPinIds: ReadonlySet<string>;
  used: Set<string>;
  warnings: string[];
  categoryExists: ReadonlySet<string>;
}): ResolvedInspireHomepageArticle[] {
  const resolved: ResolvedInspireHomepageArticle[] = [];

  for (const id of config.pinnedArticleIds) {
    if (resolved.length >= capacity) break;
    if (used.has(id)) {
      warnings.push(`${name}: a pinned article was already used above and was skipped.`);
      continue;
    }
    const article = pinnedById.get(id);
    if (!article) {
      warnings.push(
        `${name}: a pinned article is no longer published with a cover and was replaced.`,
      );
      continue;
    }
    used.add(id);
    resolved.push({ article, source: 'pinned' });
  }

  if (
    config.source === 'category' &&
    (!config.categoryId || !categoryExists.has(config.categoryId))
  ) {
    warnings.push(`${name}: the selected category no longer exists; newest articles were used.`);
  }

  const sourceLabel: ResolvedArticleSource = config.source === 'category' ? 'category' : 'latest';
  for (const article of automatic) {
    if (resolved.length >= capacity) break;
    if (used.has(article.id) || reservedPinIds.has(article.id)) continue;
    used.add(article.id);
    resolved.push({ article, source: sourceLabel });
  }

  if (resolved.length < capacity && config.source === 'category') {
    const beforeFallback = resolved.length;
    for (const article of globalLatest) {
      if (resolved.length >= capacity) break;
      if (used.has(article.id) || reservedPinIds.has(article.id)) continue;
      used.add(article.id);
      resolved.push({ article, source: 'fallback' });
    }
    const filled = resolved.length - beforeFallback;
    if (filled > 0 && config.categoryId && categoryExists.has(config.categoryId)) {
      warnings.push(
        `${name}: the category ran short, so ${filled} space${filled === 1 ? '' : 's'} used the newest articles.`,
      );
    }
  }

  if (resolved.length < capacity) {
    const unfilled = capacity - resolved.length;
    warnings.push(
      `${name}: ${unfilled} space${unfilled === 1 ? '' : 's'} could not be filled because there are not enough published articles with covers.`,
    );
  }

  return resolved;
}

/** Pure, deterministic placement logic shared by the public page and admin preview. */
export function resolveInspireHomepage(
  input: InspireHomepageResolverInput,
): InspireHomepageResolution {
  const used = new Set<string>();
  const warnings: string[] = [];
  const featuredAutomatic =
    input.config.featured.source === 'category' ? input.featuredCategory : input.globalLatest;
  const latestAutomatic =
    input.config.latest.source === 'category' ? input.latestCategory : input.globalLatest;
  // Reserve every still-eligible pin before either zone auto-fills. Without
  // this, Featured can consume a story explicitly pinned to Latest and the
  // later zone has to discard a perfectly valid editorial choice.
  const reservedPinIds = new Set(
    [...input.config.featured.pinnedArticleIds, ...input.config.latest.pinnedArticleIds].filter(
      (id) => input.pinnedById.has(id),
    ),
  );

  const featured = resolveZone({
    name: 'Featured',
    capacity: 3,
    config: input.config.featured,
    automatic: featuredAutomatic,
    globalLatest: input.globalLatest,
    pinnedById: input.pinnedById,
    reservedPinIds,
    used,
    warnings,
    categoryExists: input.categoryExists,
  });
  const latest = resolveZone({
    name: 'Latest',
    capacity: 9,
    config: input.config.latest,
    automatic: latestAutomatic,
    globalLatest: input.globalLatest,
    pinnedById: input.pinnedById,
    reservedPinIds,
    used,
    warnings,
    categoryExists: input.categoryExists,
  });

  return { featured, latest, warnings: [...new Set(warnings)] };
}

export function categoryTreeIds(
  categoryId: string | null,
  categories: ReadonlyArray<{ id: string; parentId: string | null }>,
): string[] {
  if (!categoryId) return [];
  const ids = new Set([categoryId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const category of categories) {
      if (category.parentId && ids.has(category.parentId) && !ids.has(category.id)) {
        ids.add(category.id);
        changed = true;
      }
    }
  }
  return [...ids];
}
