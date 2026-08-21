import { DeadlineExceededError } from '@/lib/api/timeout';

// postgres-js connection-class error codes (porsager/postgres `src/errors.js`).
// These fire when the socket can't be established or is torn down mid-flight —
// i.e. the Supabase pooler is momentarily unresponsive, not an app fault.
const TRANSIENT_PG_CODES = new Set([
  'CONNECT_TIMEOUT',
  'CONNECTION_CLOSED',
  'CONNECTION_ENDED',
  'CONNECTION_DESTROYED',
  'CONNECTION_CONNECT_TIMEOUT',
]);

// Node socket-level errnos that indicate a transient connectivity blip.
const TRANSIENT_SOCKET_CODES = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'EAI_AGAIN', // transient DNS failure
]);

// Postgres SQLSTATE 57014 = query_canceled. In this app it is produced almost
// exclusively by the 8s per-connection `statement_timeout` (drizzle.ts) firing
// when the Supabase pooler / DB is momentarily saturated — the queries that hit
// it are trivial indexed lookups (Sentry TWN-NEW-9 / -X / -T / -1H / -1E), so a
// timeout means DB contention, not a slow query or app bug. Treated as transient
// so the same pages that already degrade on CONNECT_TIMEOUT also degrade here
// instead of 500-ing. Paired with a message check to stay narrow.
const QUERY_CANCELED_PG_CODE = '57014';
const STATEMENT_TIMEOUT_RE = /canceling statement due to statement timeout/i;

/**
 * True for transient DB failures caused by momentary Supabase pooler / DB
 * saturation, of two kinds: (1) *connection-class* failures where the socket
 * can't be established (Sentry TWN-NEW-1 / -A: `write CONNECT_TIMEOUT
 * …pooler.supabase.com:6543`), and (2) *statement-timeout* cancellations where
 * a trivial query exceeds the 8s cap because the DB is contended (SQLSTATE
 * 57014, Sentry TWN-NEW-9 / -X / -T). Both are infra blips, safe to degrade
 * gracefully, NOT application bugs.
 *
 * Returns `false` for everything else — including Next.js control-flow errors
 * (`notFound()` / `redirect()`, which surface as a `digest` of `NEXT_NOT_FOUND`
 * / `NEXT_REDIRECT`) and genuine query/logic errors — so callers re-throw those
 * unchanged: navigation control flow keeps working and real bugs still reach
 * Sentry.
 */
export function isTransientDbError(err: unknown): boolean {
  if (err instanceof DeadlineExceededError) return true;
  if (typeof err !== 'object' || err === null) return false;

  const e = err as {
    code?: unknown;
    errno?: unknown;
    digest?: unknown;
    message?: unknown;
    cause?: unknown;
  };

  // Never classify Next.js control-flow signals as transient.
  if (typeof e.digest === 'string' && e.digest.startsWith('NEXT_')) return false;

  if (typeof e.code === 'string') {
    if (TRANSIENT_PG_CODES.has(e.code)) return true;
    if (TRANSIENT_SOCKET_CODES.has(e.code)) return true;
    // Statement-timeout (DB saturation): require BOTH the SQLSTATE and the
    // message so we never misclassify a deliberate query cancellation (same
    // 57014 code) as a transient infra blip.
    if (
      e.code === QUERY_CANCELED_PG_CODE &&
      typeof e.message === 'string' &&
      STATEMENT_TIMEOUT_RE.test(e.message)
    ) {
      return true;
    }
  }
  if (typeof e.errno === 'string' && TRANSIENT_SOCKET_CODES.has(e.errno)) return true;

  if (typeof e.message === 'string' && /\bCONNECT_TIMEOUT\b/.test(e.message)) return true;
  // Some drizzle wrappers surface the statement-timeout text without re-exposing
  // the SQLSTATE on the outer error — match the message directly as a fallback.
  if (typeof e.message === 'string' && STATEMENT_TIMEOUT_RE.test(e.message)) return true;

  // postgres-js occasionally nests the underlying socket error under `.cause`.
  if (e.cause != null && e.cause !== err) return isTransientDbError(e.cause);

  return false;
}
