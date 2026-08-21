/**
 * Field-level diffing for audit events.
 *
 * Exists because the audit log's most common row was also its least useful.
 * The article editor PUTs every column on every save, so
 * `metadata: { fields: Object.keys(validated) }` recorded the same 17 field
 * names whether the author retitled the piece or fixed one typo — 57% of all
 * audit rows in prod, none of them answering "what changed?".
 *
 * `diffFields` compares the before-row against the pending update and keeps
 * only the keys whose value actually moved.
 */

/** Keys whose values must never reach the audit log, matched case-insensitively. */
const SECRET_KEY_PATTERN = /pass|secret|token|api[-_]?key|credential|authorization/i;

/**
 * Keys whose values are too big to be worth storing verbatim. We still record
 * THAT they changed — just as a size summary rather than the payload. Article
 * `content` is the motivating case: full Tiptap documents run to tens of KB and
 * would bloat the table without telling anyone anything at a glance.
 */
const OPAQUE_KEYS = new Set([
  'content',
  'coverImageVariants',
  'coverImageDetectionData',
  'coverImageSmartCrops',
]);

/**
 * Bookkeeping columns that change on literally every write. `updatedAt` is
 * stamped with `new Date()` on each save, so leaving it in would reintroduce the
 * exact noise this module removes: every row reporting one meaningless change.
 */
const NOISE_KEYS = new Set(['updatedAt', 'createdAt', 'updated_at', 'created_at']);

const MAX_VALUE_CHARS = 200;

export type FieldChange = { old: unknown; new: unknown };
export type FieldChanges = Record<string, FieldChange>;

/**
 * Canonical form used only for EQUALITY, never for storage. Dates and jsonb
 * columns are the reason: `new Date(x) !== new Date(x)`, and two structurally
 * identical objects are never `===`.
 */
function canonical(value: unknown): string {
  if (value === null || value === undefined) return ' null';
  if (value instanceof Date) return ` date:${value.toISOString()}`;
  if (typeof value === 'object') {
    try {
      return JSON.stringify(value) ?? ' null';
    } catch {
      // Circular or otherwise unserialisable. Return a STABLE sentinel: a
      // random one would make a value compare unequal to itself, planting
      // a bogus "changed" entry on every save.
      return ' unserialisable';
    }
  }
  return `${typeof value}:${String(value)}`;
}

/** Storage form: readable, bounded, and free of anything sensitive. */
function summarise(key: string, value: unknown): unknown {
  if (SECRET_KEY_PATTERN.test(key)) return '[redacted]';
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value.toISOString();

  if (OPAQUE_KEYS.has(key)) {
    const size = typeof value === 'string' ? value.length : canonical(value).length;
    return `[${size.toLocaleString('en-US')} chars]`;
  }

  if (typeof value === 'string') {
    return value.length > MAX_VALUE_CHARS ? `${value.slice(0, MAX_VALUE_CHARS)}…` : value;
  }
  if (typeof value === 'number' || typeof value === 'boolean') return value;

  const serialised = canonical(value);
  return serialised.length > MAX_VALUE_CHARS
    ? `${serialised.slice(0, MAX_VALUE_CHARS)}…`
    : serialised;
}

/**
 * Returns the fields that genuinely differ between `before` and `after`.
 *
 * Only keys present in `after` are considered — an update sets what it sets, and
 * a column the caller never touched is not a change. `undefined` (not `{}`) comes
 * back when nothing moved, so a no-op save leaves `changes` NULL rather than
 * planting an empty object that renders as a blank row.
 *
 *   const changes = diffFields(before, updateData, ['title', 'status']);
 *   // → { status: { old: 'draft', new: 'live' } }
 */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown>,
  keys?: readonly string[],
): FieldChanges | undefined {
  const candidates = keys ?? Object.keys(after);
  const changes: FieldChanges = {};

  for (const key of candidates) {
    if (!(key in after)) continue;
    if (NOISE_KEYS.has(key)) continue;
    const oldValue = before?.[key];
    const newValue = after[key];
    if (canonical(oldValue) === canonical(newValue)) continue;

    changes[key] = {
      old: summarise(key, oldValue),
      new: summarise(key, newValue),
    };
  }

  return Object.keys(changes).length > 0 ? changes : undefined;
}
