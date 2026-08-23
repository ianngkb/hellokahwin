import { pgEnum } from 'drizzle-orm/pg-core';

// Trimmed from twn-new: only the enums the HelloKahwin schema actually uses.
// `user_role` keeps twn-new's values so the profiles schema ports unchanged;
// in practice every HelloKahwin profile row is 'admin' (see lib/auth/admin.ts).
export const userRoleEnum = pgEnum('user_role', ['couple', 'vendor', 'admin', 'pending']);
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published', 'deleted']);
export const mediaSourceEnum = pgEnum('media_source', ['article_upload', 'library_upload']);

// How an article was produced. INTERNAL review tracking only — no public route
// renders it (asserted by src/lib/inspire/__tests__/public-authorship-leak.test.ts).
// `ai_assisted` exists so that IF the board later decides to disclose publicly,
// the field can be honest rather than binary. This release discloses nothing.
export const articleAuthorshipEnum = pgEnum('article_authorship', ['ai', 'ai_assisted', 'human']);

// Where an article sits in the owner's manual-review queue. Deliberately
// independent of authorship: the owner may want to sign off a legacy human
// post too, and "needs changes" applies regardless of who wrote it.
export const articleReviewStatusEnum = pgEnum('article_review_status', [
  'pending_review',
  'reviewed',
  'needs_changes',
]);
