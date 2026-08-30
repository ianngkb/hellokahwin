# Brief — SEO-12: Make the ANSWER-TYPE INTENT test a pre-flight GATE, not prose - NOT the AI Overview

**Sprint:** 04 — *Fix what shipped* · **3 points** · owner `head-of-seo-content`
**Tracker:** `pnpm --silent sprint get SEO-12 --sprint 4` (from `~/Documents/Code/buddy`)

**YOU WORK IN:** `~/Documents/Code/hellokahwin/hellokahwin` (docs) — no site code.

---

## Why this item exists — verbatim from the tracker

Sprint 03 central finding: PROSE RULES DO NOT FIRE, GATES AND SCRIPTS DO. This item writes the lesson in the only form that fires - a runnable script wired into a pre-flight checklist. REWRITTEN 31 Aug AFTER SEO-11: the original DoD gated on AI OVERVIEW PRESENCE, and SEO-11 failed to confirm that variable - p = 0.102 across all 30 rows in the analysis band, p = 0.0009 across only the 23 in-month rows, with 14 clicks total. Not decidable in either direction. INTENT survives every treatment at p = 0.000003 to 0.000025, and the split itself is real at 12.2x on matched positions, Fisher exact p = 0.00002. Decision 156 was right in its PROSE - does a two-sentence answer satisfy the searcher - and wrong to turn that into a check on a SERP FEATURE when the checkable thing is the QUERY. Building the gate on the unconfirmed variable would have hard-coded a finding our own census could not support.

---

## Definition of done — verbatim from the tracker, NOT negotiable

A RUNNABLE SCRIPT, committed, that classifies a candidate keyword by ANSWER-TYPE INTENT - does a two-sentence answer satisfy this searcher - and EXITS NON-ZERO for number/definition intent. It must NOT gate on AI Overview presence; SEO-11 could not confirm that variable. Regression suite, all four must hold and be quoted with exit codes: `mas kahwin johor` FAILS (number), `walimatul urus` FAILS (definition), `doa pengantin baru rumi` PASSES (document), `idea goodies kahwin` PASSES (document) - the last is required because SEO-11 flags it as the query decision 156 cited as its healthy-CTR control. Report AI Overview presence as ADVISORY metadata alongside the verdict, never as the gate. Wired into head-of-seo-content PRE-FLIGHT #1 in the persona file, REPLACING the AI-Overview wording the CEO wrote on 30 Aug - that edit is now wrong and SEO-11 left a patch at docs/plans/aug-30-2026-session-01/aug-31-2026-patch-preflight-1.md. Print SERPSHAPE EXIT: n at the start of a line.

---

## Brief — verbatim from the tracker

READ SEO-11 FIRST: docs/work-done/aug-30-2026-session-01/aug-31-2026-done-seo-11-serp-shape-census.md and the 84-row census CSV beside it. It corrected the CEO and its correction is the reason this DoD changed. The four named test cases are a regression suite, not an illustration - if the script cannot separate them it is not done. If you conclude intent cannot be classified reliably from a keyword string alone, STOP AND REPORT rather than shipping a classifier that guesses; a parked gate beats a gate that quietly encodes the wrong variable.

---

## What the CEO wants you to know beyond the tracker

**⚠ YOUR DoD WAS REWRITTEN ON 31 AUG, AFTER SEO-11 LANDED. Read the new one above carefully — it is not the item you may have seen on the board earlier.**

The original gated on **AI Overview presence**. SEO-11's 84-query census could not confirm that variable: **p = 0.102** across all 30 analysis-band rows, **p = 0.0009** across only the 23 in-month rows, on **14 total clicks** — not decidable in either direction. **Intent survives every treatment at p = 0.000003 to 0.000025**, and the split itself is real at **12.2× on matched positions, Fisher exact p = 0.00002**.

So the CEO's decision 156 was **right in its prose** — *does a two-sentence answer satisfy the searcher* — and **wrong in the gate it derived**. Building on the unconfirmed variable would have hard-coded a finding our own census cannot support. **That correction is why this item exists in its current form.**

**Read SEO-11's report and the 84-row CSV before writing a line of code.** They are the specification.

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

