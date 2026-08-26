# Done — RISK-01 — Production has a recovery point

**Item:** RISK-01, sprint 01. Gates six other production-content items.
**Brief:** `docs/plans/aug-23-2026-session-01/aug-24-2026-brief-r2-database-backup.md`
**Executed:** 25–26 Aug 2026.

---

## The headline

The production database now has a restore path that somebody has actually
walked. A dump exists in R2, it has been restored twice — once from the local
file and once from the object pulled back out of the bucket — and every row
count, every index, and a byte-for-byte hash of the entire article corpus match
production exactly.

The daily schedule is **live on `master`** and both workflows are registered
`active`. The alarm has been proven the only way that counts — broken on
purpose, watched to fire, and put back.

And the PITR question is settled, decisively, against PITR: **$125/month
minimum**, not the few dollars that would have made it the better answer.

---

## 1. The dump-tooling problem

### What failed

**The Supabase CLI route — blocked.** Docker Desktop's processes are running
(`com.docker.backend`, four `Docker Desktop` processes) but its Linux engine is
broken: every call returns

```
request returned 500 Internal Server Error for API route and version
http://%2F%2F.%2Fpipe%2FdockerDesktopLinuxEngine/v1.54/info
```

The CLI itself is present (`supabase` 2.84.2) but its `db dump` path needs that
engine. This is the same Docker outage the brief recorded on 23 Aug; it has not
recovered on its own.

**The "install a matching pg_dump" route via the package manager — blocked.**
Scoop's `postgresql` manifest is pinned to **18.3** and carries no 17.x variant.
Installing it would have given a pg_dump 18 against a server on 17 — the same
class of mismatch as the 16-vs-17 problem, just in the other direction.

Worth recording, because the brief assumed otherwise: **there was no PostgreSQL
client on this machine at all.** `pg_dump`, `psql`, `pg_restore`, `createdb` and
`dropdb` are all absent from PATH, and `C:\Program Files\PostgreSQL` does not
exist. The "pg_dump 16.15" in the brief was not a local install — it was
whatever the agent that hit the original blocker happened to reach.

### What worked

**A version-exact binaries zip from EDB, unpacked into a scratch directory.**

```
https://get.enterprisedb.com/postgresql/postgresql-17.6-1-windows-x64-binaries.zip
329,891,687 bytes, downloaded in 147s, exit 0
```

```
pg_dump (PostgreSQL) 17.6
pg_restore (PostgreSQL) 17.6
psql (PostgreSQL) 17.6
initdb (PostgreSQL) 17.6
pg_ctl (PostgreSQL) 17.6
```

Production reports `PostgreSQL 17.6 on x86_64-pc-linux-gnu`. That is an exact
major *and* minor match, not merely a compatible one.

Two things make this the right answer rather than just the one that worked:

- It needs no installer, no administrator rights, and no service registration.
  It is a zip of binaries; deleting the directory uninstalls it.
- It ships `initdb` and `pg_ctl`, which meant **the restore target did not need
  Docker either**. The proof below runs against a real PostgreSQL 17.6 cluster
  created on the spot, which is a stronger check than restoring into a
  different major version would have been.

### The connection path, which was its own small problem

The direct database host is **IPv6-only** and unreachable from this machine:

```
db.nyidzlupgmyyazhyykuk.supabase.co   AAAA 2406:da18:1f5e:4100:1f35:c45b:d521:fbc6
                                      (no A record)
Test-NetConnection :5432  ->  TcpTestSucceeded: False
```

Supabase's Management API hands out the pooler on **port 6543, transaction
mode** — which `pg_dump` cannot use, because it needs a real session. The
combination that works is the *same host on port 5432*, session mode:

```
aws-0-ap-southeast-1.pooler.supabase.com:5432   ->  52.74.252.201, TcpTestSucceeded: True
user postgres.nyidzlupgmyyazhyykuk, sslmode=require
```

