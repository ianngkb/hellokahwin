import { pgTable, text, uuid, jsonb, timestamp, index } from 'drizzle-orm/pg-core';
import { profiles } from './profiles';

export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    entityType: text('entity_type').notNull(),
    // TEXT, not uuid — several audited entities are keyed by a slug, a settings
    // key or a URL rather than a UUID, and the old uuid column silently
    // rejected them (see migration 0137).
    entityId: text('entity_id').notNull(),
    action: text('action').notNull(),
    // Human name of the entity at the time of the action, so rows stay readable
    // after the entity is deleted. NULL on historical rows — the activity page
    // resolves those at read time.
    entityLabel: text('entity_label'),
    // Nullable: the actor's profile can be deleted, and an audit row must
    // outlive its actor. Deletion nulls this and leaves `performedByLabel`
    // behind, so the row stays attributable (see migration
    // 20260801023110_audit_log_actor_preservation).
    performedBy: text('performed_by').references(() => profiles.id),
    // Human name of the ACTOR at the time of the action — the counterpart to
    // `entityLabel`, and the only attribution that survives their deletion.
    // NULL means "the profile still exists, resolve it at read time".
    performedByLabel: text('performed_by_label'),
    changes: jsonb('changes').$type<Record<string, { old: unknown; new: unknown }>>(),
    metadata: jsonb('metadata').$type<Record<string, unknown>>(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('audit_logs_entity_idx').on(table.entityType, table.entityId),
    index('audit_logs_performed_by_idx').on(table.performedBy),
    index('audit_logs_created_at_idx').on(table.createdAt),
  ],
);
