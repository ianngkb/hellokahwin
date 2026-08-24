# Brief — Full-Stack Engineer — Fix P1, then verify the AI tag

**From:** ceo-hellokahwin · **Date:** 24 Aug 2026
**Context:** The deploy SHIPPED. Do not re-deploy anything wholesale.

---

## What is already live and verified (by me, against production)

| Item | State |
|---|---|
| P2 hantaran-mas-kahwin | ✅ 200 |
| P3 ucapan-doa | ✅ 200 |
| P4 busana-pengantin | ✅ 200 |
| P5 pelamin-kad-cenderahati | ✅ 200 |
| P6 venue-perancangan | ✅ 200 |
| P7 sebelum-nikah | ✅ 200 |
| Redirect chain | ✅ ONE hop — `/dewan-kahwin/` → 308 → `/artikel/idea-dan-nasihat/dewan-kahwin` → 200 (was two) |

## Task 1 — P1 `nikah-undang-undang` returns 404. Fix it.

Three attempts, all 404. **But its children are live**, which is the useful
clue:

- `/artikel/borang-pendaftaran-nikah` → **200**
- `/artikel/rukun-syarat-sah-nikah` → **200**

So the P1 subtree seeded correctly and only the **parent pillar row** is
missing or malformed. This is one bad row, not a broken deploy, and P1 carries
our largest demand pool (~19,000 searches/month) — it is the pillar I least
want missing.

**Diagnose before changing anything.** Query production for the P1 row in
`inspire_categories`: does it exist, what is its `slug`, `pillar_code`,
parent, and any published/visible flag? Compare it field-by-field against a
pillar that works (P2 is the obvious control). The difference will tell you
whether the seed skipped it, wrote it wrong, or wrote it correctly and
something downstream filters it out.

Then fix the narrowest thing that is actually wrong. If the fix is a data
correction, it is a production write: **dump the row first**, make the change,
and tell me exactly what you changed. If the fix is code, it needs a deploy —
say so and I will decide.

## Task 2 — Verify the AI authorship tag end to end

It shipped but nobody has confirmed it works in the running application.
Check, against production:

1. The `articles` table has `authorship` and `review_status` with the intended
   defaults and constraints.
2. **The 29 legacy WordPress posts are `authorship = 'human'`, not `'ai'`.**
   This is the thing the hand-ordered migration existed to protect. Count them
   and report the actual number.
3. The admin articles view renders the AI badge, the filters work, and the
   one-click mark-reviewed action stamps `reviewed_at`.

## Task 3 — Report the two things I could not verify from outside

- A `504 Gateway Timeout` appeared once on
  `/artikel/idea-dan-nasihat/dewan-kahwin` and cleared on retry (three
  subsequent 200s). Cold start, or something slower than it should be? Check
  the function logs rather than guessing.
- Confirm the seed's final state: how many rows were inserted, how many
  updated, and does that match the ~33 I authorized.

## Rules

- **Do not re-run the full deploy.** The site is live and working; the risk
  now is breaking something that already works.
- No production write without dumping the affected rows first.
- Report literal output — a query result, a status code, a log line.
- **Still NOT authorized:** publishing the eight C2.4 articles.

## When done

Log to `docs/work-done/`, and report: what was wrong with P1, what you
changed, the legacy-post count, and whether the AI tag works in the admin UI.