None of that was written down anywhere. See the retrospective.

### The dump

```
pg_dump --format=custom --compress=9 --schema=public --schema=drizzle
PGDUMP_EXIT=0
SECONDS: 3.4
DUMP BYTES: 497489
MD5: cf5b3d3e810cf1089f7f4519a51d4547
```

**Scope, and why.** `public` holds every application row. `drizzle` holds the
migration ledger, so a restored database knows which migrations it is already
at. `auth` and `storage` are excluded deliberately — they are structurally
present but hold **zero business rows**, because Clerk owns authentication and
R2 owns media:

```
auth.users            0        storage.objects       0
auth.identities       0        storage.buckets       0
auth.sessions         0        storage.migrations   63   (platform bookkeeping)
auth.schema_migrations 77      drizzle.__drizzle_migrations  4
```

That assumption is load-bearing. If Supabase Auth or Supabase Storage is ever
adopted, the `--schema` list must grow, and the workflow comment says so.

---

## 2. The restore proof

A throwaway PostgreSQL 17.6 cluster was created with `initdb` on port 55432,
and the nine Supabase roles the dump's grants reference (`anon`,
`authenticated`, `service_role`, `authenticator`, `supabase_admin`, …) were
pre-created as `NOLOGIN` so the restore could be checked faithfully rather than
by suppressing what it could not apply.

```
PGRESTORE_EXIT=0
LOG_BYTES=13595
ERROR_COUNT=0
WARNING_COUNT=0
```

### Row counts, production vs restored

Every single one matches.

| table | production | restored |
| --- | ---: | ---: |
| admin_settings | 0 | 0 |
| article_categories | 121 | 121 |
| article_category_redirects | 0 | 0 |
| article_edit_locks | 1 | 1 |
| article_tags | 87 | 87 |
| **articles** | **56** | **56** |
| audit_logs | 0 | 0 |
| dynamic_block_rules | 0 | 0 |
| dynamic_blocks | 0 | 0 |
| **inspire_categories** | **57** | **57** |
| inspire_nav_items | 0 | 0 |
| inspire_tags | 65 | 65 |
| legacy_image_redirects | 1639 | 1639 |
| **media** | **747** | **747** |
| **media_article_usage** | **718** | **718** |
| profiles | 2 | 2 |
| redirects | 0 | 0 |
| seo_indexnow_submissions | 0 | 0 |

**Table count: 18 vs 18.** `drizzle.__drizzle_migrations`: 4 vs 4.

### Structure

```
production: 74 indexes, 52 constraints, 0 policies, RLS enabled on 18 tables
restored:   74 indexes, 52 constraints, 0 policies, RLS enabled on 18 tables
```

The zero-policies figure is not a restore gap — production genuinely has no RLS
policies, only RLS switched on, and the app connects as a role that bypasses it.
Checking that against production first is what stopped it being reported as data
loss.

### The spot-checked article

```
                       PRODUCTION                          RESTORED
id        027e227c-1543-40ae-b937-aa80a4b806c7   027e227c-1543-40ae-b937-aa80a4b806c7
slug      sentosa-janda-baik                     sentosa-janda-baik
title     Majlis Perkahwinan Penuh Nilai         Majlis Perkahwinan Penuh Nilai
          Budaya di Sentosa, Janda Baik…         Budaya di Sentosa, Janda Baik…
body len  11925                                  11925
body md5  e649ba0b29f75643777e6cdd3f4f35ff       e649ba0b29f75643777e6cdd3f4f35ff
```

And rather than trust one article, a digest over *every* article body and
*every* media R2 key:

```
ALL_ARTICLES_BODY_MD5   27708377d4dd2a9f67730bcfa347ad0c   (both sides)
ALL_MEDIA_MD5           6569f77b1049684c449d20aa8c0296e5   (both sides)
```

All 56 article bodies and all 747 media rows are byte-identical to production.

