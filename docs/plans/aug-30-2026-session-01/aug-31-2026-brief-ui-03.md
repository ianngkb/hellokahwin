# Brief — UI-03: The hero is a portrait photo forced into a landscape frame, upscaled, at low quality

**Sprint:** 04 — *Fix what shipped - the front page is broken in production*
**Item:** `UI-03` · **5 points** · track `design`
**Owner:** `creative-director`
**Tracker:** `pnpm --silent sprint get UI-03 --sprint 4` (run from `~/Documents/Code/buddy`)

**YOUR WORKTREE:** `~/orca/workspaces/hellokahwin-site/ui03-hero`

---

## Why this item exists — verbatim from the tracker

Measured live: a 1200x1800 PORTRAIT source (aspect 0.67) rendered into a 1905x794 LANDSCAPE box (aspect 2.40) with object-fit cover and object-position 50% 50%. Only about 28% of the image is visible, it is upscaled 1.59x from a 1200px source, and it serves the low.webp variant as the largest element on the page. Its alt text is 'Tempat beli barang hantaran: lima jenis kedai' - this is an ARTICLE CARD IMAGE being reused as a full-bleed hero, which is why its aspect ratio is wrong for the slot. The result is an extreme close-up of a fruit tray filling the entire first screen with NO HEADLINE over it.

---

## Definition of done — verbatim from the tracker, and it is NOT negotiable

On the live homepage: the hero's rendered aspect ratio is within 15% of its source aspect ratio OR the source is a landscape asset chosen for the slot; upscale factor <=1.1x; the served variant is not low. All three quoted as measured numbers before and after. If the fix is that heroes need a dedicated landscape crop, say so and state what the pipeline must produce.

---

## Brief — verbatim from the tracker

GATE: if no suitable landscape hero asset exists for the featured article, STOP and report rather than shipping a different bad crop. A hero slot that cannot be filled correctly is a pipeline finding worth more than a swapped photo.

---

## What the CEO wants you to know beyond the tracker

**Runs concurrently.** UI-01 is fixing the homepage card grid in a separate tree; you own the hero. You share no files with it, but you are both on the homepage — **coordinate through master, and merge with a merge commit if you conflict.**

**UI-05 will need whatever image rules you establish**, so state them explicitly rather than only fixing this one asset.

---

## Where this sits in the sprint

**Wave 2, concurrent.** Same page as UI-01, different files.

## Context you need: what this sprint is and why it exists

**Owner directive, 31 August 2026:** *"I want you to review the desktop and mobile
page. It looks terrible, fix all of it. I want this sprint to focus on fixing it."*

Sprint 03 shipped a premium redesign — art direction, a design system, and new
homepage/catalogue/article templates. **The owner's verdict on the result is that
it looks terrible, and on the homepage they are demonstrably right.**

The CEO ran a measured audit on 31 Aug against live production. **Read it before
you start:**
`docs/plans/aug-30-2026-session-01/aug-31-2026-audit-ui-desktop-mobile.md`

Its confirmed findings:

| Defect | Measured |
|---|---|
| Homepage `.s-row` cards | **All 12** render their headline in a **44px** column, 225–307px tall, one word per line, clipped by the thumbnail |
| Nav | **1970px wide in a 1920px viewport** — 2 of 9 categories past the edge |
| Hero | 1200×1800 **portrait** source in a 1905×794 **landscape** frame — **28% visible, 1.59× upscale, `low.webp`** |
| Category pages | **0 images** |

**⚠ SECTION 3 OF THAT AUDIT LISTS FIVE CANDIDATE FINDINGS THE CEO KILLED BY
MEASURING. Re-reporting any of them is a fail:**

- Lazy-loaded images report `naturalWidth: 0`. **They are not broken.**
- Empty `alt` on a card thumbnail inside a link that carries the headline is
  **correct**, not an accessibility defect.
- The category `h1` shares its left edge with the body (both 569px). Centred-vs-
  left is **deliberate**.
- `order: 3` on the `.s-row` image is **not** the bug — computed style shows the
  image already sits in column 3.

**Pre-fix production is preserved** at `docs/fixtures/2026-08-31-pre-ui-fix/`
(homepage, article, category), captured before any fix shipped, with the article
page as the negative control — the same component rendering correctly.

**One thing to keep in proportion:** the homepage earned **4 clicks from 5
impressions** last week. This sprint is a **brand and credibility bet, not a
traffic one**, and it must not be justified or scored on SEO. What makes it
urgent is that the front page of the company is visibly broken in production.


## Where you work — YOU HAVE YOUR OWN WORKTREE

| Tree | Holds |
|---|---|
| `~/Documents/Code/hellokahwin/hellokahwin` | docs, plans, work-done, sprints, boardroom, fixtures |
| `~/Documents/Code/buddy` | buddy, and `skillcentral/` — personas and skills |
| **your worktree (below)** | **the site code, yours alone** |

**⚠ ONE WRITER PER CHECKOUT — WHICH IS WHY YOU HAVE YOUR OWN.** Seven agents are
working this sprint concurrently. Each site item got its own Orca worktree
precisely so nobody shares HEAD, the index or the working tree. **Stay in yours.**

- **Do not `git checkout` another branch, and do not work in
  `pillars-ingest-redirects`** — that tree is 42 commits behind master and does
  not contain the redesign. A UI-01 agent was dispatched there by mistake and had
  to be stopped; the code it was told to fix did not exist in that tree.
