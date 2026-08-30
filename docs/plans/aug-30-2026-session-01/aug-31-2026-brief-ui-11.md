# Brief — UI-11: Standalone tap targets below 24px sitewide - breadcrumbs, footer links, the in-article TOC and card category labels

**Sprint:** 04 — *Fix what shipped* · **3 points** · owner `design-systems-engineer`
**Tracker:** `pnpm --silent sprint get UI-11 --sprint 4` (from `~/Documents/Code/buddy`)

**YOUR WORKTREE:** `~/orca/workspaces/hellokahwin-site/ui11-tap-targets`

---

## Why this item exists — verbatim from the tracker

â€”

---

## Definition of done — verbatim from the tracker, NOT negotiable

Every target that is NOT an inline link inside a sentence measures at least 24x24 CSS px in a rendered 390px viewport on homepage, article, category, /artikel and /dewan-kahwin. Today: breadcrumbs 40x20 / 39.7x20 / 35.6x17, footer Laman Utama 99.4x15.4 and Semua Artikel 103.7x15.4, in-article TOC Kesimpulan 66.2x17, /artikel card category labels 181.2x15 (eight of them), homepage credit line 215.1x15.6. Counted at 390: article 25 targets under 24px tall, dewan-kahwin 24, artikel-index 14, category 5, homepage 4. In-sentence links (pelamin, kadar sewaan) are exempt under WCAG 2.5.8 and are out of scope. The nav links already pass at 44px via min-h-11 and must not regress.

---

## Brief — verbatim from the tracker

â€”

---

## What the CEO wants you to know beyond the tracker

**Accessibility, sitewide, and the least glamorous item in the sprint.** Breadcrumbs, footer links, the in-article TOC and card category labels all carry standalone targets under 24px.

**Mobile carries 79% of this site's clicks**, so undersized targets are not a theoretical concern here. **Enumerate every offender with its measured box** rather than fixing the four named examples and declaring it sitewide — the DoD says sitewide and the four are illustrations, not the list.

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