### The round trip — restored from R2, not from the local file

A dump that restores from the file on the machine that made it proves less than
it looks. So the object was pulled back out of the bucket and restored again:

```
download from R2 -> 497489 bytes, MD5 cf5b3d3e810cf1089f7f4519a51d4547  (identical)
pg_restore into restore_from_r2:  EXIT=0, ERRORS=0, WARNINGS=0
table count 18
ALL_ARTICLES_BODY_MD5  27708377d4dd2a9f67730bcfa347ad0c   (identical)
ALL_MEDIA_MD5          6569f77b1049684c449d20aa8c0296e5   (identical)
```

Production → dump → R2 → download → restore, with the hashes matching at both
ends.

---

## 3. The R2 object

```
key:    db-backups/2026/08/25/hellokahwin-20260825T161107Z.dump
bucket: hellokahwin-assets
size:   497489 bytes
ETag:   cf5b3d3e810cf1089f7f4519a51d4547   (== local MD5)
```

R2 returns the MD5 as the ETag for a single-part PUT, so that equality is proof
the bytes in the bucket are the bytes that were dumped, not just that a file of
the right length arrived.

Three more sit beside it, all written by CI runs. This is the complete contents
of the bucket:

```
2026-08-26 00:18:03   497489  db-backups/2026/08/25/hellokahwin-20260825T161107Z.dump   (local, 17.6)
2026-08-26 00:26:04   497520  db-backups/2026/08/25/hellokahwin-20260825T162543Z.dump   (CI branch, 17.11)
2026-08-26 00:27:46   497519  db-backups/2026/08/25/hellokahwin-20260825T162721Z.dump   (CI branch, 17.11)
2026-08-26 00:40:10   502159  db-backups/2026/08/25/hellokahwin-20260825T163938Z.dump   (CI master, 17.11)
```

The ~30-byte spread among the first three is the pg_dump version string in the
header — 17.6 locally against 17.11 on the runner.

The fourth is 4.6 KB larger, and that was checked rather than assumed: between
dumps another session added rows, `media` 747 → **757** and
`media_article_usage` 718 → **720**. Real data growth, not a dump anomaly — and
incidental evidence that the backup tracks live changes rather than replaying a
cached result.

All four are complete backups, not duplicate uploads, and there is no test
debris or stray object anywhere in the bucket.

---

## 4. State of the schedule

### The mechanism, and why the obvious one is wrong

| option | verdict | where the DB credential lives |
| --- | --- | --- |
| **Vercel cron on a protected route** | **Rejected — cannot work** | already in Vercel env as `DATABASE_URL` |
| **GitHub Actions** | **Chosen, built** | GitHub Actions secrets, `SUPABASE_DB_URL` |
| Windows scheduled task | Rejected | vault (DPAPI, this machine only) |

**Vercel cron was the natural fit and it is not merely worse, it is impossible.**
`pg_dump` is a binary. Vercel's serverless runtime has no PostgreSQL client and
no way to install one, so a Vercel cron route could only produce a backup by
hand-rolling row-by-row SQL — which is precisely the fragile thing this item
exists to replace. The project already runs a Vercel cron at
`/api/cron/publish-scheduled` behind `Authorization: Bearer $CRON_SECRET`, so
the pattern was available and the credential story was already solved; the
runtime is the blocker, not the plumbing.

**A Windows scheduled task was rejected on the credential story.** The vault is
DPAPI-encrypted to one Windows user on one machine, so the backup would only run
while that laptop is on and logged in. A recovery point that depends on someone's
laptop being awake is not a recovery point.

**GitHub Actions wins on all three counts:** the runner can install a real
`pg_dump` pinned to the server's major version; the credential lives in GitHub's
own secret store, injected as an env var for the single step that needs it and
never written to the repo; and it runs whether or not anyone is at a desk.

### What was built

