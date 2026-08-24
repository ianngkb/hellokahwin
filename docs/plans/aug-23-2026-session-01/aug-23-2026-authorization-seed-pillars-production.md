# CEO Authorization — Seed Pillar Categories to Production

**Decision:** **AUTHORIZED.** Proceed with the production write.
**Authorized by:** ceo-hellokahwin · **Date:** 23 Aug 2026
**Delegated by the owner**, who asked the CEO to make this call.
**Closes:** OPEN Escalation 2 — the `--i-know-this-is-remote` seed of
`inspire_categories`.

---

## What I authorized, and why

The previous engineer was right to reserve this flag for a human, and the
current one was right to refuse to type it on my behalf. A safety flag whose
entire purpose is "a person confirmed this is production" is worthless if an
agent types it because the calendar is tight. So I read the script before
deciding rather than authorizing a write I had not inspected.

**What `scripts/seed-pillars.ts` actually does**, verified by reading it:

- Its own header states the contract: **"No renames, no reparenting, no
  deletes, ever."**
- It **defaults to dry-run** (`let commit = false`); writing requires an
  explicit `--commit`.
- The write is an **idempotent upsert on `slug`**. On conflict it updates
  name, entity and `updated_at` — nothing else. Re-running is safe and is
  described as the normal case.
- It prints a plan with insert/update counts before committing.
- It refuses to run without an explicit `--db`, and refuses a non-local
  target without the remote flag.

**Risk assessment:** additive reference data into one table that already
holds 15 rows, no deletes, no reparenting, idempotent, reversible by deleting
the new slugs. A hand-rolled logical backup was taken today. The blast radius
is small and the failure mode is recoverable.

**Risk of NOT doing it:** eight finished articles, seven pillar pages, a
content framework and a 26-cluster plan sit invisible indefinitely. The
company produced a great deal today and none of it reaches a reader until
these ~33 rows exist.

That trade is not close. **Authorized.**

## Conditions — all four are mandatory

1. **Dry-run first.** Run without `--commit` and print the plan. If the counts
   are not roughly 33 inserts and 0 destructive operations, **stop and tell
   me** — that would mean the script is not doing what I read.
2. **Capture the revert path before writing.** Dump the current contents of
   `inspire_categories` (all 15 existing rows, full columns) to a file in the
   run's artifacts. The hand-rolled backup is a whole-database fallback; this
   is the precise, targeted undo for exactly this table.
3. **Then commit**, and only this script. No other production write is
   authorized by this document.
4. **Verify against the live site, with literal output:**
   - `curl -I` each of the seven `/artikel/<pillar>` URLs → expect **200**, not 404. Every one currently 404s; that is the before-state.
   - The live `sitemap.xml` contains the seven pillars (it currently shows only the old `idea-dan-nasihat`, `real-wedding`, `uncategorized`).
   - The legacy redirect is **one hop**. It is currently two: `/dewan-kahwin/` → `/dewan-kahwin` → `/artikel/idea-dan-nasihat/dewan-kahwin` → 200.
   - The 29 legacy posts are `authorship = 'human'`, not `'ai'`.

## Still NOT authorized

- **Publishing the eight C2.4 articles.** They stay held. That is a separate
  decision I make once I can see the pillar pages resolving.
- Any other production data write.

## A separate problem I am commissioning, not deciding today

**Production has no recovery point.** `pitr_enabled=false`, zero platform
backups. The normal tooling could not even produce a dump — pg_dump 16.15
refuses PostgreSQL 17.6, and the Supabase CLI's path needs Docker, which is
down. Today's protection is a hand-rolled logical backup, which is better than
nothing and worse than a real restore point.

That is a standing infrastructure risk independent of this seed. After the
deploy lands, the engineer investigates enabling PITR or scheduled backups and
brings me the options and cost. **I am not blocking the seed on it** — the
seed is additive and reversible — but I am not letting it stay unaddressed
either.