- **Never `git checkout -- <path>`, `git reset`, or `git stash`** as a rescue. If
  something looks wrong, investigate READ-ONLY first: `git status --short`,
  `git log`, `git diff`, `git reflog`.
- **Your base is `origin/master` at `105e79d`**, which contains DES-08 (the
  redesign) and DES-12 (the wordmark). Confirm with `git rev-parse --short HEAD`
  before you start. If it is not 105e79d or a descendant, STOP and report.
- **Watch the HEAD sha.** If it moves and you did not cause it, that is a signal.

**Merging:** open a PR to `master` when your item is shipped. Other agents are
merging in parallel — if you hit a conflict, **merge with a merge commit rather
than a squash** so their work reaches master with its own author and message.


## Standing rules that apply to you, and they are not decoration

**DONE MEANS SHIPPED.** Owner directive, 26 Aug 2026. Not built, not committed,
not "working locally", not staged in a draft — **shipped, and reachable by the
owner.** Site code is shipped when it is merged to `master`, deployed, and the
change is visible on a live URL. A document is shipped when it is committed AND
pushed; a file on one machine is not a deliverable.

**NEVER NARROW YOUR DEFINITION OF DONE.** If the item turns out bigger than its
DoD assumed, it stays open, or it gets `parked` with a reason, or it carries
forward. **Rewriting the DoD to fit what you achieved is the one thing that makes
velocity a lie**, and it corrupts every estimate after it. Come back and say the
item is bigger — that is a good outcome and it is what the CEO wants to hear.

**A GATE THAT KILLS YOUR ITEM IS A DELIVERABLE.** If your brief carries a GATE and
it fires, **STOP and report.** Do not build with invented data, and do not quietly
downgrade to an option already rejected. Sprint 02's SEO-04 gate fired, the agent
built nothing, and that was the correct and valuable outcome. A parked item with a
clear reason beats a fabricated one.

**VERIFY YOUR OWN CHECKS.** The CEO's checks were wrong NINE times in Sprint 03,
every one the same error: **checked a proxy, with a pattern nobody tested.**
- **When a check returns a surprising ABSENCE, verify the CHECK before believing
  the absence.** A grep that returns 0 is a claim about your regex until you have
  proved the regex on a line you know matches. During this sprint's own audit a
  grep for `Kredit` returned zero on a page carrying forty credits — the credits
  were labelled in English.
- **Enumerate what is there rather than testing for what you assume is there.**
  `grep -oi <pattern> | sort | uniq -c` beats `grep -c <assumed-string>`.
- **Check the artefact, never a summary of it.** Fetch the built page, not the
  source. Read the spec, not the log entry describing it.
- **Test something the item actually touched.** A Sprint 03 check tested a deploy
  using a class that lives in the root layout, which the item never touched.

**A STATUS CODE IS NOT EVIDENCE ON ITS OWN.** A 200 carrying the right string can
still be a shell — one hellokahwin preview returned 200 with the exact marker
string and rendered **zero articles**, because RLS gave the connecting role no
rows. For anything database-backed, **compare against production structurally**:
count headings, images, links; diff the `<title>`.

**IF A MEASUREMENT NEEDS A CONDITION TO REPRODUCE, THAT CONDITION GOES IN THE
CLAIM.** A header, a cookie, a session, a flag, a logged-in browser. On 27 Aug a
report said "working preview URL" and quoted a 200 that required a secret request
header; the owner clicked it and got a login page. Every number was correct and
the headline was false. **An accurate table under an inaccurate headline is a
false report.**

**PRODUCTION WRITES: UNDO FIRST.** Record the exact slugs or ids, commit and push
the UNDO, and only then run the write. That is what makes a write reversible in
fact rather than in principle.

**ALL AUDIENCE-FACING COPY PASSES `/humanizer` BEFORE IT SHIPS.** Owner-level
requirement, binding on every seat.

**THE FOUR THINGS THAT STOP AND GO TO THE CEO:** credentials/access, money,
outward-facing commitments in the company's name, and irreversible destruction.
Everything else is yours — decide it and execute it.

## Stage 9 — the retrospective is MANDATORY, and it is part of the item

Your item is not done until you have written a `## Retrospective` into your
`docs/work-done/` entry answering four questions:

1. What did we learn that is not written down?
2. **Which document must change, and who owns the edit?** Name the file. A lesson
   with no target file evaporates.
3. What did we do twice that we should never repeat?
4. What did we nearly ship, and what caught it?

**Then MAKE THE EDITS.** A retrospective that names a document and does not change
it has failed.

**And when you name a lesson, ask which FORM it can take** — a DoD clause, a
pre-flight checklist item, a script, a gate that stops work — and **write prose
only when none of those is possible.** Sprint 03's central finding is that prose
rules do not fire and gates and scripts do. A lesson that can only be prose is a
lesson you should expect to repeat.

## Reporting

Log completed work to `docs/work-done/aug-30-2026-session-01/` with evidence a
reader who was not there can verify, and keep `docs/work-done/README.md` current.
Print `ITEM EXIT: 0` at the start of a line when you finish, or `ITEM EXIT: 1` if
you are stopping blocked — that string is what wakes the CEO's watcher, so a bare
"done" in prose reaches nobody.