Two workflows, on branch **`ianngkb/risk01-db-backup-to-r2`**
(worktree: `C:\Users\Ian Ng\orca\workspaces\hellokahwin-site\risk01-db-backup`),
in the site repo `ianngkb/hellokahwin` — the one that deploys to Vercel:

- **`.github/workflows/db-backup.yml`** — daily at 18:17 UTC (02:17 MYT).
  Installs `postgresql-client-17`, refuses to run if client and server majors
  disagree, dumps, refuses to upload a dump under a 100 KB floor or one
  `pg_restore --list` cannot read, uploads, re-reads the object and compares
  ETag against local MD5, applies retention, and files a GitHub issue on failure.
- **`.github/workflows/db-backup-verify.yml`** — the alarm, described in §6.

### Secrets — set, live, and never printed

All four are on the repo, sourced from the vault via `vault.ps1 run` and piped
to `gh secret set` over stdin so no value ever touched a command line, a file,
or this log:

```
R2_ACCESS_KEY_ID          (32 chars)
R2_SECRET_ACCESS_KEY      (64 chars)
R2_ACCOUNT_ID
SUPABASE_DB_URL           (154 chars, session-mode pooler, sslmode=require)
```

### Proven in CI, not asserted

`workflow_dispatch` only fires from the default branch, so a temporary
branch-push trigger was added to get genuine CI runs, and is removed before merge.

**Run 32871716720 — FAILED, and this is the useful one.** The version guard
caught, in CI, the exact bug from the brief:

```
pg_dump major=16   server major=17
##[error]pg_dump 16 cannot be trusted against server 17 — bump PGMAJOR and re-run.
```

Installing `postgresql-client-17` is not enough: the runner image already ships
a client at `/usr/bin` that shadows it. Fixed by prepending
`/usr/lib/postgresql/17/bin` to `GITHUB_PATH`.

**Run 32871868865 — SUCCESS.**

```
/usr/lib/postgresql/17/bin/pg_dump
pg_dump (PostgreSQL) 17.11 (Ubuntu 17.11-1.pgdg24.04+2)
pg_dump major=17   server major=17
dump bytes: 497520
restorable TABLE DATA entries: 19
key:          db-backups/2026/08/25/hellokahwin-20260825T162543Z.dump
local bytes:  497520
remote bytes: 497520
local md5:    07947b68169ea247b3c088ff9fce1df3
remote etag:  07947b68169ea247b3c088ff9fce1df3
2026-08-25  age=0d  keep (daily window)  …161107Z.dump
2026-08-25  age=0d  keep (daily window)  …162543Z.dump
```

### Status: LIVE on the default branch

RISK-01 was reopened by the CEO on exactly the right ground — a workflow on a
feature branch never fires, and a backup that does not run is the souvenir the
brief was written against. That was correct and the item was not done.

**Before merging, the Vercel side effect was converted from a question into a
check:** compare `origin/master` against the commit actually live in production.

```
origin/master HEAD                        d53fb821939c47a88c4d714d547d636502b7e580
Vercel production (hellokahwin-qx9kvfvbg) d53fb821939c47a88c4d714d547d636502b7e580
                                          READY, 2026-08-25 12:15:30Z, branch master
```

Identical, so `master` held nothing undeployed and the merge could only be a
no-op redeploy of already-live code plus two workflow files that do not affect
the build. Merge proceeded on that basis.

**PR #2 merged 2026-08-25T16:38:58Z**, squash commit
`eebca16854dff21df79eb9cfef9e24cd058c0e66`.

Both workflows are registered and **active** on `master`:

```
342250539  state=active  path=.github/workflows/db-backup.yml          name=DB backup to R2
342253077  state=active  path=.github/workflows/db-backup-verify.yml   name=DB backup freshness alarm
```

And they run there for real. `workflow_dispatch` only works from the default
branch, so a successful dispatch on `master` is itself proof the workflows are
live where the scheduler looks:

