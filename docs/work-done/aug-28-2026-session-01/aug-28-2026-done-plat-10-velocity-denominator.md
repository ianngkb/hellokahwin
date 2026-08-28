# PLAT-10 — the denominator stopped being something you can shrink

**Sprint 03 · platform · 2pt · owner BMAD · 28 Aug 2026**
**Shipped:** buddy PR [#47](https://github.com/ianng89/buddy/pull/47), squash-merged to `main` as `11e40e6`.

## Claim

Moving an item out of a running sprint no longer reduces `planned`. The exact
Sprint 02 case — 77 points scoped, a 5-point item moved to the backlog — now
computes 94%, not 100%.

## What was wrong

`computeVelocity` read `planned` as *every point currently in the sprint*. The
code commented the growth direction and never the shrink, so the arithmetic had
an incentive baked into it: the cheapest way to raise a completion percentage
was to drag the unfinished card out of the sprint.

Sprint 02 was scoped at **20 items, 77 points** (`docs/sprints/sprint-02.json`).
SEO-04 (5pt) was moved to the backlog while the sprint ran. The tracker then
held 19 items and 72 points and reported **72 of 72**.

The retro copied that 72 into `sprints.retro`, so the recorded figure and the
computed figure *agreed with each other and with nothing else* — and the CLI
printed `(agrees)` beside them. It would have become the Sprint 03 sizing
baseline. The only thing that caught it was one sentence a human typed by hand
into a retro brief.

The tracker's design principle is that velocity is computed and cannot be typed
into. A number nobody can type but anybody can flatter by moving one card is the
same failure in better clothes.

## What changed

`supabase/migrations/20260828060000_sprint_scope_ledger.sql` adds
`sprints.departures` — an append-only jsonb ledger of every item that left a
sprint after it started — plus the trigger that writes it.

**It is a database trigger and not application code, and that was the main
design decision.** The repository could append to the ledger in
`assignToSprint`, and that is two writes with a gap between them. The gap fails
in exactly the direction of the bug being fixed: the move lands, the ledger
write dies, `planned` silently shrinks and nothing says so. A trigger runs inside
the same transaction as the item's own `UPDATE` — either both happen or neither
does — and it cannot be bypassed by the board, the CLI, a hand-typed `update
sprint_items set sprint_id = null` in the SQL editor, or a writer nobody has
written yet.

Three rules the trigger encodes:

- **Only a sprint that is `in_progress` records a departure.** A `planned`
  sprint is still being scoped, and drawing items in and out *is* the planning.
- **Moving an item back in cancels its departure.** Without that, a card dragged
  out and back would be counted twice and `planned` would *inflate*. A
  denominator that can be padded is not more honest than one that can be shrunk.
- **The stamp is the KL calendar day**, `(now() at time zone 'Asia/Kuala_Lumpur')::date`.
  `now()::date` is yesterday for eight hours out of every twenty-four here, and
  that mistake already stamped `started_at` a day early on 2026-08-26.

`computeVelocity` adds the ledger's points into `planned` and reports `movedOut`
and `movedOutCount` as their own figures — visible in `sprint sprints`, `sprint
velocity N` and on `/sprints` under History — rather than folding them in
silently. The gap between what was scoped and what is here is exactly the thing
that was invisible, so it gets a line of its own.

The migration carries **one historical repair**: Sprint 02's SEO-04 departure,
which happened before any ledger existed and which nothing but the authored
sprint file remembers. It is guarded three ways against a re-run (only Sprint 02,
only when the ledger is empty, only when the item total is still 72).

## Evidence

`aug-28-2026-plat-10-EVIDENCE/`

**Before** — the tracker, against the live database, before the migration:

```
Sprint 02  done  planned 72pt  completed 72pt  parked 0pt  moved-out 0pt  unfinished 0pt  19 items
  retro recorded planned 72 / completed 72 / parked 0 (agrees)
```

**After** — same command, same database:

```
Sprint 02  done  planned 77pt  completed 72pt  parked 0pt  moved-out 5pt  unfinished 5pt  19 items

Sprint 02 — Close the publishing hole, then earn a click [done]
  planned     77pt   (as scoped: 72pt across 19 items still here, +5pt moved out)
  completed   72pt   (19 done)
  moved out    5pt   (1 item left after the sprint started — still counted in planned)
  unfinished   5pt   (planned − completed − parked)
  Items that left after it started (their points stay in the denominator):
    SEO-04      5pt   on 2026-08-26  by SYSTEM
  retro recorded planned 72 / completed 72 / parked 0  ← DISAGREES with the item data
  The gap is exactly the 5pt that left this sprint.
```

72 / 77 = **94%**. Not 100%.

**The trigger, live**, in a transaction that rolls back — a throwaway sprint
created to prove a point would sit in the tracker forever, because a `done`
sprint is immutable and nothing in the product deletes a sprint
(`plat10-trigger-proof.sql`, `plat10-trigger-proof.txt`):

```
1. moved out while state=planned       departures=[]
2. sprint started, 2 items             in-sprint points=10  departures=[]
3. moved out while state=in_progress   in-sprint points=8   departures=[{"points":2,"item_key":"PRF-02",…}]  => planned = 10
4. moved back in                       in-sprint points=10  departures=[]                                     => planned = 10
5. moved out again                     departures=[{"points":2,"item_key":"PRF-02",…}]
```

Line 3 is the whole item: the points in the sprint fell from 10 to 8 and
`planned` stayed at 10. Rollback verified — `select count(*) from sprints where
sprint_number >= 9000` returns 0.

**Tests:** 6 new cases in `packages/db/src/repositories/sprints.test.ts`,
including the Sprint 02 reproduction asserting the percentage is not 100;
214 passed across `@buddy/db`. `pnpm lint` clean, `next build` clean.

## Live link

- `/sprints` → History → Sprint 02 — <https://buddy.ian.ng/sprints>.
  **Auth-gated: this needs a signed-in browser.** An anonymous request returns
  `307 → /login`, and so does `/definitely-not-a-real-route`, so a status code
  from that URL is not a measurement and is not offered as one.
- Reproducible without a browser, against the same database:
  `pnpm --silent sprint velocity 2`

## Retrospective

**1. What did we learn that is not written down anywhere?**

That a metric can be honest and still be gameable, and the two failures look
nothing alike. The tracker's whole design was pointed at "nobody can type a
velocity in", which it achieved completely — and left the denominator writable
by anyone who could drag a card. Guarding the *value* did nothing about guarding
the *population it is computed over*. Any derived number needs both.

Second, smaller, and it nearly repeated an old bug: two writes with a gap fail in
a direction, and the direction is what matters. Recording the departure *after*
the move fails toward flattery; recording it *before* fails toward inflation. The
transaction is the only answer that has no direction to fail in.

**2. Which document must change, and who owns that edit?**

`skillcentral/skills/endsprint/SKILL.md`, Step 4 — owned by whoever runs
`/endsprint`, which is the owner. **Done in this change.** Step 4 now requires an
as-scoped reconciliation *before any velocity figure is quoted*: read the point
total from the authored `docs/sprints/sprint-NN.json`, read `sprint velocity N`,
and if they disagree, name the items by name in `sizing_accuracy` rather than
adjusting the number until it matches. Step 4b item 6 now requires a moved-out
row wherever `movedOut` is non-zero.

Worth recording where the bug came from: **`/endsprint` itself tells you to push
carried-forward items out of the sprint before closing it.** That instruction is
correct and it is also the exact move that shrank the denominator. The mechanism
now records it instead of the doctrine trying to remember not to.

**3. What did we do twice that we should never repeat?**

Trusted an agreement between two numbers that came from the same source. The CLI
printed `(agrees)` because the retro had copied the computed figure; two copies
of one wrong number agreeing is not corroboration. The reconciliation added to
Step 4 is against the *authored sprint file*, which is a genuinely independent
source, for exactly this reason.

**4. What did we nearly ship, and what caught it?**

A denominator that could be padded. The first working version added departures
and never cancelled them, so an item dragged out and dragged back in would have
counted twice and reported a *larger* `planned` than the sprint ever had. Writing
the test named "an item moved out and back is counted once, not twice" is what
caught it — the cancel branch did not exist until that test was written.
