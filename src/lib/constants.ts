// Application constants — trimmed from twn-new's 278-line catalogue (vendor
// categories, concierge WhatsApp numbers, ads config) to the one thing the
// ported Inspire code imports.

export const ARTICLE_STATUSES = ['draft', 'published', 'deleted'] as const;
export type ArticleStatus = (typeof ARTICLE_STATUSES)[number];