```
32873254079  DB backup to R2             completed/success   (ref master)
32873257728  DB backup freshness alarm   completed/success   (ref master)
```

That backup run wrote `db-backups/2026/08/25/hellokahwin-20260825T163938Z.dump`,
502,159 bytes. Next scheduled fire is the `17 18 * * *` cron — 18:17 UTC daily.

---

## 5. Retention and cost

**Proposed policy — the brief's instinct, adopted unchanged:** every daily
backup kept for **30 days**, then the **1st of each month kept for a year**.
Steady state is 30 + 12 = **42 objects**.

The logic was replayed offline against synthetic keys at every boundary before
being trusted, because a retention bug deletes backups silently:

```
2026-08-25  age=   0d  keep (daily)      2026-08-01  age=  24d  keep (daily)
2026-08-10  age=  15d  keep (daily)      2026-07-01  age=  55d  keep (monthly)
2026-07-26  age=  30d  keep (daily)      2026-03-01  age= 177d  keep (monthly)
2026-07-25  age=  31d  PRUNE             2025-08-01  age= 389d  PRUNE
2026-07-24  age=  32d  PRUNE             2025-07-15  age= 406d  PRUNE
```

### The cost

```
42 objects x 497,489 bytes = 20,894,538 bytes = 0.0209 GB
R2 Standard storage: $0.015 / GB-month  ->  $0.00031 / month
Class A operations: ~150 / month at $4.50 / million  ->  $0.0007 / month
Egress: free
```

**R2's free tier is 10 GB-month of storage, 1M Class A and 10M Class B
operations per month.** This policy uses **0.21% of the storage allowance** and
about 0.015% of the Class A allowance.

**The actual monthly cost is $0.00.** Under a few dollars by three orders of
magnitude — flagging that plainly, as the brief asked, so it can be approved
directly.

There is a lot of headroom: the free tier would still cover 42 copies at ~238 MB
each, roughly **500× the current dump size**. The database is 16 MB today with
56 articles; this policy does not need revisiting on cost grounds for a long
time.

---

## 6. Making failure loud

Two failure modes, and they are not the same problem.

**The job runs and fails.** `db-backup.yml` files a GitHub issue labelled
`backup-alarm` on any step failure, reusing one open issue rather than filing a
fresh one nightly.

**The job stops running at all** — disabled workflow, revoked credential, a
schedule that quietly stopped. Nothing goes red, because nothing ran, and the
false confidence lasts until someone needs a restore. This is the mode the brief
called out, and a job that watches itself cannot catch it.

So `db-backup-verify.yml` does not watch the job. **It watches the artifact.**
It runs separately at 22:17 UTC — four hours after the backup, so a delayed run
is not mistaken for a missing one — lists `db-backups/` in R2, and fails if the
newest object is older than **26 hours** or under the size floor. That check is
true or false regardless of *why* a backup is missing, which is the property an
alarm needs.

**The alarm is proven twice over, not described.**

*First, unplanned.* When CI run 32871716720 failed on the pg_dump version guard,
it filed issue **#1, "ALARM: hellokahwin production DB backup failed"**,
automatically, at 16:24:19Z. A real alarm on a real failure, not a test.

*Then, deliberately, on the branch that matters.* An alarm that has only ever
fired by accident is still a hypothesis about the *other* failure mode — the one
where nothing runs. So the dead-man's-switch branch was tripped on purpose, on
`master`:

**Break** — commit `4d7fbcd` set `MAX_AGE_HOURS: '-1'`, so `[ age_h -gt -1 ]` is
true against a backup 0h old. This exercises the age comparison specifically,
rather than a generic step failure. Nothing in production was touched and no R2
object was altered or deleted.

**Fire** — run **32873378190**, `completed/failure`:

