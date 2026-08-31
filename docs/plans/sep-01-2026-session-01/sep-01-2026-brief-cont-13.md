# CONT-13 — The document-intent bet - six articles for queries that still have a click in them

**Sprint 05 — *Build where the click is*** · track `content` · **12 points** · owner `writer-inspirasi-vendor-venue`
**Dispatched:** 01 September 2026
**Your item in the tracker:** `pnpm --silent sprint get CONT-13 --sprint 5` (run from `~/Documents/Code/buddy`)

## WHY THIS ITEM EXISTS

The company's central measured finding. At matched positions 3-11, document-intent queries convert at 4.55% and number/definition at 0.37% - 12.2x, Fisher exact p=0.00002 (SEO-11, 84 queries). Page-level tonight, 7d: the mas kahwin state series + walimatul urus + the ratio pages carry 3,062 impressions at position ~7 and returned 21 clicks (0.69%), while checklist-kahwin, /dewan-kahwin/, goodies-kahwin, nisbah-hantaran and bajet-kahwin carry 285 impressions at position ~7.4 and returned 17 (5.96%). Same site, same design, same brand. Roughly 40% of our impression base is structurally unclickable at any position. This item is the only one in the sprint that builds where the click actually is.

## DEFINITION OF DONE — verbatim, and it is not narrowed

SIX ARTICLES LIVE IN PRODUCTION, each returning 200 on FIRST request (not a warmed second fetch - quote the status line and X-Vercel-Cache). Sitemap <loc> count rises from 103 to 109, quoted before and after. Each article contains the COMPLETE artefact on the page - the full doa in Arabic, rumi and Malay meaning; the entire script; the whole checklist - never a summary or a partial sample with the rest implied; verified by quoting the artefact's first and last line from LIVE HTML. Each carries FAQPage schema where it has genuine Q&A. Every doa, Arabic string, transliteration and religious claim carries its NAMED AUTHORITY and the date checked, recorded per item and quoted from the live page. PRE-FLIGHT #1 (scripts/seo/check-serp-shape.py) run on every target keyword with the exit code recorded per target; a target that does not exit 0 is not written.

## BRIEF

