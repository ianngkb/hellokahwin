import { sql } from 'drizzle-orm';
import { db } from '@/lib/db/drizzle';
import { AUDIT_ENTITIES } from './entity-registry';

/**
 * Resolves a page of audit rows to human names in ONE query.
 *
 * The obvious implementation — group the rows by entity type, then look each
 * type up in its own table — costs one query per distinct type. A single page
 * routinely holds 6-8 types, and the runtime pool is 5 connections wide, so
 * that fan-out is exactly the shape that starved the pool and left
 * /admin/leads hanging for 30s on 2026-07-31. Instead every type is stitched
 * into one UNION ALL, so a page costs one query whether it holds 2 entity types
 * or 20.
 *
 * Safety notes on the generated SQL:
 *  - Table and column fragments come only from AUDIT_ENTITIES literals in this
 *    repo, never from the request. Ids are bound as parameters.
 *  - Ids are bound individually into an IN list rather than passed as a JS array
 *    to `= ANY(...)`, which throws `22P02 malformed array literal` under Drizzle.
 *  - uuid-keyed tables receive uuid literals so the primary-key index is used;
 *    non-uuid ids are dropped before binding, because a stray slug would
 *    otherwise abort the whole statement with 22P02.
 */

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type EntityRef = { entityType: string; entityId: string };

/** Key used by callers to look a resolved label back up. */
export function labelKey(entityType: string, entityId: string): string {
  return `${entityType}:${entityId}`;
}

export async function resolveEntityLabels(refs: EntityRef[]): Promise<Map<string, string>> {
  const resolved = new Map<string, string>();
  if (refs.length === 0) return resolved;

  // Group the page's ids by entity type, discarding types we cannot look up
  // (no backing table, or no name column) and de-duplicating repeats.
  const idsByType = new Map<string, Set<string>>();
  for (const { entityType, entityId } of refs) {
    const def = AUDIT_ENTITIES[entityType];
    if (!def?.table || !def.nameExpr) continue;
    if ((def.idType ?? 'uuid') === 'uuid' && !UUID_RE.test(entityId)) continue;
    let bucket = idsByType.get(entityType);
    if (!bucket) idsByType.set(entityType, (bucket = new Set()));
    bucket.add(entityId);
  }
  if (idsByType.size === 0) return resolved;

  const selects = [...idsByType.entries()].map(([entityType, ids]) => {
    const def = AUDIT_ENTITIES[entityType]!;
    const isUuid = (def.idType ?? 'uuid') === 'uuid';
    const bound = [...ids].map((id) => (isUuid ? sql`${id}::uuid` : sql`${id}`));

    return sql`
      SELECT ${entityType}::text AS entity_type,
             ${sql.raw(def.idColumn)}::text AS entity_id,
             (${sql.raw(def.nameExpr)})::text AS label
      FROM ${sql.raw(def.table!)}
      WHERE ${sql.raw(def.idColumn)} IN (${sql.join(bound, sql`, `)})
    `;
  });

  const rows = await db.execute<{
    entity_type: string;
    entity_id: string;
    label: string | null;
  }>(sql.join(selects, sql` UNION ALL `));

  for (const row of rows) {
    if (row.label) resolved.set(labelKey(row.entity_type, row.entity_id), row.label);
  }
  return resolved;
}