```
newest key: db-backups/2026/08/25/hellokahwin-20260825T163938Z.dump
size: 502159 bytes
last modified: 2026-08-25T16:40:10+00:00
age: 0h (threshold -1h)
::error::Newest backup is 0h old, over the -1h threshold — the backup job has stopped running.
```

**Surface** — issue **#3, "ALARM: hellokahwin production DB backup is stale or
missing"**, filed automatically at **2026-08-25T16:40:46Z**, label
`backup-alarm`, with the diagnosis carried through into the body rather than
left in the log:

> Detected: the newest backup is 0h old (threshold -1h) — the backup job has
> stopped running.

**Revert** — commit `18a23d1` restored `MAX_AGE_HOURS: '26'`. Confirmed by
reading the file back from `master` through the API, not from local disk.

**Prove it is back** — run **32873495210**, `completed/success`:

```
newest key: db-backups/2026/08/25/hellokahwin-20260825T163938Z.dump
size: 502159 bytes
age: 0h (threshold 26h)
```

Issue #3 was then closed with a comment recording that it was an induced test.
Both alarm issues are now closed; the code path that files them is untouched.

**Known gap, stated rather than hidden:** GitHub disables scheduled workflows
after 60 days of repository inactivity, and both workflows would go quiet
together. GitHub emails before it does this. The repo is committed to daily at
present, so the risk is low — but it is the one way this alarm can go silent, and
it should be revisited if the repo ever goes quiet for weeks.

---

## 7. The PITR price

**Asked for as a number. Here is the number, from this project's own billing
API — not from memory and not from the generic pricing page.**

`GET /v1/projects/nyidzlupgmyyazhyykuk/billing/addons`:

| add-on | retention | price |
| --- | --- | ---: |
| `pitr_7` | 7 days | **$100 / month** |
| `pitr_14` | 14 days | **$200 / month** |
| `pitr_28` | 28 days | **$400 / month** |

And the part that changes the answer:

```
GET /v1/organizations/hcjszuowkpervvpflsvy   ->  "plan": "free"
GET /v1/projects/.../database/backups        ->  pitr_enabled: false, backups: []
```

