# Brief — Editorial Verification Lead — Re-verify the EIGHT LIVE articles, against the live pages

**Status:** APPROVED — executing. Owner directive, 25 Aug 2026: verify the facts
of every article we are publishing.

**Dispatch with `-PermissionMode bypassPermissions`.**

---

## Why these are being re-checked when they already passed

These eight are **published and public** at
`/artikel/hantaran-mas-kahwin/`. If a figure is wrong, it is wrong on the
internet right now, on pages we are asking Google to rank.

They passed a review board on 23 August. Three things have changed since:

1. **The `pdftotext -layout` finding did not exist yet.** You discovered this
   morning that it silently misaligns government fee columns and would have
   produced a wrong Perak figure. **These eight are entirely about state-gazetted
   mas kahwin rates read out of government PDFs.** They were verified with the
   tool now known to misalign exactly this kind of table.
2. **A live page was found carrying wrong figures with no state, authority or
   date** — `/artikel/idea-dan-nasihat/kursus-kahwin`, claiming RM120–RM150 when
   JAIS Selangor publishes RM100. That was a migration page nobody had verified,
   and it is the reason I am not assuming "it passed once" means "it is right".
3. They have since been **edited by machine** — converted from deliverable format
   to front matter, had `IMEJ` markers cut, and A3 and A4 had prose edits where a
   marker carried a sentence. **Nobody has verified the published text against
   the reviewed text.**

## What to verify

**Read the LIVE pages, not the drafts.** The database is the source of truth for
what a reader sees, and the conversion happened after the board signed off.

| # | URL slug under `/artikel/hantaran-mas-kahwin/` |
|---|---|
| A1 | `mas-kahwin-ikut-negeri` |
| A2 | `apa-itu-mas-kahwin` |
| A3 | `mas-kahwin-johor` |
| A4 | `mas-kahwin-kelantan-terengganu` |
| A5 | `mas-kahwin-perak` |
| A6 | `mas-kahwin-pahang-negeri-sembilan` |
| A7 | `mas-kahwin-sabah-sarawak` |
| A8 | `mas-kahwin-melebihi-kadar-minimum` |

Check, in priority order:

1. **Every mas kahwin figure, re-read from the gazette by word coordinate.**
   Not `pdftotext -layout`. This is the whole reason for the pass. The cluster's
   competitive claim is that six of fourteen jurisdictions fix **no minimum at
   all** and that three figures dominating Google's page one — Perak RM101,
   Penang RM24, Kedah RM22.50 — have no official backing. **If any of that is
   wrong, we are publishing the same error we accuse everyone else of.**
2. **Did the conversion damage anything?** Compare the live text against
   `A1..A8-*-REVIEWED.md` in `docs/plans/aug-23-2026-session-01/drafts/`. Ten
   `IMEJ` markers were cut and A3/A4 had prose edits. Confirm no sentence lost
   its meaning, no table lost a row, and nothing the board approved has silently
   changed.
3. **Every outbound internal link.** Three of the P1 articles link to
   `/artikel/idea-dan-nasihat/kursus-kahwin`, which you have already established
   is wrong — check whether any of these eight do too, and whether they send a
   reader anywhere else that carries a bad figure.
4. **The A1 update-in-place.** A1 replaced a live legacy article at the same
   slug. Confirm the published text is the new article, not a merge artefact of
   both.
5. **Dates.** Every figure should say when it was checked. The covers carry
   *"Disemak 24 Ogos 2026"*; confirm the body agrees and that nothing has changed
   at source since.

## The one I already know about

`/artikel/idea-dan-nasihat/kursus-kahwin` is **live and wrong** — RM120–RM150,
no state, no authority, no date, against JAIS Selangor's published RM100 and
Penang's RM100 that rises to RM120 on **1 September, six days away.**

**It is not in this brief's eight**, but tell me: is the fastest honest fix a
dated per-state table, or pulling the sentence? You estimated a day across
fourteen jurisdictions. If the sentence can come out in ten minutes and the
table follow later, say so — a wrong number live is worse than an incomplete one.

## How to report

Per article: **CLEAN**, **FIX NOW** (what, and how urgent), or **PULL** (the
error is serious enough that the page should not be public as it stands).

**A published error is not the same as a draft error.** If something is wrong on
a live page, say so plainly and tell me how fast it must come down. Do not soften
it because the page is already out.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report the verdict per live
article, every figure you re-verified with its source, anything the conversion
broke, and your recommendation on `kursus-kahwin`.
