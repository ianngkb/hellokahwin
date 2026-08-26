# Brief — BMAD — Give production a recovery point, using R2 we already own

**Status:** APPROVED — executing. CEO decision under standing autonomy,
24 Aug 2026, at the owner's direct request ("can we also plan out an R2 backup
somewhere").

**Dispatch:** after the article publish verifies — not concurrently. Two agents
writing to the same production database in the same window is how you lose the
ability to tell which one broke it.

**Execute through `/autopilot`.**

---

## The problem, stated plainly

`hellokahwin` production Supabase (project `nyidzlupgmyyazhyykuk`) has:

- `pitr_enabled = false`
- zero platform backups
- and normal tooling that **cannot even produce a dump** — `pg_dump` 16.15
  refuses PostgreSQL 17.6, and the Supabase CLI path wants Docker, which was
  down when this was found.

We have been running the company's only content database with no recovery point
since at least 23 Aug. Today it took eight finished articles and a probe. It has
been logged twice as a risk and not fixed, which is on me.

Today's only protection is a hand-rolled logical backup taken once, by hand, on
23 Aug. That is not a backup system. It is a souvenir.

## Why R2, and why this is the right shape

The owner's instinct here is correct and it is the cheap answer:

- **`hellokahwin-assets` already exists and is empty** in the TWN Cloudflare
  account — a bucket with no other job, sitting there.
- **Master R2 credentials are already rolled and fully verified** (23 Aug):
  list buckets, object read/write, bucket create/delete all confirmed working.
  Vault keys `cloudflare.twn`, `r2.twn-master-keyid`, `r2.twn-master-secret`.
- So the storage, the credentials and the access path are **already solved**.
  What is missing is the dump and the schedule.

No new vendor, no new spend, no new credential to wait on. That is why this is
being done now rather than as a procurement exercise.

## What I want

1. **Solve the dump-tooling problem first, and report what actually worked.**
   `pg_dump` 16.15 against PostgreSQL 17.6 is the known blocker. Options worth
   trying, in no particular order: install a matching `pg_dump` 17.x, use the
   Supabase CLI once Docker is up, or dump through a container image pinned to
   17.x. **Do not** work around it by hand-rolling row-by-row SQL — that is what
   we have now and it is what we are replacing. If none of the three work, stop
   and tell me what you tried rather than shipping something fragile.

2. **A real logical backup, verified by restore.** A dump nobody has restored is
   a hypothesis. Take the dump, restore it into a throwaway local database, and
   **prove it** — table count, row counts on `articles`, `inspire_categories`
   and the media tables, and one spot-checked article body compared against
   production. Show the literal numbers. A backup that has never been restored
   does not count as a backup, and I will not accept one.

3. **Push it to R2, into `hellokahwin-assets`.** Key layout under a `db-backups/`
   prefix, timestamped and sortable — `db-backups/YYYY/MM/DD/hellokahwin-<utc
   timestamp>.dump`. Compressed. Note the resulting object size; it decides
   whether retention is cheap or needs thought.

4. **Schedule it.** Daily is the target. Propose the mechanism rather than
   assuming one — a Vercel cron hitting a protected route, a GitHub Action, or
   a scheduled task — and tell me the trade-offs, particularly around where the
   database credential lives in each. **The credential must come from the vault
   or the platform's own secret store; never a file in the repo.**

5. **Retention and cost.** Propose a policy (my instinct: daily for 30 days,
   then monthly for a year) and tell me what it costs per month at the observed
   dump size. If it is under a few dollars, say so and I will approve it
   directly; if it is not, bring me the number.

6. **Make failure loud.** A backup job that silently stops is worse than no
   backup, because it buys false confidence. Tell me how we would know within a
   day that it had stopped — and build that, not just describe it.

## Also settle this, because it may make most of the above moot

**Get the actual price of Supabase PITR for this project's tier.** If PITR is a
few dollars a month, it is strictly better than anything above — continuous
recovery to a point in time rather than a daily snapshot — and the R2 job
becomes a cheap off-platform second copy rather than the primary defence. I want
the number, not a recommendation about the principle. Both can be true: PITR for
recovery, R2 for off-platform durability.

## Rules

- Credentials from the vault via `vault.ps1 run`; never hardcoded, never printed.
- **Read-only against production for the dump.** This work protects the
  database; it does not modify it. The only writes in this brief are to R2 and
  to a throwaway local restore target.
- Report literal output — sizes, row counts, exit codes, the R2 object key.

## When done

Log to `docs/work-done/aug-23-2026-session-01/` and report: what made the dump
work, the restore proof with its numbers, the R2 object key and size, the
proposed schedule with its credential story, the retention cost, the failure
alarm, and the PITR price.

---

## SPRINT 01 ADDENDUM — RISK-01, dispatched 25 Aug via /startsprint

**This item gates the entire sprint.** Six other items write to production content
and none of them run until this is closed. Twenty-eight articles were published
across two days onto a database with no restore path; that is the situation this
ends.

**Definition of done — verbatim from the sprint file, and the bar for this item:**

> A dump exists in R2 (hellokahwin-assets), has been **RESTORED into a throwaway
> database and verified by row count**, runs on a schedule, and fails loudly.
> Plus the actual price of Supabase PITR as a number.

Read that middle clause twice. **A dump nobody has restored is a hypothesis, not
a backup.** The restore and the row-count comparison are the item, not a bonus.

**One extra fact that sharpens the case.** The owner has decided **not** to rotate
the production password exposed in an agent transcript on 24 Aug, and accepted
that risk — reasonably, since the exposure is transcript-only with no repository
or on-disk copy. But the reason that acceptance is affordable is that the blast
radius shrinks the moment a restore path exists. **You are the mitigation for an
accepted risk.**

**Stage 9 retrospective is mandatory.** Log to `docs/work-done/`, then a
`## Retrospective` section: what did we learn that is not written down; **which
document must change and who owns the edit — name the file**; what did we do
twice; what did we nearly ship and what caught it. Then make the edits and log
the paths. A retrospective that names a document and does not change it has
failed.
