# OPEN escalations — for the CEO / owner, not for the engineer to settle

**Status: OPEN. Neither of these is closed, and neither should be counted as closed.**

Both came out of the code review as findings requiring escalation. I initially
resolved them by editing the spec so the code matched — which is changing the
rule so the build passes, not closing a finding. The spec edits have been
**reverted to their original wording**; the code is unchanged and still differs
from the spec in both places. The owner decides which moves.

Both sit in the two areas the owner has said this site has already been burned
in once: **publishing gates** and **production-database access**.

Reverting the spec text breaks no gate. Nothing in the build, the test suite,
the type check or the lint reads this document — it is a planning artifact. The
build is green with the original wording in place.

---

## Escalation 1 — may ingest publish at all?

**a) What the spec says (original wording, now restored):**

> ### B4. What ingest deliberately does not do
>
> It does not publish. `status` defaults to `draft`; publishing to production
> remains a board-approved act. It does not invent metadata — a missing
> `metaDescription` is a refusal, not a generated string.

**b) What the code actually does:**

`scripts/ingest-article.mts` accepts `status: published` in the article file but
ignores it unless `--publish` is passed on the command line. Without the flag
the article is inserted as a draft and the run prints:

```
Status:  draft  (file asks for published; pass --publish to honour it)
```

With `--publish` it inserts `status = 'published'` and sets `published_at`.
Observed both ways against the local database.

So: the file alone cannot publish. A person typing an extra flag can.

**c) My argument for the change, which the owner may reject:**

The approved production workflow (`aug-23-2026-workflow-content-production.md`)
defines Stage 7 as *"`full-stack-engineer` runs the approved article through the
content-ingest path into Supabase"* with the gate *"the page is live, linked
from its pillar, and in the sitemap."* A tool that can never set `published`
cannot reach that gate — publishing would have to happen by hand in the admin,
outside the path the brief asked me to build.

My reading was that "board-approved act" describes **who authorises it**, not
**which tool performs it**, and that an explicit, typed, logged flag is the
mechanism that keeps the authorisation real.

**The counter-argument, which is also good:** the flag exists on my machine and
in my hands. "The board approved this article" and "I typed `--publish`" are not
the same event, and nothing in the tool checks that the first happened.

**What I would need if the owner sides with the spec:** remove `--publish`
entirely; ingest writes drafts only, and publishing stays a deliberate act in
the admin UI where it is attributable to a signed-in person.

---

## Escalation 2 — may the seed script connect to production at all?

**a) What the spec says (original wording, now restored):**

> `scripts/seed-pillars.ts` — idempotent, `--dry-run` by default, requires
> `--commit` to write, refuses to run against a database whose host is not
> explicitly allow-listed on the command line.

**b) What the code actually does:**

It refuses to **write** to a non-local host without `--i-know-this-is-remote`:

```
Refusing: db.example.supabase.com:6543/postgres is not a local database, and writing to it
would create public URLs on a live site. Re-run with --i-know-this-is-remote if
that is genuinely what the board approved.
```

But it will **connect** to any host given with `--db` and run its read queries
to print the dry-run plan. There is no allow-list of hosts.

**c) My argument for the change, which the owner may reject:**

A dry run against production is the thing you most want to see *before*
approving the write — it prints exactly which 33 rows would be inserted or
updated. Refusing to connect would remove that, and the alternative is guessing.
The reads are `SELECT slug, pillar_code FROM inspire_categories`; they mutate
nothing.

**The counter-argument:** the spec said *run*, not *write*, and an engineer
holding a production connection string is the precondition for every accident
that follows. An allow-list is cheap.

**What I would need if the owner sides with the spec:** an explicit host
allow-list (probably just the Supabase pooler host for
`nyidzlupgmyyazhyykuk`), and `--db` refused for anything not on it, dry run
included.

---

## What I have NOT done

I have not counted either of these as closed, and the review verdict artifact
should not be read as clearing them: the reviewer classified both as
"REBUTTAL … NEEDS USER DECISION" / "CONFLICTS WITH SPEC", which is the correct
classification. They are listed here so the disagreement is visible in the
durable record rather than settled in a commit message.
