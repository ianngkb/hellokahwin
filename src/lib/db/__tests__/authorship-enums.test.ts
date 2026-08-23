import { describe, it, expect } from 'vitest';
import { articleAuthorshipEnum, articleReviewStatusEnum } from '@/lib/db/schema/enums';
import {
  ARTICLE_AUTHORSHIPS,
  ARTICLE_REVIEW_STATUSES,
  ARTICLE_AUTHORSHIP_LABELS,
  ARTICLE_REVIEW_STATUS_LABELS,
} from '@/lib/constants';

/**
 * `src/lib/constants.ts` restates the two pgEnums as plain arrays, because
 * client components need to label and validate these values and must not import
 * the Drizzle schema (which drags the Postgres driver into the browser bundle).
 *
 * A duplicated list is a list that drifts. The consequence of drift here is not
 * cosmetic: the admin page validates its `?authorship=` / `?review=` params
 * against these arrays before putting them in a query. If the constants gained a
 * value the database does not have, that filter would send an invalid enum
 * literal to Postgres and 500 the page; if they LOST a value, a legitimate
 * filter would be silently ignored and the owner would be shown an unfiltered
 * queue they believed was filtered.
 *
 * So the two are pinned to each other here.
 */
describe('authorship constants match the database enums', () => {
  it('ARTICLE_AUTHORSHIPS matches article_authorship exactly, including order', () => {
    expect([...ARTICLE_AUTHORSHIPS]).toEqual([...articleAuthorshipEnum.enumValues]);
  });

  it('ARTICLE_REVIEW_STATUSES matches article_review_status exactly, including order', () => {
    expect([...ARTICLE_REVIEW_STATUSES]).toEqual([...articleReviewStatusEnum.enumValues]);
  });

  it('every authorship value has a label', () => {
    expect(Object.keys(ARTICLE_AUTHORSHIP_LABELS).sort()).toEqual([...ARTICLE_AUTHORSHIPS].sort());
  });

  it('every review status has a label', () => {
    expect(Object.keys(ARTICLE_REVIEW_STATUS_LABELS).sort()).toEqual(
      [...ARTICLE_REVIEW_STATUSES].sort(),
    );
  });

  it("the authorship default is 'ai' — the fail-safe direction", () => {
    // Guards the reasoning, not just the value. Defaulting to 'human' would let
    // an article whose writer forgot to set authorship escape the review queue
    // entirely, which is the exact failure the tag exists to prevent.
    expect(ARTICLE_AUTHORSHIPS[0]).toBe('ai');
  });

  it("the review default is 'pending_review' — nothing is reviewed until someone reviews it", () => {
    expect(ARTICLE_REVIEW_STATUSES[0]).toBe('pending_review');
  });
});
