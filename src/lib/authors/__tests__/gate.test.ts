import { describe, it, expect } from 'vitest';
import {
  HOUSE_AUTHOR_ID,
  HOUSE_AUTHOR_EMAIL,
  isLinkableAuthor,
  isAuthorReattribution,
} from '../gate';

describe('isLinkableAuthor', () => {
  it('passes an opted-in admin with a slug', () => {
    expect(isLinkableAuthor({ role: 'admin', isPublicAuthor: true, authorSlug: 'ian-ng' })).toBe(
      true,
    );
  });

  it('rejects a non-admin however the other columns read', () => {
    expect(isLinkableAuthor({ role: 'vendor', isPublicAuthor: true, authorSlug: 'a-vendor' })).toBe(
      false,
    );
    expect(isLinkableAuthor({ role: 'couple', isPublicAuthor: true, authorSlug: 'a-couple' })).toBe(
      false,
    );
  });

  it('rejects an admin who has not opted in, or has no slug', () => {
    expect(isLinkableAuthor({ role: 'admin', isPublicAuthor: false, authorSlug: 'ian-ng' })).toBe(
      false,
    );
    expect(isLinkableAuthor({ role: 'admin', isPublicAuthor: true, authorSlug: null })).toBe(false);
  });
});

describe('house account identity', () => {
  // The regression these constants exist for: `gate.ts` and `scripts/wp-import.ts`
  // used to spell the house account two different ways, so the selectable-author
  // query matched nothing on the real database.
  it('is keyed on the stable profile id the importer writes', () => {
    expect(HOUSE_AUTHOR_ID).toBe('hellokahwin-editorial');
  });

  it('carries the email the importer actually creates the row with', () => {
    expect(HOUSE_AUTHOR_EMAIL).toBe('editorial@hellokahwin.com');
  });
});

describe('isAuthorReattribution', () => {
  it('is false when the editor re-sends the stored author unchanged', () => {
    // The bug: every save and every autosave posts `authorId`, so this case has
    // to be a no-op rather than an attribution attempt.
    expect(isAuthorReattribution(HOUSE_AUTHOR_ID, HOUSE_AUTHOR_ID)).toBe(false);
    expect(isAuthorReattribution('user_abc', 'user_abc')).toBe(false);
  });

  it('is true when the submitted author differs from the stored one', () => {
    expect(isAuthorReattribution('user_abc', HOUSE_AUTHOR_ID)).toBe(true);
    expect(isAuthorReattribution(HOUSE_AUTHOR_ID, 'user_abc')).toBe(true);
  });

  it('is true when the article has no stored author yet', () => {
    expect(isAuthorReattribution('user_abc', null)).toBe(true);
    expect(isAuthorReattribution('user_abc', undefined)).toBe(true);
  });

  it('is false when nothing was submitted', () => {
    expect(isAuthorReattribution(undefined, HOUSE_AUTHOR_ID)).toBe(false);
    expect(isAuthorReattribution(null, HOUSE_AUTHOR_ID)).toBe(false);
    expect(isAuthorReattribution('', HOUSE_AUTHOR_ID)).toBe(false);
  });
});
