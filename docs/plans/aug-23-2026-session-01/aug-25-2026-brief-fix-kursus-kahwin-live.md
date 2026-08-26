# Brief — BMAD — A wrong fee is live. Pull it now, then replace it properly.

**Status:** APPROVED — executing. Owner directive, 25 Aug 2026: *"Fix it then."*
**Dispatch with `-PermissionMode bypassPermissions`** in the site worktree.
**Production database CRUD is granted.** Do not stop to ask.

---

## The defect, and why it is urgent

**`https://hellokahwin.com/artikel/idea-dan-nasihat/kursus-kahwin` is live and
states kursus kahwin fees run "RM120–RM150" with no state, no authority and no
date.**

The Editorial Verification Lead established this morning that it is wrong at the
bottom of the range: **JAIS Selangor publishes RM100**, and **Penang is RM100 —
until 1 September, when it becomes RM120.** Six days away.

Two things make this worse than an ordinary stale figure:

1. **Three of the eight P1 articles now in review link to this page for that
   number.** We are about to send readers here for a fee that is wrong.
2. It is a WordPress-migration page, so it never received a verdict. It is one of
   29 in that position. This brief fixes one; the rest is a separate decision.

**A wrong number on a live page is worse than an incomplete one.** That is the
principle behind the sequencing below.

## Phase 1 — do this first, and do it fast

**Remove the wrong claim from the live page.** Not a rewrite, not a table — cut
or neutralise the sentence carrying "RM120–RM150" so no reader is given a false
figure while the proper fix is built.

If a bare removal leaves the paragraph broken, replace it with the narrowest
honest statement you can source in minutes — for example that the fee is set by
each state's religious authority and varies, with the reader directed to their
own state's JAIS. **Do not invent a range.** "It varies by state" is true;
"RM120–RM150" is not.

**Update in place** — `--update`, same slug, same URL. This page is indexed and
carries real traffic. Do not create a new article. Do not change the URL.

Report the literal before-and-after of the sentence, and confirm the page is live
without the wrong figure. **That is Phase 1 done, and I want it reported
separately rather than held until Phase 2 finishes.**

## Phase 2 — the dated per-state table

Then build what should have been there: **kursus kahwin fees for all fourteen
jurisdictions, each with its authority, its figure and the date checked.**

Rules for the table, learned the hard way this week:

- **Primary sources only** — each state's JAIS or equivalent, their own page or
  gazette. Not a blog, not an aggregator, not another wedding site.
- **Read government PDFs by word coordinate, never `pdftotext -layout`.** It
  silently misaligns fee columns and would have produced a wrong Perak figure in
  the mas kahwin batch. This is a standing rule now.
- **"The authority does not publish this" is a valid and valuable entry.** Six of
  fourteen jurisdictions publish no minimum mas kahwin at all, and saying so is
  what beat the incumbents on C2.4. Do the same here.
- **Date every figure**, and flag the ones that change. **Penang moves RM100 →
  RM120 on 1 September** — that must be stated with both figures and the
  changeover date, not silently updated later.

## Rules

- **Record a precise undo before writing** — the article's before-state, verbatim.
  Production has `pitr_enabled=false` and zero backups.
- `--revalidate-url` is mandatory against production. Use it.
- **Do not touch anything else on that page.** Its other content has not been
  verified and is out of scope; fixing one thing is not licence to edit around it.
- Note: `articles.content` is double-encoded on ingested rows and is being fixed
  in a parallel run. This page is a **legacy** row (`jsonb_typeof` = `object`) —
  check which shape you are writing back and do not convert it.

## When done

Log to `docs/work-done/aug-23-2026-session-01/`. Report Phase 1 and Phase 2
separately: the sentence before and after, the live confirmation, then the
fourteen-jurisdiction table with every source and date, and every state where no
authority publishes a figure.
