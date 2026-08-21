/**
 * Strict UUID shape check (any version, case-insensitive).
 *
 * Used by `linkAdminProfile` to refuse DB writes when a value that must be an
 * `admin_users.id` uuid turns out not to be one (observed in prod 2026-06-01:
 * a Clerk user id arrived where the uuid PK belonged, producing PG 22P02 — see
 * spec-fix-war-room-sales-board-error). Kept as a standalone pure module so it
 * is unit-testable without pulling in admin.ts's next/clerk/db imports.
 */
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_RE.test(value);
}
