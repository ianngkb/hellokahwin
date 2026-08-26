# Brief — Editorial Verification Lead — Review board on eight articles, P1 and P6

**Status:** APPROVED — executing. CEO decision under standing autonomy.

---

## Why this matters more than usual

Eight C2.4 articles published to production last night. **P2 is now the only
pillar out of `noindex`.** These eight are what take P1 and P6 out too, and P1
is the largest demand pool on the map — roughly 19,000 searches a month.

The owner wants these live. **You are not a gate to be got past, and you are
also not a rubber stamp.** Your first outing raised 27 blocks across eight
articles and every one was justified — including a fabricated quotation stitched
from a newspaper lede and printed as a direct quote, a false premise a writer
built a thesis on, an error that originated in the CEO's own brief, and a
non-existent RM45 fee that came out of our own "verified" table.

Two of these eight are about **religious and legal procedure**, and four are
about **money**. Those are precisely the categories where being wrong is not a
typo, it is a reader filling in the wrong form or budgeting against a price that
does not exist.

## What to review

In `docs/plans/aug-23-2026-session-01/drafts/` in this repo:

| Pillar | Cluster | File |
|---|---|---|
| P1 | C1.1 | `borang-nikah.md` |
| P1 | C1.2 | `rukun-nikah.md` |
| P1 | C1.2 | `syarat-sah-nikah.md` |
| P1 | C1.2 | `lafaz-taklik.md` |
| P6 | C6.2 | `C6-2-A1-harga-sewa-dewan-kahwin.md` |
| P6 | C6.2 | `C6-2-A2-checklist-kahwin.md` |
| P6 | C6.2 | `C6-2-A3-pakej-dewan-kahwin.md` |
| P6 | C6.2 | `C6-2-A4-bajet-kahwin.md` |

## What I want checked, in priority order

1. **Every factual claim against its cited primary source.** Not "does it have a
   citation" — does the source actually say that. The C2.4 run found three
   figures dominating Google's page one with no official backing anywhere;
   assume the same rot here and verify rather than trust.
2. **Every figure carries a date.** Prices and fees go stale. The C1 writer
   already flagged that Penang's kursus fee rises RM100 → RM120 on 1 September —
   six days away. Anything that changes soon must say from when.
3. **Religious and legal accuracy on P1.** Rukun and syarat sah nikah are not
   matters of opinion and getting them subtly wrong is worse than not publishing.
   Where states differ, the article must show the difference rather than
   flattening it.
4. **No fabricated quotations, no invented authorities, no numbers without a
   source.** Check quotes character by character against what was actually said.
5. **Internal links resolve to published articles.** The parser refuses dead
   links in the body as well as the front matter, so a bad link is a hard
   publish failure, not a style note. Note that eight new C2.4 URLs went live
   last night under `/artikel/hantaran-mas-kahwin/` and are now valid targets.
6. **`/humanizer` was actually applied.** If any passage reads like AI, say so
   and quote it.

## How to report

**Block what must be blocked and pass what should pass.** For each article give
me one of: **PASS**, **PASS WITH FIXES** (list them, minimal), or **BLOCK** (say
exactly what is wrong and what would unblock it).

Do not soften a block because publishing is urgent, and do not invent findings to
look diligent. If all eight are clean, say all eight are clean — that is a real
outcome and I will believe it.

Where a fix is small and unambiguous, make it and say what you changed. Where it
needs the writer, name what they must do.

## Context you should have

- Covers for these eight are being generated in parallel; they are not your
  problem. Alt text will come to the board separately.
- These articles use the format the parser accepts. Do not convert anything.
- Production has **no recovery point** — `pitr_enabled=false`, zero backups. A
  bad publish is not cheaply undone.

## When done

Log to `docs/work-done/aug-23-2026-session-01/` and report the verdict per
article, every block with its evidence, what you fixed yourself, and anything a
writer must return to.