**The organisation is on the Free plan, and PITR cannot be bought on Free.** It
requires Pro, which is **$25/month**. The public pricing page confirms both
figures independently ("$100 per month per 7 days retention"; Pro "from
$25/month"; Free backups "Not included").

### **Real cost to enable PITR: $25 + $100 = $125/month minimum.**

That settles the brief's open question in the opposite direction to the one it
hoped for. PITR is not a few dollars, so it does not make the R2 job moot — the
R2 job **is** the primary defence, at $0.00/month, and it is now the only one.

**A middle option the brief did not name, worth putting in front of the owner:**
**Supabase Pro alone, at $25/month, adds daily platform backups with 7-day
retention** — which the Free plan does not have at all — without paying the
extra $100 for point-in-time granularity. That buys same-platform daily backups
managed by Supabase as a complement to the off-platform R2 copy, for a quarter
of the PITR price. It is a real decision, not a formality, and it is the owner's
to make.

---

## Rules compliance

- **Read-only against production.** The only statements run against production
  were `SELECT`, `SHOW`, and `pg_dump`. No writes. The only writes anywhere were
  to R2, to the two throwaway local databases, to new files on a new branch, and
  to this log.
- **No secrets anywhere.** Every credential came from `vault.ps1 run` or a
  platform secret store. No value was printed, written to a file, or committed.
  Secrets are reported by length only.
- **No hand-rolled row-by-row SQL.** The dump is `pg_dump` custom format,
  version-matched to the server.
- **Throwaway restore databases cleaned up** — see the cleanup note at the end.

---

## Retrospective

### What did we learn that is not written down

**How to actually connect to this database.** This cost more time than the dump
did, and none of it was recorded anywhere:

- The direct host `db.nyidzlupgmyyazhyykuk.supabase.co` is **IPv6-only** and
  unreachable from a machine without IPv6 egress, which includes this one.
- Supabase's own Management API advertises the pooler on **port 6543,
  transaction mode**, which `pg_dump` cannot use at all. The working combination
  is the **same host on port 5432, session mode**, user
  `postgres.nyidzlupgmyyazhyykuk`, `sslmode=require`.
- The password is vault key **`supabase.hellokahwin-dbpass`**, which appears in
  `vault.ps1 list` but is named in no document.

An agent handed "back up the production database" has to rediscover all four
facts, and the obvious paths — the direct host, and the connection string the
API hands you — both fail.

**That installing `postgresql-client-17` does not give you pg_dump 17.** The
runner image's own client at `/usr/bin` shadows it. This is the 16-vs-17 bug
from the brief, reappearing in a completely different environment, and it would
have been shipped silently if the workflow had not been made to assert its own
client version.

**That "no PostgreSQL client" is the real local state.** The brief's premise —
pg_dump 16.15 refusing 17.6 — described a version conflict. The actual machine
had no client at all, which changes the fix from "upgrade" to "install", and
makes the version-exact binaries zip the obvious move rather than a clever one.

### Which document must change, and who owns the edit

**1. `C:\Users\Ian Ng\Documents\Code\buddy\skillcentral\skills\tokens\registry.md`
— owner: whoever runs `/tokens audit`.** It is the map of how to reach every
credentialed system, its `hellokahwin` entry is detailed about Clerk, R2, Vercel
and Doppler, and it says nothing about how to open a database connection. Its
own stated failure mode is "a registry that has drifted from reality is worse
than none, because it answers confidently and wrong" — and on the database it
was simply silent. **EDITED.**

**2. `docs/boardroom/ceo-memory.md` — owner: the CEO agent.** It carries
"⚠ Production has NO recovery point … Every production write is unrecoverable.
Escalated to urgent." That line is now false, and a standing memory that is
false in the alarming direction will keep re-escalating a solved problem.
**EDITED.**

**3. `docs/sprints/sprint-01.json` — owner: `/startsprint`.** RISK-01 was
`in_progress` with `evidence: null`. It gates six items; leaving it unmarked
blocks the sprint on a completed item. **EDITED.**

### What did we do twice

**The restore, three times, and that was the right call** — once from the local
file, once after rebuilding the target when `CREATE SCHEMA public` collided, and
once from the object downloaded back out of R2. Only the third proves the thing
that matters, which is that the object *in the bucket* is restorable.

**The R2 upload, twice, and that was a defect** — see below.

**Reading the restore log twice.** The first clean run produced no output, and
PowerShell's `Tee-Object` left the previous run's error file in place, so a
successful restore appeared to have logged an error. Believing the stale file
would have meant reporting a fault that did not exist. Re-run with explicit
redirection.

### What did we nearly ship, and what caught it

**A backup filed under the wrong date.** The first upload landed at
`db-backups/2026/08/26/…` for a dump whose timestamp is `20260825T161107Z`.
PowerShell's `[datetime]::ParseExact` saw the trailing `Z`, treated the string
as UTC, and converted it to local time (+08), rolling the date forward a day.

It is a small-looking bug with a nasty shape. The whole point of the key layout
is that it sorts chronologically and that the date path agrees with the
filename; a directory date that silently follows the *operator's* timezone
breaks both, and it only misfires for eight hours out of every twenty-four — so
it would have looked correct most of the time and corrupted the ordering the
rest. The freshness alarm sorts on exactly this key.

Caught by reading the key that came back instead of the key that was intended.
The mis-dated object was deleted and re-uploaded to
`db-backups/2026/08/25/…`; the bucket now holds no stray copy.

**Designed out rather than patched:** in the workflow, the filename and the
directory path come from the same `date -u` call, so they cannot disagree, and
no timezone conversion exists to get wrong.

**The second near-miss was caught by the code itself**, which is the outcome to
want: CI run 32871716720 failed its own version guard on `pg_dump major=16 /
server major=17`. Without that assertion the job would have gone on to fail
inside `pg_dump` with a confusing error — or, worse, silently produced dumps
with a mismatched client against some future server.

### Addendum after the reopen — the real lesson of this item

The CEO reopened RISK-01 after the first close, and was right to. The DoD said
"runs on a schedule". The schedule was written, tested, credentialed and green
in CI — and could not fire, because it sat on a feature branch. **The log said
so plainly and the item was still marked done.** That gap between an honest log
and a dishonest status is the failure worth recording, more than any technical
detail above.

Two things are worth generalising:

**"Tested" and "running" are different claims, and the gap is invisible in a
green check.** Every piece of evidence gathered before the merge was real: real
runs, real objects, real hashes. None of it established the one property the DoD
actually asked for. A CI run proves the code works; it does not prove the code
is *installed anywhere it will ever be invoked from*. For anything scheduled,
the completion test is "show a run originating from the schedule's own branch",
not "show a passing run".

**A blocker reported to the owner is not the same as a blocker resolved.** The
Vercel-deploy side effect was flagged as a reason to stop and ask. That was the
right instinct and the wrong stopping point — the question was answerable
without the owner, by comparing `origin/master` against the deployed commit. It
took one API call and turned a decision into a check. **When escalating, first
ask whether the thing being escalated is a fact that could simply be looked up.**
This is the same lesson `ceo-memory.md` already records about the Vercel token
("check the registry BEFORE escalating a credential"), arriving from a different
direction — which is a reason to believe it is a real pattern and not a one-off.

**What that changes going forward:** an item whose DoD contains "runs on a
schedule", "is deployed", or "is live" cannot be closed on CI evidence alone.
It needs a run from the branch or environment that will actually invoke it, and
for anything with a failure alarm, a deliberate break proving the alarm surfaces.

### Document edits made

| file | change |
| --- | --- |
| `skillcentral/skills/tokens/registry.md` | Added the database connection facts under `hellokahwin`: session pooler host/port, the IPv6-only direct host, the 6543-vs-5432 trap, the `supabase.hellokahwin-dbpass` vault key, the backup workflow, and the PITR/plan figures. |
| `docs/boardroom/ceo-memory.md` | Replaced the "NO recovery point" warning with the current state, the restore proof, the schedule's exact status, and the $125/month PITR figure. |
| `docs/sprints/sprint-01.json` | RISK-01 → `done` with the merge, dispatched-run and induced-alarm evidence; `points.done` 22 → 27. The CEO's `verified_by_ceo` reopen verdict was **preserved verbatim, not overwritten** — a fresh verification is theirs to write, not the agent's to assert. |

---

## Cleanup

The throwaway restore databases `restore_probe` and `restore_from_r2` were
dropped, the local PostgreSQL 17.6 cluster was stopped (`server stopped`,
exit 0) and its data directory deleted, and port 55432 is no longer listening.
The unpacked binaries and the dump file live only in the session scratchpad,
outside the repo.

The R2 bucket holds exactly the four legitimate backup objects listed in §3 and
nothing else — no stray, mis-dated, or test objects. Verified by a full
`--recursive` listing of the bucket, not just the `db-backups/` prefix.

Issues #1 and #3 are both closed, each with a comment recording what caused it
and what resolved it. The code path that files them is unchanged and stays armed.

Master is at `18a23d1` with the alarm threshold back at its real value; the only
lasting change to the repo is the two workflow files.

**Not committed:** the three document edits and this log are written to disk but
left uncommitted in the `hellokahwin` docs checkout, on instruction. That repo is
on the `feat/command-centre-dashboard` lineage with other sessions working in it
concurrently, so committing here risks sweeping up work that is not mine, and
`docs/sprints/sprint-01.json` is untracked there in any case. The workflow code
is a separate repo and lineage, and is merged to `master`.
