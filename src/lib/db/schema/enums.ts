import { pgEnum } from 'drizzle-orm/pg-core';

// Trimmed from twn-new: only the enums the HelloKahwin schema actually uses.
// `user_role` keeps twn-new's values so the profiles schema ports unchanged;
// in practice every HelloKahwin profile row is 'admin' (see lib/auth/admin.ts).
export const userRoleEnum = pgEnum('user_role', ['couple', 'vendor', 'admin', 'pending']);
export const articleStatusEnum = pgEnum('article_status', ['draft', 'published', 'deleted']);
export const mediaSourceEnum = pgEnum('media_source', ['article_upload', 'library_upload']);
