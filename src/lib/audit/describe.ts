import { entityNoun, entityHref, isResolvableEntityType } from './entity-registry';
import type { FieldChanges } from './diff';

/**
 * Turns one audit row into the sentence the activity page renders.
 *
 * The page used to print `updated` · `article` · a raw dump of every string in
 * `metadata`, which for the most common row type meant the same 17 field names
 * every time. Here the row becomes "updated article Penang Wedding Venues",
 * with the specifics broken out as discrete detail chips.
 */

/** Past-tense verbs for actions whose bare string reads badly. */
const ACTION_VERBS: Record<string, string> = {
  created: 'created',
  updated: 'updated',
  deleted: 'deleted',
  soft_deleted: 'archived',
  hard_deleted: 'permanently deleted',
  master_deleted: 'permanently deleted',
  archived: 'archived',
  published: 'published',
  status_changed: 'changed the status of',
  stage_changed: 'moved a stage on',
  won: 'marked as won',
  lost: 'marked as lost',
  reopened: 'reopened',
  suspended: 'suspended',
  reactivated: 'reactivated',
  duplicated: 'duplicated',
  merged: 'merged',
  transferred: 'transferred',
  managed_edit: 'edited (managed)',
  managed_transferred: 'transferred (managed)',
  reorder: 'reordered',
  reordered: 'reordered',
  toggled: 'toggled',
  toggled_active: 'toggled',
  spotlight_toggled: 'toggled the spotlight on',
  visibility_changed: 'changed the visibility of',
  tags_updated: 'updated the tags on',
  links_updated: 'updated the links on',
  images_regenerated: 'regenerated images for',
  human_review_marked: 'marked for human review',
  vendor_credit_added: 'added a vendor credit to',
  vendor_credit_updated: 'updated a vendor credit on',
  vendor_credit_removed: 'removed a vendor credit from',
  invited: 'invited',
  invite_revoked: 'revoked the invite for',
  accepted: 'accepted the invite for',
  manually_linked: 'manually linked',
  signup_invite_sent: 'sent a signup invite to',
  banner_assigned: 'assigned a banner to',
  banner_removed: 'removed a banner from',
  created_for_placement: 'created a banner for',
  deleted_from_placement: 'removed a banner from',
  sample_created: 'created a sample',
  csv_imported: 'imported via CSV',
  bulk_imported: 'bulk-imported',
  backup_triggered: 'triggered a backup of',
  restore_triggered: 'triggered a restore of',
  reset: 'reset',
  slug_redirect_created: 'created a slug redirect for',
};

export type ChipTone = 'success' | 'warning' | 'info' | 'error' | 'solid';

/** Tone by semantic family, so a new action string still lands sensibly. */
export function actionTone(action: string): ChipTone {
  if (/(^|_)(deleted|removed|revoked|suspended|reset|rejected|disabled)/.test(action)) {
    return 'error';
  }
  if (
    /(^|_)(created|published|reactivated|accepted|added|invited|approved|enabled|completed)/.test(
      action,
    )
  ) {
    return 'success';
  }
  if (/(^|_)(status_changed|archived|toggled|marked|queued)/.test(action)) return 'warning';
  return 'info';
}

export function actionVerb(action: string): string {
  return ACTION_VERBS[action] ?? action.replace(/_/g, ' ');
}

export interface AuditRowInput {
  entityType: string;
  entityId: string;
  entityLabel: string | null;
  action: string;
  changes: FieldChanges | null;
  metadata: Record<string, unknown> | null;
  /** Label found by resolving the id against its table, if it still exists. */
  resolvedLabel?: string | null;
}

export interface DescribedAuditRow {
  verb: string;
  tone: ChipTone;
  noun: string;
  /** Display name, or null when the entity can't be named at all. */
  label: string | null;
  /** True when the entity no longer exists and the label is historical. */
  isDeleted: boolean;
  href: string | null;
  /** Discrete "field: old → new" style facts. */
  details: string[];
}

const MAX_DETAILS = 4;

/**
 * Label precedence: the name captured at write time, then a live lookup, then
 * whatever the action happened to stash in metadata (several delete paths record
 * `title`/`name` precisely because the row is about to vanish).
 *
 * Deletion is only ever inferred for entity types we can actually look up. Half
 * the registry has no backing table, so for those "no resolved label" means we
 * never looked — concluding "deleted" there would mark every freshly-created
 * inquiry, auto-link rule and analytics reset as deleted and strip its link.
 */
function pickLabel(row: AuditRowInput): { label: string | null; isDeleted: boolean } {
  const resolvable = isResolvableEntityType(row.entityType);

  if (row.entityLabel) {
    return { label: row.entityLabel, isDeleted: resolvable && !row.resolvedLabel };
  }
  if (row.resolvedLabel) return { label: row.resolvedLabel, isDeleted: false };

  const meta = row.metadata ?? {};
  for (const key of ['title', 'name', 'label', 'email', 'slug', 'sourcePath']) {
    const value = meta[key];
    if (typeof value === 'string' && value.trim()) return { label: value, isDeleted: resolvable };
  }
  // Nothing names it. If it was resolvable and still didn't resolve, it is gone
  // — which must also suppress the link, or we point admins at a 404.
  return { label: null, isDeleted: resolvable };
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  // NaN / Infinity would otherwise render literally in the details line.
  if (typeof value === 'number' && !Number.isFinite(value)) return '—';
  return String(value);
}

/** Splits camelCase / snake_case field names into readable words. */
function humaniseField(field: string): string {
  return field
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .toLowerCase();
}

export function describeAuditRow(row: AuditRowInput): DescribedAuditRow {
  const { label, isDeleted } = pickLabel(row);
  const details: string[] = [];

  // Real field-level diffs are the good case: show old → new.
  const changes = row.changes ?? {};
  const changedFields = Object.keys(changes);
  for (const field of changedFields.slice(0, MAX_DETAILS)) {
    const change = changes[field]!;
    details.push(
      `${humaniseField(field)}: ${formatValue(change.old)} → ${formatValue(change.new)}`,
    );
  }
  if (changedFields.length > MAX_DETAILS) {
    details.push(`+${changedFields.length - MAX_DETAILS} more`);
  }

  // Fall back to metadata only when there is no diff to show. `fields` is
  // deliberately skipped: pre-0137 rows carry the same 17 names on every save,
  // so surfacing it just restores the noise.
  if (details.length === 0 && row.metadata) {
    const shown: string[] = [];
    let hidden = 0;
    for (const [key, value] of Object.entries(row.metadata)) {
      if (key === 'fields' || value === null || value === undefined) continue;
      if (typeof value === 'object') continue;
      if (shown.length >= MAX_DETAILS) {
        hidden++;
        continue;
      }
      shown.push(`${humaniseField(key)}: ${formatValue(value)}`);
    }
    details.push(...shown);
    // Same overflow accounting as the changes branch — without it, metadata
    // keys past the cap vanish with no hint that anything was elided.
    if (hidden > 0) details.push(`+${hidden} more`);
  }

  return {
    verb: actionVerb(row.action),
    tone: actionTone(row.action),
    noun: entityNoun(row.entityType),
    label,
    isDeleted,
    href: isDeleted ? null : entityHref(row.entityType, row.entityId),
    details,
  };
}
