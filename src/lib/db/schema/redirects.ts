import { pgTable, text, integer, uuid, boolean, timestamp, index } from 'drizzle-orm/pg-core';

export const redirects = pgTable(
  'redirects',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    sourcePath: text('source_path').unique().notNull(),
    destinationPath: text('destination_path').notNull(),
    statusCode: integer('status_code').notNull().default(301),
    isActive: boolean('is_active').notNull().default(true),
    note: text('note'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('redirects_source_path_idx').on(table.sourcePath),
    index('redirects_is_active_idx').on(table.isActive),
  ],
);
