STATUS: done. F17 is fixed: article titles now resolve only for published articles. The gates exit 0, and the change is committed locally but not pushed. The full F1–F46 table from the first fix pass is in fixer-DONE-1.md.

- HEAD after fix: `cf307ad9fc442249cf6e1b03bf85b3a30114c271` (`cf307ad` Resolve analytics article titles for published articles only (F17)), on `ianng89/hellokahwin-site-analytics`
- Previous fix HEAD: `8d61eaf98c91207c2da36077a18a0b510c2610dc`. Originally reviewed sha: `ceceb17983e6370d4ffbbdbc3a7f191403b79151`

## Gates

The tree is the same as at cf307ad. Every gate ran against a throwaway local Postgres on :55432, never prod, with a dummy salt and Clerk secret.

| Gate | Result |
| --- | --- |
| `pnpm typecheck` | exit 0 |
| `pnpm lint` (eslint + prettier --check) | exit 0 |
| `pnpm test` | exit 0. 65 files and 850 tests pass (849 before, plus the new F17 test) |
| `pnpm build` | exit 0, with DATABASE_URL pointed at the local Postgres |

**Extra checks:**
- **The new test fails without the fix.** With the filter `eq(articles.status, 'published')` removed, the F17 test failed (1 failed, 9 passed); with it restored, all 10 pass.
- **The query runs on real Postgres.** `resolvePageTitles` ran against the local DB and logged no `[analytics-titles]` warning, so the `status = 'published'` comparison is valid SQL on the `article_status` enum.

## Findings

| # | Layer(s) | file:line | Sev | Class | State | What I did |
| --- | --- | --- | --- | --- | --- | --- |
| F17 | blind+edge | src/lib/analytics/resolve-page-titles.ts:49 (lookup :100-110) | minor | defect-edge | fixed | The article title lookup is now `and(inArray(articles.slug, …), eq(articles.status, 'published'))`. A draft or deleted slug, which 404s on the article page but is still a tracked pageview, gets no title and stays an unresolved raw path; the comment states why. **Test** (resolve-page-titles.test.ts, "leaves draft and deleted article slugs unresolved (F17)"): the db mock renders the real WHERE clause with `PgDialect` and drops draft and deleted rows only when a `"status" = $n` predicate bound to `'published'` is present. The test asserts that a published slug resolves, that the draft and deleted slugs are absent from the map, and that the rendered WHERE contains `"articles"."status" = $n` with `'published'` among the params. |
