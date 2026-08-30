# Brief — UI-10: The article body runs 888px wide at 17px - about 104 characters per line - at 1440

**Sprint:** 04 — *Fix what shipped* · **3 points** · owner `creative-director`
**Tracker:** `pnpm --silent sprint get UI-10 --sprint 4` (from `~/Documents/Code/buddy`)

**YOUR WORKTREE:** `~/orca/workspaces/hellokahwin-site/ui10-measure`

---

## Why this item exists — verbatim from the tracker

â€”

---

## Definition of done — verbatim from the tracker, NOT negotiable

Measured in a rendered viewport on /artikel/idea-dan-nasihat/garden-wedding: body paragraph width divided by (font-size x 0.5) lands inside 45-75 characters at 1440, as it already does at 390 (37-41). Today 40 paragraphs render at exactly 888px and 17px = about 104 characters, while the same page holds 63-74 at 1024 and 63-83 at 768. Decide the measure deliberately - a max-width on the prose column, a larger type size at that width, or both - and state which, and do not regress the mobile measure.

---

## Brief — verbatim from the tracker

â€”

---

## What the CEO wants you to know beyond the tracker

**A measure judgement, and it is yours as creative director, not an automatic fix.** 104 characters per line at 1440 is well past the 45–75 that reading research supports, but the remedy — narrower measure, larger type, or both — is an art-direction decision that interacts with DES-03's typographic system.

**Whatever you choose, state the resulting characters-per-line at 1024, 1440 and 1920 as measured numbers**, so the next person inherits a rule rather than a value.

## Context: this sprint, and what has already shipped

**Owner directive, 31 Aug:** *"I want you to review the desktop and mobile page.
It looks terrible, fix all of it."*

**Four items already merged to `master` and are LIVE. Your worktree is based on
`61a505f`, which contains all of them — do not re-fix them:**

| Shipped | Result, CEO-verified on live production |
|---|---|
| **UI-01** | all 12 homepage `.s-row` cards: headline column **44px → 412px** |
| **UI-02** | nav: **9 links, 0 past the viewport edge** at 1280/1440/1920 |
| **UI-03** | hero: purpose-built 4.3:1 crop, aspect delta **0.1%**, upscale **1.00×** |
| **RIGHTS-01** | image credits: **`Kredit:`** — one Malay label, one casing sitewide |

**Your item comes from UI-04's rendered audit**, which measured every template at
390/768/1024/1440 in a real browser with `matchMedia` asserted at each width. Read
it first — it contains the exact numbers behind your item:
`docs/work-done/aug-30-2026-session-01/aug-31-2026-done-ui-04-rendered-audit.md`
and its `…-ui-04-EVIDENCE/` directory, whose `harness/` holds runnable Playwright
scripts you should reuse rather than rewrite.

**⚠ FINDINGS ALREADY KILLED BY MEASUREMENT — re-reporting any is a fail:**
lazy-loaded images report `naturalWidth: 0` and are **not** broken; empty `alt` on
a card thumbnail inside a titled link is **correct**; the category `h1` shares its
left edge with the body (centred-vs-left is deliberate); and `order: 3` on the
`.s-row` image was never the bug.

## Where you work

**YOUR OWN WORKTREE — one writer per checkout.** Five other agents are working
concurrently, each in their own tree. Stay in yours.

- Your base is `origin/master` at **`61a505f`**. Confirm with
  `git rev-parse --short HEAD` before you start; if it is not that or a
  descendant, **STOP and report**.
- **Never `git checkout` another branch, `git reset`, or `git stash`** in a tree
  containing work. If something looks wrong, investigate read-only:
  `git status --short`, `git log`, `git diff`, `git reflog`.
- Open a PR to `master` when shipped. Others are merging in parallel — on a
  conflict, **merge with a merge commit, not a squash**, so their work keeps its
  own author and message.

## Standing rules

**DONE MEANS SHIPPED** — merged to `master`, deployed, and visible on a live URL.
Not built, not committed, not working locally.

**NEVER NARROW YOUR DoD.** If the item is bigger than its DoD assumed, it stays
open or gets `parked` with a reason. Rewriting the DoD to fit what you achieved is
the one thing that makes velocity a lie. Coming back to say it is bigger is a good
outcome.

**A GATE THAT KILLS YOUR ITEM IS A DELIVERABLE.** If your brief carries a gate and
it fires, STOP and report. A parked item with a clear reason beats a fabricated one.

**VERIFY YOUR OWN CHECKS.** When a check returns a surprising ABSENCE, verify the
CHECK before believing it. Enumerate what is there (`grep -oi <pat> | sort | uniq -c`)
rather than testing for what you assume. In this sprint alone: a grep for `Kredit`
returned zero on a page carrying forty credits; a `$HOME` path broke on a space and
reported "0 items"; a diff showed every line changed that was only CRLF. **All three
were caught by re-checking the check.**

**A STATUS CODE IS NOT EVIDENCE.** A 200 carrying the right string can still be a
shell — one preview returned 200 with the marker string and rendered zero articles.
Compare against production structurally: count headings, images, links.

**A MEASUREMENT THAT NEEDS A CONDITION states it in the claim** — a header, a
cookie, a session, a flag. An accurate table under an inaccurate headline is a
false report.

**MEASURE IN A REAL BROWSER AT AN ASSERTED WIDTH.** Playwright is installed and
UI-04's harness is committed. Do not resize the browser extension — it reports
success while `innerWidth` stays 1920, which is how a "mobile review" gets done
entirely on desktop.

## Stage 9 — the retrospective is part of the item

Write `## Retrospective` into your `docs/work-done/` entry: what did we learn that
is not written down; **which document must change and who owns the edit** (name the
file); what did we do twice; what did we nearly ship and what caught it. **Then make
the edits.** And ask which FORM the lesson can take — a DoD clause, a checklist
item, a script, a gate — **prose only when none of those is possible.**

Log to `docs/work-done/aug-30-2026-session-01/`, keep `docs/work-done/README.md`
current, and print `ITEM EXIT: 0` at the start of a line when done (or `1` if
stopping blocked). A bare "done" in prose wakes nobody.

