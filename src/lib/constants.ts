// Application constants — trimmed from twn-new's 278-line catalogue (vendor
// categories, concierge WhatsApp numbers, ads config) to the one thing the
// ported Inspire code imports.

export const ARTICLE_STATUSES = ['draft', 'published', 'deleted'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];

// Mirrors the `article_authorship` / `article_review_status` pgEnums in
// src/lib/db/schema/enums.ts. Kept here, next to ARTICLE_STATUSES, because
// client components need to validate and label these values and must not import
// the Drizzle schema (which pulls the driver into the browser bundle).
//
// Keep in step with the pgEnums. `src/lib/db/__tests__/authorship-enums.test.ts`
// asserts these lists match the schema exactly, so a drift fails the suite
// rather than 500ing a filter at runtime.
export const ARTICLE_AUTHORSHIPS = ['ai', 'ai_assisted', 'human'] as const;
export type ArticleAuthorship = (typeof ARTICLE_AUTHORSHIPS)[number];

export const ARTICLE_REVIEW_STATUSES = ['pending_review', 'reviewed', 'needs_changes'] as const;
export type ArticleReviewStatus = (typeof ARTICLE_REVIEW_STATUSES)[number];

/** Human-readable labels for the admin list. Internal only — never rendered publicly. */
export const ARTICLE_AUTHORSHIP_LABELS: Record<ArticleAuthorship, string> = {
  ai: 'AI',
  ai_assisted: 'AI-assisted',
  human: 'Human',
};

export const ARTICLE_REVIEW_STATUS_LABELS: Record<ArticleReviewStatus, string> = {
  pending_review: 'Needs review',
  reviewed: 'Reviewed',
  needs_changes: 'Needs changes',
};
