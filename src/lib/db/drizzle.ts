import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL!;

const globalForDb = globalThis as unknown as { pgClient: ReturnType<typeof postgres> };

// Build phase: prerendering spawns ~30 parallel worker processes — each loads
// this module fresh and opens its own pool. Cap each build worker at 2 to stay
// well under Supavisor's 200-CLIENT transaction-pooler cap.
//
// Runtime: Vercel Fluid Compute consolidates many in-flight requests onto a
// single function instance. The 2026-05-04 log slice caught `concurrency=54`
// on one instance — 54 requests sharing 1 DB connection serialised through
// pool=1 and that's what produced the 86 timeouts on /inspire/[category]/[slug]
// in the 2026-05-04→05 log slice. max=5 gives each instance 5 lanes.
//
// ⚠️ THE HEADROOM MATH BELOW USED TO BE WRONG — do not act on the old version.
// It read "~30 isolates × 5 = 150 conns, comfortably under the 200 cap with 25%
// headroom", which silently treated two different limits as one number:
//
//   - **Postgres `max_connections` is 90**, not 200. That is the real ceiling on
//     BACKEND connections, and it is what you exhaust to cause an outage.
//   - **200 is Supavisor's CLIENT cap** — how many pooled clients may connect to
//     the pooler, which multiplexes them onto far fewer backends. Measured
//     2026-08-07 during the article-editor incident: 24/90 connections in use,
//     only 1 active, with Supavisor holding 6 backend connections.
//
// So "150 out of 200" was never a real 25% margin: 150 clients against a 90-
// connection database is only safe BECAUSE Supavisor multiplexes, and the
// multiplexing ratio — not the client cap — is what sets the true limit.
//
// This matters because the corrected numbers do NOT justify raising `max`. The
// 2026-08-07 evidence is that the pool starves while the DB is almost entirely
// idle, i.e. demand-side: one article-editor render was issuing ~13 round-trips
// and Next re-renders the page inside every Server Action response, so the 60s
// autosave replayed it forever. The fix was to cut that to ~7 (cached reference
// lists, a collapsed admin-permissions join, and not busting the editor's own
// cache on autosave) — not to hand each instance more lanes.
//
// Raising `max` remains an explicit ASK-FIRST decision. It needs a live count of
// concurrent Fluid instances first: ~30 instances × 8 would exceed even the
// Supavisor client cap, and every extra lane multiplies against `max_connections
// = 90` on the other side of the pooler.
//
// Background: pool=1 was set in 17d1941 to fix a regression where ~50
// instances × 10 conns each blew past 200 (1,102 EMAXCONN errors / 24h
// in the 2026-04-28→29 slice). That math was correct for the old "1 request
// per instance" Vercel runtime model. Under Fluid Compute the ratio
// flipped — fewer instances handling more concurrency each — so the safe
// per-instance pool can now grow without re-triggering EMAXCONN.
//
// Caveat: queries inside one invocation still share connections. NEVER run a
// `db.*` call concurrently with an open `db.transaction(...)` body that has
// borrowed the only available conn — they will deadlock-wait. The deadlock
// window is bounded by `connect_timeout` (8s) and `statement_timeout` (8s)
// below; before those were set the deadlock would consume the full 300s
// Vercel function timeout. Sequential queries inside a transaction are fine.
//
// Timeouts: Supabase pgbouncer / upstream DB occasionally goes unresponsive
// (verified against the 2026-04-30→05-01 log slice: 1,083 504s at exactly
// 300,001ms). Without client-side timeouts, postgres-js waits silently on a
// stalled socket until Vercel kills the function. `connect_timeout: 8` caps
// TCP connect; `idle_timeout: 20` releases idle conns.
//
// ⚠️ `connection.statement_timeout` below is INEFFECTIVE in production. It is
// sent as a postgres-js startup parameter, which the Supavisor TRANSACTION
// pooler (:6543, our DATABASE_URL) does NOT forward to the executing backend —
// verified 2026-07-14: connecting exactly like this and reading
// current_setting('statement_timeout') returns the `postgres` ROLE default,
// not 8000. The real 8s cap is therefore enforced at the role level
// (migration 0118_app_role_statement_timeout_8s). This option is kept because
// it IS honored on a direct / session-pooler (:5432) connection; do not rely
// on it through the transaction pooler.
const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build';

const client =
  globalForDb.pgClient ??
  postgres(connectionString, {
    max: isBuildPhase ? 2 : 5,
    prepare: false,
    connect_timeout: 8,
    idle_timeout: 20,
    connection: {
      statement_timeout: 8_000,
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForDb.pgClient = client;
}

export const db = drizzle(client, { schema });

// The raw postgres-js client behind Drizzle. Exposed for the few code paths
// that share the tagged-template SQL engine with CLI scripts (e.g. the Pinterest
// export engine in src/lib/pinterest/export-engine.ts), so the cron worker and
// the CLI run the exact same publish code against one pool. Prefer `db` for
// everything else.
export const sqlClient = client;
