import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  jsonb,
  index,
  real,
  boolean,
} from 'drizzle-orm/pg-core';

/**
 * First-party site analytics, one row per event (pageview or custom `track()`
 * call). Ported from The Wedding Notebook without its rollup tables: the admin
 * dashboard reads this table directly with date-bounded, index-sargable
 * queries (see `src/app/(admin)/admin/site-analytics/queries.ts`).
 *
 * Nothing here identifies a person. There is no IP column — `visitor_hash` is a
 * salted sha256 that rotates every KL day (`src/lib/analytics/hash.ts`).
 */
export const analyticsEvents = pgTable(
  'analytics_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    visitorHash: text('visitor_hash').notNull(),
    // The stable 2-year `_hk_vid` anonymous visitor id, read from the cookie on
    // the /collect request — never from the payload. `visitorHash` above
    // rotates DAILY; this survives midnight. NULL for any request arriving
    // without a readable cookie.
    visitorId: uuid('visitor_id'),
    sessionId: text('session_id'),
    eventName: text('event_name').notNull(),
    pathname: text('pathname'),
    referrer: text('referrer'),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmTerm: text('utm_term'),
    utmContent: text('utm_content'),
    // Parsed server-side from the request UA (`src/lib/analytics/device.ts`) so
    // the public bundle carries no UA parser.
    browser: text('browser'),
    os: text('os'),
    deviceType: text('device_type'),
    screenWidth: integer('screen_width'),
    country: text('country'),
    // State/province code as Vercel sent it (e.g. `10` = Selangor) — a code,
    // NOT a name. Resolved for display via `src/lib/analytics/region-name.ts`.
    region: text('region'),
    city: text('city'),
    latitude: real('latitude'),
    longitude: real('longitude'),
    // Stored so a later sweep can re-classify bots without re-deriving the UA.
    userAgent: text('user_agent'),
    isBot: boolean('is_bot').notNull().default(false),
    botReason: text('bot_reason'),
    props: jsonb('props'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_analytics_events_created_at').on(table.createdAt),
    index('idx_analytics_events_pathname_created').on(table.pathname, table.createdAt),
    index('idx_analytics_events_session_created').on(table.sessionId, table.createdAt),
    index('idx_analytics_events_country_created').on(table.country, table.createdAt),
  ],
);

export type AnalyticsEvent = typeof analyticsEvents.$inferSelect;
export type NewAnalyticsEvent = typeof analyticsEvents.$inferInsert;
