import postgres from 'postgres';
import { describe, expect, it } from 'vitest';
import { preferPrepared } from '../prefer-prepared';

// A client that is never connected: postgres-js builds Query objects lazily, so
// their options can be inspected without a database.
const fresh = () => postgres('postgres://u:p@127.0.0.1:1/none', { prepare: false });
type Q = { options: { prepare?: boolean } };

describe('preferPrepared', () => {
  it('without it, Drizzle-style unsafe(query, params) is unprepared — the defect', () => {
    const q = fresh().unsafe('select $1', [1]) as unknown as Q;
    expect(q.options.prepare).toBe(false);
  });

  it('prepares parameterised unsafe() calls, which is every Drizzle query', () => {
    const q = preferPrepared(fresh()).unsafe('select $1', [1]) as unknown as Q;
    expect(q.options.prepare).toBe(true);
  });

  it('leaves parameterless calls and explicit options alone', () => {
    const sql = preferPrepared(fresh());
    expect((sql.unsafe('select 1', []) as unknown as Q).options.prepare).toBe(false);
    expect((sql.unsafe('select $1', [1], { prepare: false }) as unknown as Q).options.prepare).toBe(
      false,
    );
  });

  it('applies to the transaction client handed to begin() and savepoint()', async () => {
    const seen: string[] = [];
    const tx = {
      unsafe: (_q: string, _a: unknown[], o: { prepare?: boolean }) => seen.push(`tx:${o.prepare}`),
      savepoint: (fn: (s: unknown) => unknown) =>
        fn({
          unsafe: (_q: string, _a: unknown[], o: { prepare?: boolean }) =>
            seen.push(`sp:${o.prepare}`),
        }),
    };
    const fake = {
      unsafe: () => undefined,
      begin: (fn: (t: unknown) => unknown) => fn(tx),
    } as unknown as postgres.Sql;
    await preferPrepared(fake).begin(async (t) => {
      (t as unknown as typeof tx).unsafe('select $1', [1], {});
      await (t as unknown as { savepoint: (f: (s: postgres.Sql) => unknown) => unknown }).savepoint(
        (s) => s.unsafe('select $1', [1]),
      );
    });
    expect(seen).toEqual(['tx:true', 'sp:true']);
  });
});
