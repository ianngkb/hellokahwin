import { after } from 'next/server';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { auditLogs } from '@/lib/db/schema/audit-logs';
import { profiles } from '@/lib/db/schema/profiles';

interface AuditEvent {
  entityType: string;
  entityId: string;
  action: string;
  performedBy: string;
  /**
   * Human name of the entity as it stood when the action happened ("Villa
   * Samadhi", "Penang Wedding Venues"). Optional and additive, but pass it
   * whenever it is cheap to obtain: it is the only way a row stays readable
   * after the entity is deleted, and it saves the activity page a lookup.
   */
  entityLabel?: string | null;
  /**
   * Human name of the ACTOR as they stood when the action happened. The
   * counterpart to `entityLabel`: once the actor's profile is deleted the
   * `performed_by` join resolves to nothing, so this is the only thing that
   * keeps the row attributable. Left unset by callers — `resolveActorLabel`
   * fills it in from the profile at write time.
   */
  performedByLabel?: string | null;
  changes?: Record<string, { old: unknown; new: unknown }>;
  metadata?: Record<string, unknown>;
}

/**
 * Best-effort name/email for the actor, captured at write time.
 *
 * Deliberately non-fatal: a failed lookup must never cost us the audit row
 * itself, so it degrades to NULL, which the activity page already treats as
 * "resolve it at read time via the join".
 */
async function resolveActorLabel(performedBy: string): Promise<string | null> {
  try {
    const [actor] = await db
      .select({
        firstName: profiles.firstName,
        lastName: profiles.lastName,
        email: profiles.email,
      })
      .from(profiles)
      .where(eq(profiles.id, performedBy))
      .limit(1);
    if (!actor) return null;
    return [actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || null;
  } catch (err) {
    console.error('[audit] Failed to resolve actor label:', err);
    return null;
  }
}

/**
 * Logs an admin action to the audit_logs table.
 *
 * Non-blocking: the insert is scheduled with Next's `after()` so it runs once
 * the response has been sent, rather than as a bare un-awaited promise during
 * the request. That keeps the audit write from borrowing one of the runtime's
 * 5 pooled DB connections while the same request is still re-rendering the page
 * after a server action (a contributing factor in the 2026-07-14 pool-contention
 * incident). Falls back to fire-and-forget outside a request scope (e.g. the
 * background vendor-linker), where `after()` is unavailable.
 */
export function logAuditEvent(event: AuditEvent) {
  const write = async () => {
    try {
      const performedByLabel =
        event.performedByLabel ?? (await resolveActorLabel(event.performedBy));
      await db.insert(auditLogs).values({
        entityType: event.entityType,
        entityId: event.entityId,
        action: event.action,
        performedBy: event.performedBy,
        performedByLabel,
        entityLabel: event.entityLabel ?? null,
        changes: event.changes ?? null,
        metadata: event.metadata ?? null,
      });
    } catch (err) {
      console.error('[audit] Failed to log event:', err);
    }
  };

  try {
    after(write);
  } catch {
    void write();
  }
}

/**
 * Awaitable version of logAuditEvent for critical audit events
 * where the caller needs confirmation the log was persisted.
 */
export async function logAuditEventAsync(event: AuditEvent): Promise<void> {
  const performedByLabel = event.performedByLabel ?? (await resolveActorLabel(event.performedBy));
  await db.insert(auditLogs).values({
    entityType: event.entityType,
    entityId: event.entityId,
    action: event.action,
    performedBy: event.performedBy,
    performedByLabel,
    entityLabel: event.entityLabel ?? null,
    changes: event.changes ?? null,
    metadata: event.metadata ?? null,
  });
}
