import type { Sql } from 'postgres';

/**
 * Make a postgres-js client send PREPARED statements for every parameterised
 * query, including the ones Drizzle sends — Cloudflare Workers + Hyperdrive only
 * (`@/lib/db/drizzle`).
 *
 * Why: Cloudflare documents `prepare: false` behind Hyperdrive as a cause of
 * intermittent hangs and failures. Setting `prepare: true` on the client is not
 * enough, because Drizzle sends EVERY query through `client.unsafe(query,
 * params)`, and postgres-js's `unsafe()` hard-defaults `prepare: false`
 * regardless of the client option. So `unsafe` is wrapped to default it back
 * on, and `begin`/`savepoint` are wrapped so the transaction-scoped clients
 * Drizzle uses inside `db.transaction()` get the same treatment.
 *
 * Only queries WITH parameters are switched: a parameterless call (postgres-js's
 * own internal `begin`, `commit`, …) runs over the simple protocol and is left
 * exactly as it was. An explicit `prepare` option from a caller always wins.
 *
 * Not used on Vercel: there the pool talks to Supavisor's transaction pooler,
 * which is exactly where `prepare: false` is required.
 */
export function preferPrepared<T extends Sql>(sql: T): T {
  const unsafe = sql.unsafe.bind(sql) as (...a: unknown[]) => unknown;
  (sql as { unsafe: unknown }).unsafe = (query: string, args?: unknown, options?: unknown) => {
    if (args !== undefined && !Array.isArray(args)) return unsafe(query, args);
    const params = (args as unknown[] | undefined) ?? [];
    const opts = (options ?? {}) as Record<string, unknown>;
    return unsafe(query, params, params.length > 0 ? { prepare: true, ...opts } : opts);
  };

  const begin = (sql as { begin?: (...a: unknown[]) => unknown }).begin?.bind(sql);
  if (begin) {
    (sql as { begin: unknown }).begin = (...a: unknown[]) => {
      const fn = a.pop() as (tx: Sql) => unknown;
      return begin(...a, (tx: Sql) => fn(preferPrepared(tx)));
    };
  }
  const savepoint = (
    sql as unknown as { savepoint?: (...a: unknown[]) => unknown }
  ).savepoint?.bind(sql);
  if (savepoint) {
    (sql as unknown as { savepoint: unknown }).savepoint = (...a: unknown[]) => {
      const fn = a.pop() as (sp: Sql) => unknown;
      return savepoint(...a, (sp: Sql) => fn(preferPrepared(sp)));
    };
  }
  return sql;
}