GATE FIRST, BEFORE ANYTHING IS WRITTEN - up to one hour. Confirm SEO-11's census (docs/work-done/aug-30-2026-session-01/serp-shape-census.csv) surfaces at least SIX document-intent targets meeting all three tests. IF FEWER THAN SIX CLEAR, STOP AND BRING IT BACK - do not pad with number or definition targets, do not fall back to more mas kahwin state pages because they are easy to write, do not lower the floor to make the count. A parked CONT-13 with a clear reason is a good outcome.
*** TWO OF THE THREE TESTS IN THE SPRINT 04 BRIEF ARE SUPERSEDED. READ THIS BEFORE USING THAT DOCUMENT. ***
(1) VOLUME: the Sprint 04 brief said '>=100 impressions/28d or >=100 monthly volume'. Decision 170 replaces it: document intent needs >=220 monthly searches (Ahrefs volume, country my), derived from a 10-clicks/month bar divided by the 4.55% the class actually achieves. Number/definition needs 2,700 and is therefore out of reach - that is the point.
(2) THE AI OVERVIEW IS NOT A SELECTOR AND MUST NOT BE USED AS ONE. The Sprint 04 brief's test 2 said 'No AI Overview on the live SERP, verified by serp-overview'. DECISION 169 KILLED THAT. On the same 84 queries, AI Overview presence reads p=0.102 across all rows and p=0.0009 on the fresh-snapshot subset, and that subset drops the two best-converting AI-Overview'd queries we own; at 14 clicks the question is undecidable. 94% of number-intent queries carry an AIO but so do 79% of document-intent ones, so the feature sorts nothing. GATE ON intent_class, which is derived from the query string and survives every re-cut (p=0.000003-0.000025). Record the AI Overview as advisory; never select or reject on it. Note also decision 174: Ahrefs SERP snapshots go stale silently, a false feature reading on an old snapshot is unreliable, and 35 of 84 queries returned no snapshot at all.
(3) UNCHANGED: not already owned by a sibling page on the same parent topic - rule 4 of the cluster method.
RESERVED FAMILIES - do NOT take targets from 'skrip pengacara majlis' or 'teks kad jemputan'. CONT-16 owns those two and runs concurrently; taking them here starves it.
SECOND GATE, NON-NEGOTIABLE (decision 162): religious text accuracy. Every doa, Arabic string, transliteration and religious claim goes through editorial-verification-lead against a NAMED PUBLISHED AUTHORITY (JAKIM, a state mufti's office, DBP, or a recognised published collection), authority and date recorded PER ITEM. If a text cannot be sourced to a named authority IT DOES NOT SHIP - the article publishes without it or does not publish. A parked doa article costs 2 points; a wrong one costs the audience.
All content passes /humanizer before it is considered done.

## HOW TO RECORD YOUR RESULT

Run from `~/Documents/Code/buddy`:

```
pnpm --silent sprint set-state CONT-13 in_progress --sprint 5
pnpm --silent sprint add-evidence CONT-13 --sprint 5 \
  --claim "<what is now true>" --proof "<the literal output/command/measurement>" --link "<url>"
```

**Do NOT set your own item to `done`.** The CEO verifies every item against
production or the artefact itself before that happens — that is the standing rule,
and it exists because agent completion reports have been wrong in the optimistic
direction. Record your evidence and report; the CEO closes it.

---

## STANDING RULES — these bind you, and they are not optional

**DONE MEANS SHIPPED.** Owner directive, 26 Aug 2026. Not built, not committed, not
"working locally" — shipped, and reachable by the owner. Site code: merged to the
default branch AND deployed AND visible on a live URL. Content: ingested to
production AND the URL returns 200 AND a reader can find it. A document or log:
committed and pushed — a file on one machine is not a deliverable.

**YOUR DoD IS NEVER NARROWED.** If the item turns out bigger than its DoD assumed,
it stays open, gets `parked` with a reason, or carries forward. Rewriting the DoD to
fit what you achieved is the one thing that makes velocity a lie. Bring it back
instead — a parked item with a clear reason is a good outcome.

**A GATE IN YOUR DoD IS ALLOWED TO KILL THIS ITEM.** If your brief opens with a
gate and the gate fails: STOP and report. Do not build with invented figures and do
not quietly downgrade to an option already rejected. On a site whose entire claim is
that its numbers carry sources, a plausible fabrication is the worst outcome
available and the hardest to detect later.

**VERIFY YOUR OWN CHECKS. The company has twelve tabulated instances of the same
failure: checked a proxy, with a pattern nobody tested.**
- When a check returns a surprising ABSENCE, **verify the CHECK first.**
- **Enumerate what IS there** (`grep -oai <pat> | sort | uniq -c`) rather than
  testing for what you assume is there. The second form can only ever return a
  number about your assumption.
- **NEVER COMBINE `grep -o -i -F`.** It returns **0** in GNU grep 3.0 (this Git Bash
  build) and reproduces on a 23-byte file. On 01 Sept it returned 0 for `REKOD` and
  `SUMBER` on a page carrying them ×24 and ×20. Use the committed helper:
  `bash scripts/measure/count-in-html.sh <url|file> "PATTERN" ...`
- **A FIX IS NOT VERIFIED UNTIL IT IS RUN AGAINST THE FAILING CASE.** The first fix
  for that grep bug was itself wrong, and was caught only by running it. "I
  understand the cause" is not a test.
- **A status code proves nothing on its own.** A 200 carrying the right string can
  still be a shell — a preview once returned 200 with the right marker and rendered
  zero articles. Compare structurally against production where it should not differ.

**PRODUCTION WRITES: record and push a precise UNDO first.** Name the exact slugs,
paths or row ids. That is what makes a write reversible in fact rather than in
principle. Additive and reversible writes proceed on your authority; anything with
no recovery path stops and comes back to the CEO.

**STAGE 9 — THE RETROSPECTIVE IS PART OF THIS ITEM, NOT AN EXTRA.**
Write it into your `docs/work-done/` entry under `## Retrospective`, answering:
what did we learn that is not written down; **which document must change and who
owns the edit — name the file**; what did we do twice that we should never repeat;
what did we nearly ship, and what caught it. **Then make the edit.** A retrospective
that names a document and does not change it has failed. Prefer an executable form —
a DoD clause, a script, a gate — over prose: **prose rules do not fire.**

**LOG YOUR WORK** in `docs/work-done/sep-01-2026-session-01/sep-01-2026-done-<slug>.md`
with evidence a reader who was not here can verify, and update
`docs/work-done/README.md`.

**REPORT A BLOCK THE MOMENT IT HAPPENS.** Do not sit on it. If you are blocked on a
credential, that means your SESSION lacks permission — say so precisely, because
that is a different problem from the company lacking the credential.

**When your work contradicts something the CEO wrote, the evidence wins** and the
file gets corrected at source. Four agents corrected the CEO in Sprint 04 and every
one was right. Put it in your log where it will be read.

**All reader-facing content passes `/humanizer` before it is done.**

---

## When you finish

Print, at the start of a line, exactly:

Print your completion sentinel as the FIRST THING ON A LINE, in the form
`ITEM` then a space then `EXIT:` then a space then your exit code — e.g. exit code zero.
Nothing else on that line.

> ⚠ This is deliberately NOT written out literally here. The watcher matches that
> exact line anchored to the start of a line, and on 01 Sept 2026 the wave-1 brief
> printed it verbatim in a code fence — so CONT-16 and SEO-13 tripped their own
> watchers within 90 seconds of dispatch, both still WORKING, simply by displaying
> their brief. Filed with the captured lines as evidence on PLAT-13.

`ITEM EXIT: <n>` is the ONLY string that means this ITEM is done. Gates you run may
print their own `NAME EXIT: n` lines — those are that gate's outcome, not yours, and
they wake the CEO for nothing. Use a non-zero code if you are stopping without
completing the DoD, and say why immediately above it.
